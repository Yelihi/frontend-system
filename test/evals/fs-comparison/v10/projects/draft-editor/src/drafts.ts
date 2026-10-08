import type { Doc } from './types';
const drafts=new Map<string,Doc>();
export function remember(doc:Doc) { drafts.set(doc.id,doc); }
export function recalled(id:string) { return drafts.get(id); }
