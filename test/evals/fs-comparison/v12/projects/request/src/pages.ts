import {draft,orders,setQuantity} from './state';
import {saveOrder} from './save';
export function mountEditor(form:HTMLFormElement, quantity:HTMLInputElement,error:HTMLElement){
  const headers={'X-Workspace':'w1'};
  const change=()=>setQuantity(Number(quantity.value));
  const submit=async(e:Event)=>{e.preventDefault(); const result=await saveOrder({...draft.value},headers); if(!result.ok)error.textContent=result.message;};
  quantity.addEventListener('input',change);form.addEventListener('submit',submit);
  return ()=>{quantity.removeEventListener('input',change);form.removeEventListener('submit',submit);};
}
export function mountList(container:HTMLElement){
  const render=()=>{container.textContent=orders.rows.map(x=>x.id+':'+x.quantity).join(',');};
  orders.listeners.add(render);render();return ()=>{orders.listeners.delete(render);};
}
