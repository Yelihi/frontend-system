export function shipping({kind, region, subtotal}) {
  if (kind === 'gift') return 0;
  if (region === 'remote') return 700;
  return subtotal >= 5000 ? 0 : 300;
}
