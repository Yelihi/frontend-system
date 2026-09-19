/**
 * @param {(quantity: number) => Promise<void>} send
 * @param {(state: {pending: boolean, error: string, submitted: boolean}) => void} changed
 */
export function createOrderSubmitter(send, changed) {
  let pending = false;
  return async (/** @type {number} */ quantity) => {
    if (pending) return false;
    if (!Number.isInteger(quantity) || quantity <= 0) throw new Error('Quantity must be a positive integer');
    pending = true;
    changed({ pending: true, error: '', submitted: false });
    try {
      await send(quantity);
      changed({ pending: false, error: '', submitted: true });
      return true;
    } catch (error) {
      changed({ pending: false, error: error instanceof Error ? error.message : 'Order failed', submitted: false });
      return false;
    } finally {
      pending = false;
    }
  };
}
