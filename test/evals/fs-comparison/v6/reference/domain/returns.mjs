export function canReturn({deliveredAt, now, reason}) {
  const days = reason === 'damaged' ? 30 : reason === 'changed-mind' ? 7 : -1;
  return days >= 0 && Number.isInteger(deliveredAt) && Number.isInteger(now) &&
    now >= deliveredAt && now - deliveredAt <= days * 86400000;
}
export function refundAmount({paid, quantity, totalQuantity, reason, kind}) {
  if (!Number.isInteger(paid) || paid < 0 || !Number.isInteger(quantity) || quantity < 1 ||
      !Number.isInteger(totalQuantity) || totalQuantity < quantity || totalQuantity > 10 ||
      !['damaged', 'changed-mind'].includes(reason) || !['purchase', 'gift'].includes(kind) ||
      (kind === 'gift' && reason === 'changed-mind')) {
    throw Object.assign(new Error('Invalid return'), {code: 'invalid-return'});
  }
  return kind === 'gift' ? 0 : Math.floor(paid * quantity / totalQuantity);
}
