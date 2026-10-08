import {loadCart,snapshot,type Cart} from './cart';
export type Api={cart(user:string):Promise<Cart>};
export async function render(user:string,api:Api){loadCart(await api.cart(user));await Promise.resolve();
 return {markup:'<main><output id="count">'+snapshot().items.length+'</output></main>',state:snapshot()};}
