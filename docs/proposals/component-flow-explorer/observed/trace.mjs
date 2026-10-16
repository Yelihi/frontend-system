import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createOrderSubmitter} from '../../../../test/fixtures/frontend/src/domain/orders.js';
// Calls the original function. Only transport and its existing changed callback are controlled.
let status={pending:false,error:'',submitted:false},finish,calls=0,sequence=[];
const submit=createOrderSubmitter(quantity=>{calls++;sequence.push({kind:'send',quantity});return new Promise((resolve,reject)=>{finish={resolve,reject};});},next=>{sequence.push({kind:'status',before:status,after:next});status=next;});
await assert.rejects(submit(0),/positive integer/);assert.equal(calls,0);
const first=submit(1);const duplicate=await submit(1);assert.equal(duplicate,false);assert.equal(calls,1);
sequence.push({kind:'duplicate',value:duplicate,status:{...status},calls});
finish.reject(new Error('Order failed. Try again.'));assert.equal(await first,false);
const retry=submit(1);finish.resolve();assert.equal(await retry,true);assert.equal(calls,2);
assert.deepEqual(status,{pending:false,error:'',submitted:true});
assert.equal(sequence.filter(e=>e.kind==='status').length,4);
const result={source:'test/fixtures/frontend/src/domain/orders.js',measurement:'Original domain function with injected transport; callback values observed, React commits and closure locals not instrumented',invalidRejected:true,duplicateRejected:true,calls,sequence};
await writeFile('docs/proposals/component-flow-explorer/observed/runtime-trace.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
