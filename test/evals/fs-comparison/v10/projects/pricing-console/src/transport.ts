import type {Quote} from './model';
export type Send=(path:string,init?:{method:string;body:string})=>Promise<Quote>;
export function loadQuote(send:Send,id:string){return send('/quotes/'+encodeURIComponent(id));}
