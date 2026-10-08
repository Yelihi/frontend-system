import { createEditor } from './editor';
import type { Repository } from './types';
export function mount(root:HTMLElement,repo:Repository){const input=document.createElement('textarea');const status=document.createElement('output');root.append(input,status);
 const editor=createEditor(repo,{body:v=>{input.value=v;},status:v=>{status.textContent=v;}});
 input.oninput=()=>editor.edit(input.value);return {...editor,dispose(){editor.dispose();input.remove();status.remove();}};}
