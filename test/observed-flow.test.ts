import assert from 'node:assert/strict';
import {mkdtemp, readFile, writeFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import test from 'node:test';
import ts from 'typescript';

// Execute the actual eval modules unchanged (only erase types/resolve ESM imports).
// This verifies selected analysis claims, not React timing, a real server, or all paths.
test('observed order flow matches actual events, rollback, caller mutation, newer-input defect and cleanup',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'fs-observed-runtime-'));
  const oldFetch=globalThis.fetch;
  try {
    for(const file of ['state','client','save','pages']) {
      const source=await readFile(join(process.cwd(),'test/evals/fs-comparison/v12/projects/request/src',file+'.ts'),'utf8');
      const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText.replace(/from '(.+?)'/g,"from '$1.mjs'");
      await writeFile(join(dir,file+'.mjs'),js);
    }
    const {draft,orders,publish,setQuantity}=await import(pathToFileURL(join(dir,'state.mjs')).href);
    const {mountEditor,mountList}=await import(pathToFileURL(join(dir,'pages.mjs')).href);
    const {saveOrder}=await import(pathToFileURL(join(dir,'save.mjs')).href);
    const {request}=await import(pathToFileURL(join(dir,'client.mjs')).href);
    const form=new EventTarget(),quantity=Object.assign(new EventTarget(),{value:'2'}),error={textContent:''},container={textContent:''};
    const cleanupEditor=mountEditor(form,quantity,error),cleanupList=mountList(container);
    assert.equal(container.textContent,'');
    publish([{id:'o1',quantity:1}]);
    quantity.dispatchEvent(new Event('input'));
    assert.equal(draft.value.quantity,2);assert.equal(draft.dirty,true);
    let requests=0;
    globalThis.fetch=async()=>{requests++;return new Response(JSON.stringify({id:'o1',quantity:2}),{status:200});};
    setQuantity(0);const before=orders.rows;
    const invalid=await saveOrder({...draft.value},{});
    assert.equal(invalid.message,'quantity');assert.equal(requests,0);assert.equal(orders.rows,before);
    setQuantity(2);
    const headers:Record<string,string>={'X-Workspace':'w1'};
    await request('/orders/o1',{body:'{}',headers});
    assert.equal(headers.Authorization,'Bearer interactive-session','The current request really mutates caller headers');
    let reply!: (value:Response)=>void;
    globalThis.fetch=()=>{requests++;return new Promise<Response>(resolve=>{reply=resolve;});};
    const pending=saveOrder({...draft.value},{});
    assert.equal(container.textContent,'o1:2','Optimistic publish happens before HTTP settles');
    setQuantity(3);
    reply(new Response(JSON.stringify({id:'o1',quantity:2}),{status:200}));
    await pending;
    assert.equal(draft.value.quantity,3);assert.equal(draft.dirty,false,'Observed defect: old success clears newer draft dirty state');
    setQuantity(4);const previous=orders.rows;
    globalThis.fetch=async()=>new Response('',{status:401});
    const unauthorized=await saveOrder({...draft.value},{});
    assert.match(unauthorized.message,/session-expired/);assert.equal(orders.rows,previous);assert.equal(draft.dirty,true);
    globalThis.fetch=async()=>new Response('',{status:500});
    assert.match((await saveOrder({...draft.value},{})).message,/request-failed/);
    // Observe the actual DOM event callback's returned error display.
    globalThis.fetch=async()=>new Response('',{status:401});
    form.dispatchEvent(new Event('submit',{cancelable:true}));
    await new Promise(resolve=>setImmediate(resolve));
    assert.match(error.textContent,/session-expired/);
    globalThis.fetch=async()=>new Response(JSON.stringify({id:'o1',quantity:4}),{status:200});
    form.dispatchEvent(new Event('submit',{cancelable:true}));
    await new Promise(resolve=>setImmediate(resolve));
    assert.match(error.textContent,/session-expired/,'Successful submit does not clear an older error');
    cleanupList();const last=container.textContent;
    publish([{id:'o1',quantity:9}]);assert.equal(container.textContent,last);assert.equal(orders.listeners.size,0);
    cleanupEditor();quantity.value='10';quantity.dispatchEvent(new Event('input'));
    assert.equal(draft.value.quantity,4);
    let afterCleanup=0;globalThis.fetch=async()=>{afterCleanup++;return new Response('{}');};
    form.dispatchEvent(new Event('submit'));await new Promise(resolve=>setImmediate(resolve));
    assert.equal(afterCleanup,0);
  } finally {globalThis.fetch=oldFetch;await rm(dir,{recursive:true,force:true});}
});

