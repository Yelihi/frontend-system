import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {join, resolve} from 'node:path';

// This source runs through the restricted executor, never against model code on the host.
const project = resolve(process.argv[2]);
const checks = [];
async function check(id, fn) {
  try { await fn(); checks.push({id, status:'passed'}); }
  catch (error) { checks.push({id, status:'failed', reason:String(error.message).slice(0,1500)}); }
}
const load = file => import(pathToFileURL(join(project, file)).href);
const deferred = () => { let resolve, reject; const promise = new Promise((yes,no) => {resolve=yes; reject=no;}); return {promise,resolve,reject}; };
let createClient, quote, createRepository, createOrders;
await check('F1-public-contract', async () => {
  const modules = [['shared/http.mjs','createClient'],['domain/orders.mjs','quote'],['data/orders.mjs','createRepository'],['application/orders.mjs','createOrders']];
  for (const [file,name] of modules) {
    const value = await load(file); assert.deepEqual(Object.keys(value),[name]); assert.equal(typeof value[name],'function');
  }
  ({createClient} = await load('shared/http.mjs')); ({quote} = await load('domain/orders.mjs'));
  ({createRepository} = await load('data/orders.mjs')); ({createOrders} = await load('application/orders.mjs'));
  assert.deepEqual(Object.keys(createClient({})),['request']);
  assert.deepEqual(Object.keys(createRepository({})).sort(),['list','place']);
  assert.deepEqual(Object.keys(createOrders({})).sort(),['getState','load','submit']);
});
await check('F2-http-ownership', async () => {
  const body=Object.freeze({nested:{id:1}}), signal=new AbortController().signal;
  const input=Object.freeze({method:'POST',body,signal,headers:Object.freeze({a:'b'})}); let calls=0;
  const client=createClient({transport:async(path,options)=>{
    calls++; assert.equal(path,'/orders'); assert.notEqual(options,input); assert.notEqual(options.headers,input.headers);
    assert.equal(options.body,body); assert.equal(options.signal,signal); assert.deepEqual(options.headers,input.headers);
    assert.equal(options.credentials,'same-origin'); return {status:200,data:body};
  },onUnauthorized:()=>assert.fail('wrong owner')});
  assert.equal(await client.request('/orders',input),body); assert.equal(calls,1);
});
await check('F3-http-errors-no-retry', async () => {
  for(const status of [401,409,503]) {
    let calls=0, unauthorized=0; const data={reason:'rejected'};
    const client=createClient({transport:async()=>{calls++;return {status,data};},onUnauthorized:()=>{unauthorized++;}});
    await assert.rejects(client.request('/orders'),e=>status===401 ? e.code==='unauthorized' : e.code==='http-error' && e.status===status && e.data===data);
    assert.equal(calls,1); assert.equal(unauthorized,status===401 ? 1 : 0);
  }
  const failure=new Error('transport'); let calls=0;
  await assert.rejects(createClient({transport:async()=>{calls++;throw failure;},onUnauthorized:()=>assert.fail()}).request('/orders'),e=>e===failure);
  assert.equal(calls,1);
});
await check('Q1-auth-callback-answer', async () => {
  const failure=new Error('callback'); let calls=0;
  await assert.rejects(createClient({transport:async()=>({status:401}),onUnauthorized:()=>{calls++;throw failure;}}).request('/orders'),e=>e===failure);
  assert.equal(calls,1);
});
await check('F4-domain-policy', async () => {
  assert.equal(quote(Object.freeze({kind:'purchase',quantity:2,coupon:'SAVE'})),1800);
  assert.equal(quote({kind:'purchase',quantity:1}),1000);
  assert.equal(quote({kind:'gift',quantity:10,coupon:''}),10000);
  for(const input of [{kind:'gift',quantity:2,coupon:'SAVE'},{kind:'unknown',quantity:1},
    ...[0,11,1.5,'2',NaN].map(quantity=>({kind:'purchase',quantity})),{kind:'purchase',quantity:1,coupon:'FREE'}]) {
    assert.throws(()=>quote(input),error=>error.code==='invalid-order');
  }
});
await check('F5-repository-delegation', async () => {
  const signal=new AbortController().signal, input=Object.freeze({kind:'gift',quantity:1,total:1000}), result=[]; const calls=[];
  const repository=createRepository({client:{request:async(...args)=>{calls.push(args);return result;}}});
  assert.equal(await repository.list({signal}),result); assert.equal(await repository.place(input),result);
  assert.deepEqual(calls[0],['/orders',{method:'GET',signal}]);
  assert.deepEqual(calls[1],['/orders',{method:'POST',body:input}]); assert.equal(calls[1][1].body,input); assert.equal(calls.length,2);
});
await check('F6-latest-response-wins', async () => {
  for(const staleFailure of [false,true]) {
    const first=deferred(),second=deferred();let calls=0; const signal=new AbortController().signal;
    const orders=createOrders({repository:{list:options=>{assert.equal(options.signal,signal);return ++calls===1 ? first.promise : second.promise;}},quote});
    assert.deepEqual(orders.getState(),{items:[],status:'idle',error:null});
    const a=orders.load({signal}),b=orders.load({signal}); assert.equal(orders.getState().status,'loading');
    second.resolve([{id:'new'}]); await b;
    if(staleFailure) first.reject(new Error('old')); else first.resolve([{id:'old'}]);
    await a; assert.deepEqual(orders.getState(),{items:[{id:'new'}],status:'ready',error:null}); assert.equal(calls,2);
  }
});
await check('Q2-refresh-failure-answer', async () => {
  const failure=new Error('latest');let calls=0;
  const orders=createOrders({repository:{list:async()=>{if(calls++) throw failure;return [{id:'kept'}];}},quote});
  await orders.load(); await orders.load();
  assert.deepEqual(orders.getState(),{items:[{id:'kept'}],status:'error',error:failure});
});
await check('F7-state-snapshot-ownership', async () => {
  const items=[{id:'kept'}]; const orders=createOrders({repository:{list:async()=>items},quote});
  await orders.load(); const snapshot=orders.getState(); snapshot.items.push({id:'foreign'}); snapshot.status='corrupted';
  items.push({id:'external'}); assert.deepEqual(orders.getState(),{items:[{id:'kept'}],status:'ready',error:null});
});
await check('F8-submit-validation-and-ownership', async () => {
  const body=Object.freeze({kind:'purchase',quantity:2,coupon:'SAVE',metadata:Object.freeze({note:'keep'})}); const result={id:'saved'};
  const events=[]; const orders=createOrders({quote:input=>{events.push('quote');assert.equal(input,body);return 1800;},repository:{place:async input=>{
    events.push('place'); assert.notEqual(input,body); assert.equal(input.metadata,body.metadata); assert.deepEqual(input,{...body,total:1800}); return result;
  }}});
  assert.equal(await orders.submit(body),result); assert.deepEqual(events,['quote','place']);
  assert.equal(Object.hasOwn(body,'total'),false);
  const invalid=createOrders({quote,repository:{place:()=>assert.fail('validation must precede side effects')}});
  await assert.rejects(invalid.submit({kind:'gift',quantity:1,coupon:'SAVE'}),e=>e.code==='invalid-order');
  const failure=new Error('repository'); let calls=0;
  const broken=createOrders({quote,repository:{place:async()=>{calls++;throw failure;}}});
  await assert.rejects(broken.submit({kind:'purchase',quantity:1}),e=>e===failure); assert.equal(calls,1);
});
await check('F9-end-to-end-composition', async () => {
  const seen=[];
  const client=createClient({transport:async(path,options)=>{seen.push([path,options]);return {status:200,data:options.method==='GET' ? [{id:'one'}] : {id:'two'}};},onUnauthorized:()=>assert.fail()});
  const orders=createOrders({repository:createRepository({client}),quote});
  await orders.load(); assert.equal(orders.getState().items[0].id,'one');
  assert.deepEqual(await orders.submit({kind:'purchase',quantity:3,coupon:'SAVE'}),{id:'two'});
  assert.equal(seen[1][1].body.total,2800); assert.equal(seen.length,2);
});
await check('N2-approved-dependency-edges', async () => {
  const ts=(await import(pathToFileURL(join(project,'../runtime/node_modules/typescript/lib/typescript.js')).href)).default;
  const allowed={'shared/http.mjs':[], 'domain/orders.mjs':[], 'data/orders.mjs':[], 'application/orders.mjs':[],
    'App.jsx':['react','./ui/OrderList.jsx','./ui/Checkout.jsx'],'ui/OrderList.jsx':['react'],'ui/Checkout.jsx':['react']};
  for(const [file,edges] of Object.entries(allowed)) {
    const source=ts.createSourceFile(file,await readFile(join(project,file),'utf8'),ts.ScriptTarget.Latest,true,file.endsWith('.jsx')?ts.ScriptKind.JSX:ts.ScriptKind.JS);
    const visit=node=>{
      if(ts.isImportDeclaration(node) || ts.isExportDeclaration(node) && node.moduleSpecifier) assert.ok(edges.includes(node.moduleSpecifier.text),`${file}: ${node.moduleSpecifier.text}`);
      if(ts.isCallExpression(node)) assert.notEqual(node.expression.kind,ts.SyntaxKind.ImportKeyword,'dynamic import');
      if(ts.isIdentifier(node) && ['require','fetch','axios','XMLHttpRequest','WebSocket','eval','Function','useEffect','useLayoutEffect','globalThis','window','self'].includes(node.text)) assert.fail(`${file}: forbidden capability ${node.text}`);
      ts.forEachChild(node,visit);
    }; visit(source);
  }
});
await check('F10-ui-build', async () => {
  const {build}=await import(pathToFileURL(join(project,'../runtime/node_modules/esbuild/lib/main.js')).href);
  await build({entryPoints:[join(project,'App.jsx')],bundle:true,write:false,platform:'browser',logLevel:'silent'});
});
console.log(JSON.stringify({status:'graded',eligible:checks.every(row=>row.status==='passed'),results:checks,
  semanticReview:'unverified',limits:'Finite behavior and module-edge checks. UI interaction, rendering performance, intent and arbitrary JavaScript evasions are not verified.'}));
