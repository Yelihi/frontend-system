import {activate,type Extension} from './extension';
import {emit} from './bus';
export function dashboard(){const stops=new Map<string,()=>void>();return{
 load(e:Extension){stops.set(e.id,activate(e));},unload(id:string){stops.get(id)?.();stops.delete(id);},
 publish(value:string){emit(value);},dispose(){for(const stop of stops.values())stop();stops.clear();}};}
