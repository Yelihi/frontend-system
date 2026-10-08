import {calculateTotal} from './pricing';
import type {Quote} from './model';
export function preview(q:Quote){return {originalOrder:q.lines.map(l=>l.sku),amount:calculateTotal(q),lines:q.lines};}
