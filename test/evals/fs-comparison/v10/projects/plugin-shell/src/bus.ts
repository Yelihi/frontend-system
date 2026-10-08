type Listener=(value:string)=>void;
const listeners:Listener[]=[];
export function subscribe(fn:Listener){listeners.push(fn);return()=>{listeners.splice(listeners.indexOf(fn),1);};}
export function emit(value:string){for(const listener of listeners)listener(value);}
