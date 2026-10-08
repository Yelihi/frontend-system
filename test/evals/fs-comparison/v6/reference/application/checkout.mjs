import {quote} from '../domain/order.mjs';
import {validateReservation} from '../domain/inventory.mjs';
import {validateDebit} from '../domain/wallet.mjs';
export function createCheckout({orders, inventory, wallet, inflight}) {
  return {
    submit(input) {
      return inflight.run(`checkout:${input.requestId}`, async () => {
        const pricing = quote(input.order);
        if (typeof input.requestId !== 'string' || !input.requestId ||
            !Array.isArray(input.reservations) || input.reservations.length !== input.order.lines.length) {
          throw Object.assign(new Error('Invalid checkout'), {code: 'invalid-checkout'});
        }
        input.reservations.forEach((entry, index) => {
          validateReservation(entry);
          const line = input.order.lines[index];
          if (entry.sku !== line.sku || entry.quantity !== line.quantity) {
            throw Object.assign(new Error('Reservation mismatch'), {code: 'invalid-checkout'});
          }
        });
        validateDebit({...input.payment, amount: pricing.total});
        const reservations = [];
        let order;
        try {
          for (const entry of input.reservations) reservations.push(await inventory.reserve(entry));
          order = await orders.create(input.order);
          const charge = await wallet.charge({...input.payment, amount: pricing.total, orderId: order.id, requestId: input.requestId});
          return {order, charge, reservations};
        } catch (cause) {
          const cleanupErrors = [];
          if (order) { try { await orders.cancel(order.id); } catch (error) { cleanupErrors.push(error); } }
          for (const reservation of [...reservations].reverse()) {
            try { await inventory.release(reservation.id); } catch (error) { cleanupErrors.push(error); }
          }
          if (cleanupErrors.length) throw Object.assign(new Error('Checkout compensation failed'), {
            code: 'checkout-compensation', cause, cleanupErrors,
          });
          throw cause;
        }
      });
    },
  };
}
