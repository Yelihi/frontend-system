import assert from 'node:assert/strict';
import test from 'node:test';
import { pathToFileURL } from 'node:url';
let sequence=0;
async function factory() { return (await import(pathToFileURL(process.env.FS_ORDER_MODULE).href+'?case='+sequence++)).createOrderSubmitter; }
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return {promise,resolve,reject}};
test('valid quantity sends once and reports successful state', async()=>{
 const make=await factory();const sent=[],states=[];const submit=make(async q=>sent.push(q),s=>states.push(s));
 assert.equal(await submit(3),true);assert.deepEqual(sent,[3]);
 assert.deepEqual(states,[{pending:true,error:'',submitted:false},{pending:false,error:'',submitted:true}]);
});
test('invalid quantities reject before transport', async()=>{
 for(const q of [0,-1,1.5,NaN,Infinity,'2',null]){const make=await factory();let calls=0;const submit=make(async()=>calls++,()=>{});await assert.rejects(submit(q),Error);assert.equal(calls,0);}
});
test('pending duplicate is false and does not send', async()=>{
 const make=await factory(),d=deferred();let calls=0;const submit=make(()=>{calls++;return d.promise},()=>{});const first=submit(1);
 try{assert.equal(await submit(2),false);assert.equal(calls,1);}finally{d.resolve();await first;}
});
test('independent forms do not share pending state', async()=>{
 const make=await factory(),a=deferred(),b=deferred();let calls=0;
 const first=make(()=>a.promise,()=>{})(1);const second=make(()=>{calls++;return b.promise},()=>{})(2);
 try{assert.equal(calls,1);}finally{a.resolve();b.resolve();await Promise.all([first,second]);}
});
test('async failure returns false, releases pending and permits retry',async()=>{
 const make=await factory();let calls=0;const states=[];const submit=make(async()=>{if(++calls===1)throw Error('offline')},s=>states.push(s));
 assert.equal(await submit(1),false);assert.deepEqual(states.at(-1),{pending:false,error:'offline',submitted:false});
 assert.equal(await submit(2),true);assert.equal(calls,2);assert.deepEqual(states.at(-1),{pending:false,error:'',submitted:true});
});
test('synchronous transport throw also releases pending',async()=>{
 const make=await factory();let calls=0;const submit=make(()=>{if(++calls===1)throw Error('sync')},()=>{});
 assert.equal(await submit(1),false);assert.equal(await submit(1),true);assert.equal(calls,2);
});
test('non-Error rejection gets the agreed fallback',async()=>{
 const make=await factory();const states=[];const submit=make(async()=>{throw 'offline'},s=>states.push(s));
 assert.equal(await submit(1),false);assert.equal(states.at(-1).error,'Order failed');
});
test('retry clears previous error immediately before resolving',async()=>{
 const make=await factory(),d=deferred();let calls=0;const states=[];const submit=make(()=>++calls===1?Promise.reject(Error('offline')):d.promise,s=>states.push(s));
 await submit(1);const second=submit(1);
 try{assert.deepEqual(states.at(-1),{pending:true,error:'',submitted:false});assert.equal(calls,2);}finally{d.resolve();await second;}
});
test('new request clears submitted status while pending',async()=>{
 const make=await factory(),d=deferred();let calls=0;const states=[];const submit=make(()=>++calls===1?Promise.resolve():d.promise,s=>states.push(s));
 await submit(1);const second=submit(2);
 try{assert.deepEqual(states.at(-1),{pending:true,error:'',submitted:false});}finally{d.resolve();await second;}
});