test('actual ticket store notifies both registered subscribers and removes only the unsubscribed callback',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'fs-observed-store-'));
  try {
    const source=await readFile(join(process.cwd(),'test/evals/fs-comparison/v12/projects/styles/src/store.ts'),'utf8');
    await writeFile(join(dir,'store.mjs'),ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText);
    const {ticketStore}=await import(pathToFileURL(join(dir,'store.mjs')).href);
    const calls:string[]=[];
    ticketStore.subscribe(()=>calls.push('tickets:'+ticketStore.getSnapshot()));
    const unsubscribe=ticketStore.subscribe(()=>calls.push('details:'+ticketStore.getSnapshot()));
    ticketStore.select('t1');assert.deepEqual(calls,['tickets:t1','details:t1']);
    unsubscribe();ticketStore.select('t2');assert.deepEqual(calls,['tickets:t1','details:t1','tickets:t2']);
  } finally {await rm(dir,{recursive:true,force:true});}
});

test('reviewed real-project diagrams validate source pins and citations through the production export path',async()=>{
  const {cp}=await import('node:fs/promises');
  const {createHash}=await import('node:crypto');
  const {flowSchema}=await import('../src/application/flow-schema.js');
  const {saveProjectAnalysis}=await import('../src/application/project-flows.js');
  const {renderProjectFlow}=await import('../src/application/render-project-flow.js');
  const pins=JSON.parse(await readFile(join(process.cwd(),'docs/flows/source-hashes.json'),'utf8'));
  const dir=await mkdtemp(join(tmpdir(),'fs-actual-diagrams-'));
  try {
    for(const [fixture,id] of [['request','order-workspace'],['styles','ticket-selection']] as const) {
      const source=join(process.cwd(),'test/evals/fs-comparison/v12/projects',fixture),root=join(dir,fixture);
      await cp(source,root,{recursive:true,filter:path=>!path.split(/[\\/]/).includes('.frontend-system')});
      const data=flowSchema.parse(JSON.parse(await readFile(join(process.cwd(),'docs/flows',id+'.json'),'utf8')));
      for(const file of data.scope.files) assert.equal(createHash('sha256').update(await readFile(join(root,file))).digest('hex'),pins[fixture][file],`Review changed source: ${fixture}/${file}`);
      const saved=await saveProjectAnalysis(root,process.cwd(),{expectedHash:null,record:{kind:'flow',data}});
      const rendered=await renderProjectFlow(root,process.cwd(),{id,expectedHash:saved.hash});
      const html=await readFile(rendered.path,'utf8');
      // Compile the embedded program without executing a browser or application.
      const program=html.match(/<\/script><script>([\s\S]*?)<\/script>/)?.[1];
      assert.ok(program);assert.doesNotThrow(()=>new Function(program));
      assert.equal(rendered.basis,'observed');assert.equal(rendered.freshness.status,'current');
      await writeFile(join(root,'src/new-consumer.ts'),'export const newConsumer = true;');
      await assert.rejects(renderProjectFlow(root,process.cwd(),{id,expectedHash:saved.hash}),/inventory changed/);
    }
  } finally {await rm(dir,{recursive:true,force:true});}
});
