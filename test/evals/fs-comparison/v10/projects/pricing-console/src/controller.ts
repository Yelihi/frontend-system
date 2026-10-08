import {calculateTotal} from './pricing';
import {loadQuote,type Send} from './transport';
export function createQuoteScreen(send:Send,show:(text:string)=>void){
 let total=0;return {async open(id:string){const q=await loadQuote(send,id);total=calculateTotal(q);show(q.currency+' '+total.toFixed(2));},
 async confirm(id:string){await send('/orders',{method:'POST',body:JSON.stringify({quoteId:id,total})});show('Confirmed');}};
}
