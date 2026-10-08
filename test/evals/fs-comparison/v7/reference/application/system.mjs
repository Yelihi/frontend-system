import {createSession} from '../shared/session.mjs';
import {createClient} from '../shared/http.mjs';
import {createInflight} from '../shared/inflight.mjs';
import {createOrderRepository} from '../data/orders.mjs';
import {createInventoryRepository} from '../data/inventory.mjs';
import {createReturnRepository} from '../data/returns.mjs';
import {createWalletRepository} from '../data/wallet.mjs';
import {createOrders} from './orders.mjs';
import {createInventory} from './inventory.mjs';
import {createReturns} from './returns.mjs';
import {createWallet} from './wallet.mjs';
import {createCheckout} from './checkout.mjs';
import {createRefundFlow} from './refund.mjs';
export function createSystem({transport, onUnauthorized, initialToken = null}) {
  const session = createSession(initialToken);
  const client = createClient({transport, onUnauthorized, session});
  const inflight = createInflight();
  const orders = createOrders({repository: createOrderRepository({client}), session});
  const inventory = createInventory({repository: createInventoryRepository({client}), session});
  const returns = createReturns({repository: createReturnRepository({client}), session});
  const wallet = createWallet({repository: createWalletRepository({client}), session});
  const checkout = createCheckout({orders, inventory, wallet, inflight});
  const refund = createRefundFlow({returns, inventory, wallet, inflight});
  function switchToken(token) {
    session.setToken(token);
    for (const resource of [orders, inventory, returns, wallet]) resource.reset();
  }
  return {orders, inventory, returns, wallet, checkout, refund, login: token => switchToken(token), logout: () => switchToken(null)};
}
