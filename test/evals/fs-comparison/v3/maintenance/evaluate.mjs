import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

export const keep = 'export const formatPrice = cents => (cents / 100).toFixed(2);\n';
export const stages = ['initial', 'policy-change', 'transport-change'];
export const criteria = ['policy-boundaries', 'invalid-input', 'preview-entry', 'submit-entry', 'replaceable-io', 'pending-guard', 'failure-retry', 'keep-valid-code'];
export const contract = `Implement a headless frontend checkout controller in plain ES modules (no dependencies/install).
policy.mjs exports quote({subtotalCents, member}): integer total cents, synchronous, no I/O. Reject negative/non-integer/nonfinite cents and nonboolean member.
checkout.mjs exports createCheckout({load,send}) returning {preview,submit,getState}.
preview() resolves the total using load(); submit() independently loads current input, sends {totalCents}, and resolves the order ID.
getState() is {status:'idle'|'pending'|'success'|'error', orderId:string|null, error:string|null}. Initially idle/null/null.
Submitting clears old result/error and sets pending before awaiting I/O. Ignore an additional submit while pending (resolve null, no duplicate I/O). On load/send failure resolve null, expose error text and clear old result; release pending so retry works. On success expose ID and clear error.
Only use supplied load/send for I/O; no globals, concrete HTTP endpoints or DOM dependency. Both entry points obey the same policy. Keep existing money.mjs unchanged: it already meets its contract. Use ordinary documentation/tests freely.
Policy initial: members get floor(subtotal*0.10) discount at every subtotal; nonmembers none. Delivery is 500, waived for subtotal>=5000 (before discount).
Initial transport: load resolves {subtotalCents,member}; send resolves {orderId}.
No visual/browser/rendering/React lifecycle criterion is included. This is a small state/domain boundary pilot, not an overall frontend quality score.`;
export const requests = {
  initial: 'Implement the initial contract. Read CONTRACT.md and shared knowledge; write/run meaningful tests.',
  'policy-change': 'Change policy only: members receive floor(subtotal*0.15) discount only when subtotal>=2000. Delivery is 500, waived at subtotal>=6000 before discount. Nonmembers receive no discount. Both entry points must retain the other contracts.',
  'transport-change': 'Keep the changed policy. Adapt the transport: load now resolves {cart:{subtotalCents},customer:{member}}; send now resolves {receipt:{id}}. Submission still sends {totalCents}. Retain failure/retry/pending behavior, both entry points, public API and unchanged money.mjs.',
};
export function golden(stage) {
  const changed = stage !== 'initial', transport = stage === 'transport-change';
  return {
    'money.mjs': keep,
    'policy.mjs': `export function quote({subtotalCents,member}) {
  if (!Number.isSafeInteger(subtotalCents) || subtotalCents < 0 || typeof member !== 'boolean') throw new Error('Invalid input');
  const discount = member ${changed ? '&& subtotalCents >= 2000' : ''} ? Math.floor(subtotalCents * ${changed ? '.15' : '.10'}) : 0;
  return subtotalCents - discount + (subtotalCents >= ${changed ? 6000 : 5000} ? 0 : 500);
}\n`,
    'checkout.mjs': `import {quote} from './policy.mjs';
export function createCheckout({load,send}) {
  let state = {status:'idle',orderId:null,error:null};
  const input = async () => {const raw=await load(); return ${transport ? '{subtotalCents:raw.cart.subtotalCents,member:raw.customer.member}' : 'raw'};};
  return {
    getState: () => ({...state}),
    preview: async () => quote(await input()),
    submit: async () => {
      if (state.status === 'pending') return null;
      state={status:'pending',orderId:null,error:null};
      try {
        const totalCents=quote(await input());
        const reply=await send({totalCents});
        const id=${transport ? 'reply.receipt.id' : 'reply.orderId'};
        state={status:'success',orderId:id,error:null}; return id;
      } catch(error) {state={status:'error',orderId:null,error:error.message}; return null;}
    }
  };
}\n`,
  };
}

