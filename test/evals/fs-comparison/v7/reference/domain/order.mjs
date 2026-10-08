import {discount} from './promotion.mjs';
import {shipping} from './shipping.mjs';
export function quote({kind, lines, coupon = '', tier = 'guest', region = 'local', credit = 0}) {
  const invalid = () => { throw Object.assign(new Error('Invalid order'), {code: 'invalid-order'}); };
  if (!['purchase', 'gift'].includes(kind) || !['guest', 'vip'].includes(tier) ||
      !['local', 'remote'].includes(region) || !['', 'SAVE'].includes(coupon) ||
      (kind === 'gift' && coupon !== '') || !Number.isInteger(credit) || credit < 0 ||
      !Array.isArray(lines) || lines.length < 1 || lines.length > 20) invalid();
  const seen = new Set();
  let subtotal = 0;
  for (const line of lines) {
    if (typeof line.sku !== 'string' || !line.sku || seen.has(line.sku) ||
        !Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 10 ||
        !Number.isInteger(line.price) || line.price < 0 || line.price > 100000) invalid();
    seen.add(line.sku);
    subtotal += line.quantity * line.price;
  }
  const reduction = discount({kind, tier, subtotal, coupon});
  const fee = shipping({kind, region, subtotal});
  const creditUsed = Math.min(credit, subtotal - reduction);
  return {subtotal, discount: reduction, shipping: fee, creditUsed, total: subtotal - reduction - creditUsed + fee};
}
