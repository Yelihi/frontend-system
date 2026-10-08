export type Cart={owner:string;items:string[]};
let current:Cart={owner:'guest',items:[]};
export function loadCart(cart:Cart){current=cart;}
export function add(sku:string){current.items.push(sku);}
export function snapshot(){return current;}
