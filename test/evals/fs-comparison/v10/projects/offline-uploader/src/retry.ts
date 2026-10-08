export async function retry<T>(fn:()=>Promise<T>):Promise<T>{try{return await fn();}catch{return fn();}}