export async function grade(root, stage) {
  assert.ok(stages.includes(stage), 'Unknown stage');
  const results = [];
  const check = async (id, run) => { try { await run(); results.push({id, status:'passed'}); }
    catch(error) { results.push({id, status:'failed', reason:String(error.message).slice(0,1000)}); } };
  const policy = await import(pathToFileURL(join(root, 'policy.mjs')));
  const {createCheckout} = await import(pathToFileURL(join(root, 'checkout.mjs')));
  // A concrete global transport must not accidentally satisfy an injected-port contract.
  globalThis.fetch = () => { throw new Error('Unexpected global fetch'); };
  const changed = stage !== 'initial', transport = stage === 'transport-change';
  const expected = (cents, member) => cents - (member && (!changed || cents >= 2000) ? Math.floor(cents * (changed ? .15 : .10)) : 0) + (cents >= (changed ? 6000 : 5000) ? 0 : 500);
  const cases = [0,1,1999,2000,2001,4999,5000,5999,6000,9999].flatMap(cents => [false,true].map(member => ({subtotalCents:cents,member})));
  const raw = input => transport ? {cart:{subtotalCents:input.subtotalCents},customer:{member:input.member}} : input;
  const reply = id => transport ? {receipt:{id}} : {orderId:id};
  await check('policy-boundaries', () => { for(const input of cases) {const snapshot=JSON.stringify(input); assert.equal(policy.quote(input),expected(input.subtotalCents,input.member)); assert.equal(JSON.stringify(input),snapshot);} });
  await check('invalid-input', () => { for(const input of [{subtotalCents:-1,member:false},{subtotalCents:1.5,member:true},{subtotalCents:NaN,member:true},{subtotalCents:Infinity,member:true},{subtotalCents:100,member:'yes'}]) assert.throws(()=>policy.quote(input)); });
  await check('preview-entry', async () => { for(const input of cases) { let sends=0; const app=createCheckout({load:async()=>raw(input),send:async()=>{sends++;}}); assert.equal(await app.preview(),expected(input.subtotalCents,input.member)); assert.equal(sends,0); } });
  await check('submit-entry', async () => { for(const input of cases) { let sent; const app=createCheckout({load:async()=>raw(input),send:async value=>{sent=value;return reply('order-1');}}); assert.equal(await app.submit(),'order-1'); assert.deepEqual(sent,{totalCents:expected(input.subtotalCents,input.member)}); assert.deepEqual(app.getState(),{status:'success',orderId:'order-1',error:null}); } });
  await check('replaceable-io', async () => {
    let calls=0, sent=[];
    const app=createCheckout({load:async()=>raw({subtotalCents:++calls*2000,member:true}),send:async value=>{sent.push(value);return reply('different-adapter');}});
    assert.equal(await app.preview(),expected(2000,true)); assert.equal(await app.submit(),'different-adapter');
    assert.equal(calls,2); assert.deepEqual(sent,[{totalCents:expected(4000,true)}]);
  });
  await check('pending-guard', async () => {
    let release, calls=0, sends=0;
    const app=createCheckout({load:()=>{calls++;return new Promise(resolve=>{release=resolve;});},send:async()=>{sends++;return reply('once');}});
    assert.deepEqual(app.getState(),{status:'idle',orderId:null,error:null});
    const first=app.submit(); assert.deepEqual(app.getState(),{status:'pending',orderId:null,error:null});
    const extra=app.submit(); await Promise.resolve(); assert.equal(calls,1); assert.equal(await extra,null);
    release(raw({subtotalCents:2000,member:true})); assert.equal(await first,'once'); assert.equal(sends,1);
  });
  await check('failure-retry', async () => {
    for(const failure of ['load','send']) {
      let fail=false;
      const app=createCheckout({load:async()=>{if(fail && failure==='load')throw new Error('offline');return raw({subtotalCents:2000,member:true});},send:async()=>{if(fail && failure==='send')throw new Error('offline');return reply('recovered');}});
      await app.submit(); fail=true; const pending=app.submit(); assert.deepEqual(app.getState(),{status:'pending',orderId:null,error:null});
      assert.equal(await pending,null); assert.deepEqual(app.getState(),{status:'error',orderId:null,error:'offline'});
      fail=false; assert.equal(await app.submit(),'recovered'); assert.deepEqual(app.getState(),{status:'success',orderId:'recovered',error:null});
    }
  });
  await check('keep-valid-code', async()=>{assert.equal(await readFile(join(root,'money.mjs'),'utf8'),keep);});
  return {stage, eligible:results.every(r=>r.status==='passed'), passed:results.filter(r=>r.status==='passed').length, required:criteria.length, results};
}

