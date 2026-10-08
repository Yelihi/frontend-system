import {createQueue} from './queue';
import type {Sender,Events} from './types';
export function openWorkspace(id:string,sender:Sender,events:Events){let current='token-'+id;
 const queue=createQueue(sender,events,()=>current);return {...queue,replaceToken(next:string){current=next;},close(){}};}
