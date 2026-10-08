export function createOrderRepository({client}) {
  return {
    list({signal} = {}) { return client.request('/orders', {method: 'GET', signal}); },
    create(input) { return client.request('/orders', {method: 'POST', body: input}); },
    cancel(id) { return client.request(`/orders/${encodeURIComponent(id)}/cancel`, {method: 'POST'}); },
  };
}