async function calibrate(output) {
  const root=await mkdtemp(join(tmpdir(),'fs-maintenance-calibration-')), results=[];
  try {
    for(const stage of stages) {
      const correct=golden(stage);
      const variants=[['correct',null,null],
        ['wrong-policy', 'policy.mjs', text=>text.replace('Math.floor','Math.ceil')],
        ['no-validation','policy.mjs',text=>text.replace(/  if \(!Number.isSafeInteger[^\n]+\n/,'')],
        ['preview-drift','checkout.mjs',text=>text.replace('preview: async () => quote(await input())','preview: async () => 0')],
        ['concrete-io','checkout.mjs',text=>text.replace('const raw=await load()','const raw=await fetch("https://example.invalid")')],
        ['stuck-pending','checkout.mjs',text=>text.replace("status:'error'","status:'pending'")],
        ['stale-success','checkout.mjs',text=>text.replace("orderId:null,error:error.message","orderId:state.orderId ?? 'old-order',error:error.message")],
        ['unnecessary-edit','money.mjs',text=>text+'// unrelated rewrite\n']];
      for(const [variant,file,mutate] of variants) {
        for(const [name,text] of Object.entries(correct)) await writeFile(join(root,name),name===file?mutate(text):text);
        const run=spawnSync(process.execPath,[fileURLToPath(import.meta.url),'grade',root,stage],{encoding:'utf8',timeout:10000});
        assert.equal(run.status,0,`${stage}/${variant}: ${run.stderr}`);
        const report=JSON.parse(run.stdout);
        assert.equal(report.eligible,variant==='correct',`${stage}/${variant} misclassified`);
        results.push({stage,variant,...report});
      }
    }
    const report={kind:'hand-authored grader calibration; not model performance',modelCalls:0,correctAccepted:results.filter(r=>r.variant==='correct'&&r.eligible).length,mutantsRejected:results.filter(r=>r.variant!=='correct'&&!r.eligible).length,results};
    await writeFile(output,JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify({output,correctAccepted:report.correctAccepted,mutantsRejected:report.mutantsRejected,modelCalls:0}));
  } finally {await rm(root,{recursive:true,force:true});}
}

// Same source can be sent through stdin to a restricted grader without exposing the oracle file.
if (process.argv[2]==='grade') {
  try { console.log(JSON.stringify(await grade(resolve(process.argv[3]),process.argv[4]))); }
  catch(error) { console.log(JSON.stringify({stage:process.argv[4],eligible:false,passed:0,required:criteria.length,results:criteria.map(id=>({id,status:'failed',reason:'Module load/evaluation failed: '+String(error.message).slice(0,500)}))})); }
} else if(process.argv[2]==='calibrate') await calibrate(resolve(process.argv[3]));
else if(process.argv[2]==='spec') console.log(JSON.stringify({contract,requests,stages,criteria,keep,hash:createHash('sha256').update(await readFile(fileURLToPath(import.meta.url))).digest('hex')}));
