export function validateReservation({sku, quantity, available}) {
  if (typeof sku !== 'string' || !sku || !Number.isInteger(quantity) || quantity < 1 ||
      !Number.isInteger(available) || available < 0) {
    throw Object.assign(new Error('Invalid inventory input'), {code: 'invalid-inventory'});
  }
  if (quantity > available) throw Object.assign(new Error('Insufficient stock'), {code: 'out-of-stock'});
  return {sku, quantity};
}
