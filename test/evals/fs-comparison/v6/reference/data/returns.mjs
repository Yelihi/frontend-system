export function createReturnRepository({client}) {
  return {
    list({signal} = {}) { return client.request('/returns', {method: 'GET', signal}); },
    create(input) { return client.request('/returns', {method: 'POST', body: input}); },
  };
}
