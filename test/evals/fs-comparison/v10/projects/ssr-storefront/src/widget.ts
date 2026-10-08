import {add,snapshot,loadCart,type Cart} from './cart';
import {restore,persist} from './storage';
export function hydrate(root:HTMLElement,server:Cart){loadCart(server);restore();root.textContent=String(snapshot().items.length);
 return {add(sku:string){add(sku);persist();root.textContent=String(snapshot().items.length);}};}
