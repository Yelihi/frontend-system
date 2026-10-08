export function discount({kind, tier, subtotal, coupon}) {
  if (kind === 'gift') return 0;
  const member = tier === 'vip' ? Math.min(500, Math.floor(subtotal / 10)) : 0;
  return Math.min(subtotal, member + (coupon === 'SAVE' ? 200 : 0));
}
