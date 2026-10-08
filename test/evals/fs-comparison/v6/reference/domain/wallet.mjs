export function validateDebit({balance, amount, currency}) {
  if (currency !== 'KRW' || !Number.isInteger(balance) || balance < 0 || !Number.isInteger(amount) || amount < 0) {
    throw Object.assign(new Error('Invalid payment'), {code: 'invalid-payment'});
  }
  if (amount > balance) throw Object.assign(new Error('Insufficient balance'), {code: 'insufficient-balance'});
  return {amount, currency};
}
