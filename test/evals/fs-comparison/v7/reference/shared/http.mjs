export function createClient({transport, onUnauthorized, session}) {
  return {
    async request(path, options = {}) {
      const ticket = session.capture();
      const headers = {...options.headers};
      delete headers.Authorization;
      if (ticket.token !== null) headers.Authorization = `Bearer ${ticket.token}`;
      const response = await transport(path, {...options, headers, credentials: 'same-origin'});
      if (!session.isCurrent(ticket)) throw Object.assign(new Error('Session changed'), {code: 'stale-session'});
      if (response.status === 401) {
        onUnauthorized();
        throw Object.assign(new Error('Authentication required'), {code: 'unauthorized'});
      }
      if (response.status >= 400) throw Object.assign(new Error('Request rejected'), {
        code: 'http-error', status: response.status, data: response.data,
      });
      return response.data;
    },
  };
}
