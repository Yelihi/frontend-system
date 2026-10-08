export function createWalletRepository({client}) {
  return {
    list({signal} = {}) { return client.request('/wallet', {method: 'GET', signal}); },
    charge(input) { return client.request('/wallet/charges', {method: 'POST', body: input}); },
    refund(input) { return client.request('/wallet/refunds', {method: 'POST', body: input}); },
  };
}
