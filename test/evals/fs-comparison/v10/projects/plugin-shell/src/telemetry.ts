export type Diagnostic={extension:string;message:string};
export function diagnostics(){const entries:Diagnostic[]=[];return {report(d:Diagnostic){entries.push(d);},entries:()=>entries.slice()};}
