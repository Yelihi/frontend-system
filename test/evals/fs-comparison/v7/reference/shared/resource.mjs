export function createResource({read, session}) {
  let state = {items: [], status: 'idle', error: null};
  let generation = 0;
  return {
    getState() { return {...state, items: [...state.items]}; },
    reset() { generation += 1; state = {items: [], status: 'idle', error: null}; },
    async load(options) {
      const current = ++generation;
      const ticket = session.capture();
      state = {...state, status: 'loading', error: null};
      try {
        const items = await read(options);
        if (current === generation && session.isCurrent(ticket)) {
          state = {items: [...items], status: 'ready', error: null};
        }
      } catch (error) {
        if (current === generation && session.isCurrent(ticket)) state = {...state, status: 'error', error};
      }
    },
  };
}
