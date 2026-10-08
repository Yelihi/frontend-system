import {loadCart,type Cart} from './cart';
export async function login(user:string,fetchCart:(user:string)=>Promise<Cart>){loadCart(await fetchCart(user));}
