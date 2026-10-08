import {openWorkspace} from './workspace';
import type {Sender} from './types';
export function panel(root:HTMLElement,id:string,sender:Sender){return openWorkspace(id,sender,{done:(_,r)=>{root.textContent=r;},failed:()=>{root.textContent='Upload failed';},pending:n=>{root.dataset.pending=String(n);}});}
