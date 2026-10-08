export function createOrders({repository, quote}) {
  let state = {items: [], status: 'idle', error: null};
  let generation = 0;
  return {
    getState() { return {...state, items: [...state.items]}; },
    async load(options) {
      const current = ++generation;
      state = {...state, status: 'loading', error: null};
      try {
        const items = await repository.list(options);
        if (current === generation) state = {items: [...items], status: 'ready', error: null};
      } catch (error) {
        if (current === generation) state = {...state, status: 'error', error};
      }
    },
    async submit(input) {
      const total = quote(input);
      return repository.place({...input, total});
    },
  };
}
