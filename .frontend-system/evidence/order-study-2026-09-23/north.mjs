export function createOrderSubmitter(send, changed) {
  let pending = false;
  return async quantity => {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error('Quantity must be a positive finite integer');
    }
    if (pending) return false;
    pending = true;
    changed({ pending: true, error: '', submitted: false });
    try {
      await send(quantity);
      pending = false;
      changed({ pending: false, error: '', submitted: true });
      return true;
    } catch (error) {
      pending = false;
      changed({ pending: false, error: error instanceof Error ? error.message : 'Order failed', submitted: false });
      return false;
    }
  };
}
