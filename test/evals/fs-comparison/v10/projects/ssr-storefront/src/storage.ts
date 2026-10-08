import {snapshot,loadCart} from './cart';
export function restore(){const raw=localStorage.getItem('cart');if(raw)loadCart(JSON.parse(raw));}
export function persist(){localStorage.setItem('cart',JSON.stringify(snapshot()));}
