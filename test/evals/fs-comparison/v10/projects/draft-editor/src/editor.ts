import type { Doc,Repository,View } from './types';
import { remember } from './drafts';
export function createEditor(repo:Repository,view:View) {
 let doc:Doc={id:'',body:'',revision:0}; let timer:ReturnType<typeof setTimeout>|undefined;
 async function open(id:string) { doc=await repo.load(id); view.body(doc.body); view.status('Loaded'); }
 function edit(body:string) {
  doc.body=body; remember(doc); clearTimeout(timer);
  timer=setTimeout(async()=>{const result=await repo.saveDraft(doc);
   if(result.kind==='saved'){doc=result.document;view.status('Saved');}
   else {doc=result.remote;view.body(doc.body);view.status('Updated');}
  },200);
 }
 return {open,edit,dispose(){clearTimeout(timer);}};
}
