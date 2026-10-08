export function quote({kind, quantity, coupon = ''}) {
  if (!['purchase', 'gift'].includes(kind) || !Number.isInteger(quantity) || quantity < 1 || quantity > 10 ||
      !['', 'SAVE'].includes(coupon) || (kind === 'gift' && coupon !== '')) {
    throw Object.assign(new Error('Invalid order'), {code: 'invalid-order'});
  }
  return quantity * 1000 - (coupon === 'SAVE' ? 200 : 0);
}
