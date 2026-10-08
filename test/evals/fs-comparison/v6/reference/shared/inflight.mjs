export function createInflight() {
  const pending = new Map();
  return {
    run(key, task) {
      if (pending.has(key)) return pending.get(key);
      const promise = Promise.resolve().then(task);
      pending.set(key, promise);
      const clear = () => { if (pending.get(key) === promise) pending.delete(key); };
      promise.then(clear, clear);
      return promise;
    },
  };
}
