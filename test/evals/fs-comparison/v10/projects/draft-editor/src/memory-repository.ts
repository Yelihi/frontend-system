import type { Repository,Doc } from './types';
export function repository(seed:Doc[]):Repository {
 const store=new Map(seed.map(d=>[d.id,{...d}]));
 return {async load(id){const d=store.get(id);if(!d)throw Error('missing');return {...d};},
 async saveDraft(doc){const current=store.get(doc.id);if(current&&current.revision!==doc.revision)return {kind:'conflict',remote:{...current}};
 const next={...doc,revision:doc.revision+1};store.set(doc.id,next);return {kind:'saved',document:{...next}};}};
}
