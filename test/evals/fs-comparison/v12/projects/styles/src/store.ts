let selected=''; const listeners=new Set<()=>void>();
export const ticketStore={getSnapshot:()=>selected,subscribe:(f:()=>void)=>{listeners.add(f);return()=>{listeners.delete(f);}},select:(id:string)=>{selected=id;listeners.forEach(f=>f());}};
