let pending = false;
export function createOrderSubmitter(send, changed) {
  return async quantity => {
    if (pending) return true;
    pending = true;
    changed({ pending: true, error: '', submitted: false });
    try {
      await send(quantity);
      pending = false;
      changed({ pending: false, error: '', submitted: true });
      return true;
    } catch (error) {
      changed({ pending: false, error: error.message, submitted: false });
      return false;
    }
  };
}
