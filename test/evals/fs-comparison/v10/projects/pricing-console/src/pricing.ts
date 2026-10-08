import type {Quote} from './model';
export function calculateTotal(q:Quote){
 q.lines.sort((a,b)=>a.sku.localeCompare(b.sku));
 let total=q.lines.reduce((sum,l)=>sum+Number(l.unit)*l.quantity,0);
 total*=1+Number(q.tax);
 if(q.promotion)total-=q.promotion.kind==='percent'?total*Number(q.promotion.value):Number(q.promotion.value);
 return Math.round(total*100)/100;
}
