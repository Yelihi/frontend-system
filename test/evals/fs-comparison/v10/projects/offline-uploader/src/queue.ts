import type {Job,Sender,Events} from './types';
import {retry} from './retry';
const jobs:Job[]=[];
export function createQueue(sender:Sender,events:Events,token:()=>string){
 const canceled=new Set<string>();
 async function enqueue(job:Job){jobs.push(job);events.pending(jobs.length);
 try{const result=await retry(()=>sender.uploadChunk(job,token()));if(!canceled.has(job.id))events.done(job.id,result.receipt);}
 catch{events.failed(job.id);}finally{jobs.splice(jobs.indexOf(job),1);events.pending(jobs.length);}}
 return {enqueue,cancel(id:string){canceled.add(id);}};
}
