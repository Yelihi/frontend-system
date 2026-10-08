import {request} from './client';
import {draft,orders,publish,type Draft} from './state';
export async function saveOrder(input:Draft, headers:Record<string,string>){
  if(input.quantity<1) return {ok:false as const,message:'quantity'};
  const previous=orders.rows;
  publish(previous.map(row=>row.id===input.id?{...input}:row));
  try {
    const saved=await request('/orders/'+input.id,{body:JSON.stringify(input),headers});
    publish(orders.rows.map(row=>row.id===input.id?saved:row));
    draft.dirty=false;
    return {ok:true as const};
  } catch(error){publish(previous);return {ok:false as const,message:String(error)};}
}
