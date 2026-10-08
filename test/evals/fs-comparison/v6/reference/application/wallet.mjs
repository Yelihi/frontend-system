import {createResource} from '../shared/resource.mjs';
import {validateDebit} from '../domain/wallet.mjs';
export function createWallet({repository, session}) {
  const resource = createResource({read: options => repository.list(options), session});
  return {
    ...resource,
    async charge(input) {
      validateDebit(input);
      const {balance, ...body} = input;
      return repository.charge(body);
    },
    refund(input) { return repository.refund(input); },
  };
}
