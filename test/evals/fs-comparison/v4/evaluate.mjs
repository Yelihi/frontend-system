import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {join, resolve} from 'node:path';

// Passed through stdin to the existing restricted executor; model code never runs in the host grader.
const [project, preserveHash = ''] = process.argv.slice(2);
const checks = [];
const check = async (id, fn) => {
  try { await fn(); checks.push({id,status:'passed'}); }
  catch (error) { checks.push({id,status:'failed',reason:String(error.message).slice(0,1500)}); }
};
let createClient;
await check('public-interface', async () => {
  ({createClient} = await import(pathToFileURL(join(resolve(project),'api.mjs')).href));
  assert.equal(typeof createClient,'function');
});
if (createClient) {
  await check('success-and-input-ownership', async () => {
    const input=Object.freeze({method:'POST',headers:Object.freeze({'x-user':'value'})});
    let calls=0;
    const client=createClient({transport:async (path,options) => {
      calls++; assert.equal(path,'/order'); assert.equal(options.credentials,'same-origin');
      assert.equal(options.headers['x-user'],'value'); return {status:200,data:{id:1}};
    },onUnauthorized:()=>{throw new Error('unexpected auth handling');}});
    assert.deepEqual(await client.request('/order',input),{id:1}); assert.equal(calls,1);
    assert.deepEqual(input,{method:'POST',headers:{'x-user':'value'}});
  });
  await check('unauthorized-once-no-retry', async () => {
    let sent=0,handled=0;
    const client=createClient({transport:async () => {sent++;return {status:401,data:{reason:'expired'}};},onUnauthorized:()=>{handled++;}});
    await assert.rejects(client.request('/order',{method:'POST'}),error=>error.code==='unauthorized');
    assert.equal(sent,1);assert.equal(handled,1);
  });
  await check('business-error-remains-caller-owned', async () => {
    let sent=0;
    const data={reason:'stock-unavailable'};
    const client=createClient({transport:async () => {sent++;return {status:409,data};},onUnauthorized:()=>{throw new Error('wrong owner');}});
    await assert.rejects(client.request('/order',{method:'POST'}),error=>error.code==='http-error' && error.status===409 && error.data===data);
    assert.equal(sent,1);
  });
  await check('transport-failure-no-retry', async () => {
    let sent=0;const failure=new Error('simulated transport');
    const client=createClient({transport:async () => {sent++;throw failure;},onUnauthorized:()=>{throw new Error('wrong owner');}});
    await assert.rejects(client.request('/order',{method:'POST'}),error=>error===failure);assert.equal(sent,1);
  });
}
// Syntax/compilation runs in the restricted runtime, independent of FS tool-use grading.
await check('ui-build-and-direct-request-boundary', async () => {
  const {build}=await import(pathToFileURL(join(resolve(project),'../runtime/node_modules/esbuild/lib/main.js')).href);
  await build({entryPoints:[join(project,'App.jsx')],bundle:true,write:false,platform:'browser',logLevel:'silent'});
  const ts=(await import(pathToFileURL(join(resolve(project),'../runtime/node_modules/typescript/lib/typescript.js')).href)).default;
  const text=await readFile(join(project,'App.jsx'),'utf8');
  const source=ts.createSourceFile('App.jsx',text,ts.ScriptTarget.Latest,true,ts.ScriptKind.JSX);
  let requests=0;
  const visit=node=>{
    if(ts.isImportDeclaration(node) && node.moduleSpecifier.text==='axios') throw new Error('UI imports axios');
    if(ts.isCallExpression(node)) {
      const callee=node.expression;
      if(ts.isIdentifier(callee) && ['fetch','axios'].includes(callee.text)) throw new Error('Direct UI HTTP call');
      if(ts.isPropertyAccessExpression(callee)) {
        if(['window','globalThis','axios'].includes(callee.expression.getText(source)) && ['fetch','get','post','request'].includes(callee.name.text)) throw new Error('Direct UI HTTP call');
        if(callee.expression.getText(source)==='client' && callee.name.text==='request') requests++;
      }
    }
    ts.forEachChild(node,visit);
  };
  visit(source);assert.ok(requests,'App must use the injected client.request contract');
});
if(preserveHash) await check('preserve-valid-client',async()=>{
  const {createHash}=await import('node:crypto');
  assert.equal(createHash('sha256').update(await readFile(join(project,'api.mjs'))).digest('hex'),preserveHash);
});
console.log(JSON.stringify({status:'graded',eligible:checks.every(({status})=>status==='passed'),results:checks,
  semanticReview:'unverified',limits:'Named App/client boundary only; indirect aliases and runtime UI behavior require review.'}));
