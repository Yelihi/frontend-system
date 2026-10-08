import {createResource} from '../shared/resource.mjs';
import {quote} from '../domain/order.mjs';
export function createOrders({repository, session}) {
  const resource = createResource({read: options => repository.list(options), session});
  return {
    ...resource,
    async create(input) { const pricing = quote(input); return repository.create({...input, pricing}); },
    cancel(id) { return repository.cancel(id); },
  };
}
