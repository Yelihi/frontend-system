export function createClient({transport, onUnauthorized}) {
  return {async request(path, options = {}) {
    const response = await transport(path, {...options, headers: {...options.headers}, credentials: 'same-origin'});
    if (response.status === 401) {
      onUnauthorized();
      throw Object.assign(new Error('Authentication required'), {code: 'unauthorized'});
    }
    if (response.status >= 400) throw Object.assign(new Error('Request rejected'), {code: 'http-error', status: response.status, data: response.data});
    return response.data;
  }};
}
