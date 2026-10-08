import {createResource} from '../shared/resource.mjs';
import {canReturn, refundAmount} from '../domain/returns.mjs';
export function createReturns({repository, session}) {
  const resource = createResource({read: options => repository.list(options), session});
  return {
    ...resource,
    async create(input) {
      if (!canReturn(input)) throw Object.assign(new Error('Return window expired'), {code: 'return-window'});
      const refund = refundAmount(input);
      return repository.create({...input, refund});
    },
  };
}
