const commands=new Map<string,()=>void>();
export function register(id:string,run:()=>void){commands.set(id,run);return()=>commands.delete(id);}
export function run(id:string){commands.get(id)?.();}
