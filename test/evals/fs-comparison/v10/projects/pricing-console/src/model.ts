export type Line={sku:string;unit:string;quantity:number};
export type Promotion={kind:'percent'|'fixed';value:string};
export type Quote={currency:string;lines:Line[];promotion?:Promotion;tax:string};
