export function createRefundFlow({returns, wallet, inventory, inflight}) {
  return {
    submit(input) {
      return inflight.run(`refund:${input.requestId}`, async () => {
        if (typeof input.requestId !== 'string' || !input.requestId) {
          throw Object.assign(new Error('Invalid return request'), {code: 'invalid-return'});
        }
        const record = await returns.create(input.returnRequest);
        const refund = await wallet.refund({returnId: record.id, amount: record.refund, currency: 'KRW', metadata: input.returnRequest.metadata});
        try {
          await inventory.restock({sku: input.returnRequest.sku, quantity: input.returnRequest.quantity, returnId: record.id});
          return {record, refund, restockPending: false, restockError: null};
        } catch (restockError) {
          return {record, refund, restockPending: true, restockError};
        }
      });
    },
  };
}
