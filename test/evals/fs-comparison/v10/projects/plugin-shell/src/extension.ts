import {subscribe} from './bus';
import {register} from './commands';
export type Extension={id:string;event(value:string):void;run():void};
export function activate(extension:Extension){const a=subscribe(extension.event),b=register(extension.id,extension.run);return()=>{a();b();};}
