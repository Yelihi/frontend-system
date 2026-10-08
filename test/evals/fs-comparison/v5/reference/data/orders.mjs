export function createRepository({client}) {
  return {
    list({signal} = {}) { return client.request('/orders', {method: 'GET', signal}); },
    place(input) { return client.request('/orders', {method: 'POST', body: input}); },
  };
}
