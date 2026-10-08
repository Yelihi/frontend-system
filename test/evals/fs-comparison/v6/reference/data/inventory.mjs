export function createInventoryRepository({client}) {
  return {
    list({signal} = {}) { return client.request('/inventory', {method: 'GET', signal}); },
    reserve(input) { return client.request('/inventory/reservations', {method: 'POST', body: input}); },
    release(id) { return client.request(`/inventory/reservations/${encodeURIComponent(id)}`, {method: 'DELETE'}); },
    restock(input) { return client.request('/inventory/restocks', {method: 'POST', body: input}); },
  };
}
