export type Draft={id:string;quantity:number};
export const draft={value:{id:'o1',quantity:1},dirty:false};
export const orders={rows:[] as Draft[],listeners:new Set<()=>void>()};
export function publish(rows:Draft[]){orders.rows=rows;orders.listeners.forEach(f=>f());}
export function setQuantity(quantity:number){draft.value={...draft.value,quantity};draft.dirty=true;}
