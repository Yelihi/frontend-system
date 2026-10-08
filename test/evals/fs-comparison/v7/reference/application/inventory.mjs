import {createResource} from '../shared/resource.mjs';
import {validateReservation} from '../domain/inventory.mjs';
export function createInventory({repository, session}) {
  const resource = createResource({read: options => repository.list(options), session});
  return {
    ...resource,
    async reserve(input) { validateReservation(input); return repository.reserve({...input}); },
    release(id) { return repository.release(id); },
    restock(input) { return repository.restock(input); },
  };
}
