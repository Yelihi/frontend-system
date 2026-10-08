import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import vm from 'node:vm';

// SPEC is injected by the controller. This program only runs in restricted().
const project = resolve(process.argv[2]);
const results = [];
async function check(id, fn) {
  try { await fn(); results.push({id, status: 'passed'}); }
  catch (error) { results.push({id, status: 'failed', reason: String(error.message).slice(0, 1500)}); }
}
const load = file => import(pathToFileURL(join(project, file)).href);
const fn = async (file, name) => (await load(file))[name];
const keys = value => Object.keys(value).sort();
const failure = code => error => error.code === code;
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return {promise, resolve, reject};
};
const session = async token => (await fn('shared/session.mjs', 'createSession'))(token);
const resource = async read => (await fn('shared/resource.mjs', 'createResource'))({read, session: await session()});
const inflight = async () => (await fn('shared/inflight.mjs', 'createInflight'))();
const orderInput = () => ({kind: 'purchase', lines: [{sku: 'A', quantity: 1, price: 1000}, {sku: 'B', quantity: 2, price: 500}]});
const checkoutInput = () => ({requestId: 'same-key', order: orderInput(),
  reservations: [{sku: 'A', quantity: 1, available: 5}, {sku: 'B', quantity: 2, available: 4}],
  payment: {balance: 5000, currency: 'KRW', metadata: {source: 'operator'}}});
const returnInput = () => ({requestId: 'same-key', returnRequest: {sku: 'A', quantity: 1, totalQuantity: 3,
  paid: 1000, kind: 'purchase', reason: 'damaged', deliveredAt: 0, now: 86400000, metadata: {note: 'keep'}}});
function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value); for (const child of Object.values(value)) freeze(child);
  }
  return value;
}

await check('F01-public-module-exports', async () => {
  for (const [file, names] of Object.entries(SPEC.exports)) {
    if (file.endsWith('.jsx')) continue;
    const exports = await load(file);
    assert.deepEqual(keys(exports), [...names].sort(), file);
    for (const name of names) assert.equal(typeof exports[name], 'function', `${file}:${name}`);
  }
});
await check('F02-public-factory-surfaces', async () => {
  const factories = [
    ['shared/session.mjs', 'createSession', undefined, ['capture', 'isCurrent', 'setToken']],
    ['shared/http.mjs', 'createClient', {}, ['request']],
    ['shared/resource.mjs', 'createResource', {}, ['getState', 'load', 'reset']],
    ['shared/inflight.mjs', 'createInflight', undefined, ['run']],
    ['data/orders.mjs', 'createOrderRepository', {}, ['list', 'create', 'cancel']],
    ['data/inventory.mjs', 'createInventoryRepository', {}, ['list', 'reserve', 'release', 'restock']],
    ['data/returns.mjs', 'createReturnRepository', {}, ['list', 'create']],
    ['data/wallet.mjs', 'createWalletRepository', {}, ['list', 'charge', 'refund']],
    ['application/orders.mjs', 'createOrders', {}, ['getState', 'load', 'reset', 'create', 'cancel']],
    ['application/inventory.mjs', 'createInventory', {}, ['getState', 'load', 'reset', 'reserve', 'release', 'restock']],
    ['application/returns.mjs', 'createReturns', {}, ['getState', 'load', 'reset', 'create']],
    ['application/wallet.mjs', 'createWallet', {}, ['getState', 'load', 'reset', 'charge', 'refund']],
    ['application/checkout.mjs', 'createCheckout', {}, ['submit']],
    ['application/refund.mjs', 'createRefundFlow', {}, ['submit']],
    ['application/system.mjs', 'createSystem', {}, ['orders', 'inventory', 'returns', 'wallet', 'checkout', 'refund', 'login', 'logout']],
  ];
  for (const [file, name, args, expected] of factories) {
    assert.deepEqual(keys((await fn(file, name))(args)), expected.sort(), file);
  }
});
await check('F03-session-snapshot-isolation', async () => {
  const a = await session('a'); const before = a.capture(); before.token = 'external';
  assert.equal(a.capture().token, 'a'); assert.notEqual(before, a.capture());
  a.setToken('b'); assert.deepEqual(a.capture(), {token: 'b', epoch: 1}); assert.equal(a.isCurrent(before), false);
  const b = await session(); assert.deepEqual(b.capture(), {token: null, epoch: 0});
});
await check('F04-session-equal-token-is-new-generation', async () => {
  const s = await session('a'), ticket = s.capture(); s.setToken('a');
  assert.equal(s.isCurrent(ticket), false); assert.equal(s.capture().epoch, 1);
});
await check('F05-http-copy-credentials-identity', async () => {
  const create = await fn('shared/http.mjs', 'createClient');
  const body = freeze({nested: {id: 1}}), signal = new AbortController().signal;
  const options = Object.freeze({method: 'POST', body, signal, headers: Object.freeze({x: 'keep'})});
  let calls = 0;
  const client = create({session: await session(), onUnauthorized: () => assert.fail(), transport: async (path, actual) => {
    calls++; assert.equal(path, '/orders'); assert.notEqual(actual, options); assert.notEqual(actual.headers, options.headers);
    assert.equal(actual.body, body); assert.equal(actual.signal, signal); assert.equal(actual.credentials, 'same-origin');
    assert.deepEqual(actual.headers, options.headers); return {status: 299, data: body};
  }});
  assert.equal(await client.request('/orders', options), body); assert.equal(calls, 1);
});
await check('F06-http-session-header-ownership', async () => {
  const create = await fn('shared/http.mjs', 'createClient');
  for (const token of [null, 'new-token']) {
    const headers = Object.freeze({Authorization: 'caller', x: 'keep'});
    const client = create({session: await session(token), onUnauthorized() {}, transport: async (_, options) => {
      assert.equal(options.headers.x, 'keep');
      if (token === null) assert.equal(Object.hasOwn(options.headers, 'Authorization'), false);
      else assert.equal(options.headers.Authorization, 'Bearer new-token');
      return {status: 200, data: true};
    }});
    await client.request('/', {headers}); assert.equal(headers.Authorization, 'caller');
  }
});
await check('F07-http-error-classification-no-retry', async () => {
  const create = await fn('shared/http.mjs', 'createClient');
  for (const status of [200, 399, 401, 409, 503]) {
    let calls = 0, auth = 0; const data = {};
    const client = create({session: await session(), onUnauthorized() { auth++; }, transport: async () => { calls++; return {status, data}; }});
    if (status < 400) assert.equal(await client.request('/'), data);
    else await assert.rejects(client.request('/'), error => status === 401 ? error.code === 'unauthorized' : error.code === 'http-error' && error.status === status && error.data === data);
    assert.equal(calls, 1); assert.equal(auth, status === 401 ? 1 : 0);
  }
});
await check('F08-http-transport-failure-identity', async () => {
  const original = new Error('offline'); let calls = 0;
  const client = (await fn('shared/http.mjs', 'createClient'))({session: await session(), onUnauthorized() { assert.fail(); }, transport: async () => { calls++; throw original; }});
  await assert.rejects(client.request('/'), error => error === original); assert.equal(calls, 1);
});
await check('Q1-auth-callback-failure', async () => {
  const original = new Error('callback'); let calls = 0;
  const client = (await fn('shared/http.mjs', 'createClient'))({session: await session(), transport: async () => ({status: 401}), onUnauthorized() { calls++; throw original; }});
  await assert.rejects(client.request('/'), error => error === original); assert.equal(calls, 1);
});
await check('F09-resource-initial-loading-options', async () => {
  const pending = deferred(), options = {signal: new AbortController().signal}; let calls = 0;
  const store = await resource(actual => { calls++; assert.equal(actual, options); return pending.promise; });
  assert.deepEqual(store.getState(), {items: [], status: 'idle', error: null});
  const load = store.load(options); assert.equal(store.getState().status, 'loading');
  pending.resolve([]); assert.equal(await load, undefined); assert.equal(calls, 1); assert.equal(store.getState().status, 'ready');
});
for (const staleFailure of [false, true]) await check(staleFailure ? 'F11-resource-stale-failure' : 'F10-resource-stale-success', async () => {
  const first = deferred(), second = deferred(); let calls = 0;
  const store = await resource(() => ++calls === 1 ? first.promise : second.promise);
  const a = store.load(), b = store.load(); second.resolve([{id: 'new'}]); await b;
  if (staleFailure) first.reject(new Error('old')); else first.resolve([{id: 'old'}]);
  assert.equal(await a, undefined); assert.deepEqual(store.getState(), {items: [{id: 'new'}], status: 'ready', error: null});
});
await check('F12-resource-array-ownership', async () => {
  const row = {id: 'original'}, rows = [row], store = await resource(async () => rows);
  await store.load(); rows.push({id: 'foreign'}); const first = store.getState(); first.items.push({id: 'injected'}); first.status = 'wrong';
  const second = store.getState(); assert.equal(second.items.length, 1); assert.equal(second.items[0], row); assert.equal(second.status, 'ready');
  assert.notEqual(first, second); assert.notEqual(first.items, second.items);
});
await check('F13-resource-reset-invalidates-pending', async () => {
  const pending = deferred(), store = await resource(() => pending.promise);
  const load = store.load(); store.reset(); pending.resolve([{id: 'late'}]); await load;
  assert.deepEqual(store.getState(), {items: [], status: 'idle', error: null});
});
await check('Q2-refresh-failure-items', async () => {
  const original = new Error('latest'); let calls = 0;
  const store = await resource(async () => { if (calls++) throw original; return [{id: 'kept'}]; });
  await store.load(); assert.equal(await store.load(), undefined);
  assert.deepEqual(store.getState(), {items: [{id: 'kept'}], status: 'error', error: original});
});
await check('F14-inflight-independent-keys-and-results', async () => {
  const map = await inflight(), a = deferred(), b = deferred(), one = {}, two = {};
  const first = map.run('a', () => a.promise), second = map.run('b', () => b.promise);
  assert.notEqual(first, second); b.resolve(two); a.resolve(one);
  assert.equal(await first, one); assert.equal(await second, two);
});
await check('F15-inflight-clears-success', async () => {
  const map = await inflight(); let calls = 0;
  const a = map.run('a', () => ++calls); assert.equal(await a, 1);
  const b = map.run('a', () => ++calls); assert.notEqual(a, b); assert.equal(await b, 2);
});
await check('F16-inflight-clears-rejection-and-sync-throw', async () => {
  const map = await inflight(), original = new Error('sync');
  const first = map.run('a', () => { throw original; });
  await assert.rejects(first, error => error === original); assert.equal(await map.run('a', () => 2), 2);
});
await check('Q5-inflight-duplicate', async () => {
  const map = await inflight(), pending = deferred(); let calls = 0;
  const first = map.run('a', () => { calls++; return pending.promise; });
  const second = map.run('a', () => { assert.fail('duplicate task'); });
  assert.equal(first, second); await Promise.resolve(); assert.equal(calls, 1); pending.resolve(3); assert.equal(await second, 3);
});
await check('F17-promotion-purchase-tier-cap', async () => {
  const discount = await fn('domain/promotion.mjs', 'discount');
  assert.equal(discount({kind: 'purchase', tier: 'vip', subtotal: 999, coupon: 'SAVE'}), 299);
  assert.equal(discount({kind: 'purchase', tier: 'vip', subtotal: 10000, coupon: 'SAVE'}), 700);
  assert.equal(discount({kind: 'purchase', tier: 'guest', subtotal: 100, coupon: 'SAVE'}), 100);
});
await check('F18-promotion-gift-isolation', async () => {
  const discount = await fn('domain/promotion.mjs', 'discount');
  assert.equal(discount({kind: 'gift', tier: 'vip', subtotal: 9000, coupon: ''}), 0);
  assert.equal(discount({kind: 'purchase', tier: 'guest', subtotal: 9000, coupon: ''}), 0);
});
await check('F19-shipping-threshold-and-remote', async () => {
  const shipping = await fn('domain/shipping.mjs', 'shipping');
  for (const [subtotal, region, expected] of [[4999, 'local', 300], [5000, 'local', 0], [9000, 'remote', 700]]) {
    assert.equal(shipping({kind: 'purchase', region, subtotal}), expected);
  }
  assert.equal(shipping({kind: 'gift', region: 'remote', subtotal: 0}), 0);
});
await check('F20-quote-composition-and-ownership', async () => {
  const quote = await fn('domain/order.mjs', 'quote'), input = freeze({...orderInput(), tier: 'vip', coupon: 'SAVE', credit: 200});
  assert.deepEqual(quote(input), {subtotal: 2000, discount: 400, shipping: 300, creditUsed: 200, total: 1700});
  assert.notEqual(quote(input), quote(input)); assert.equal(Object.hasOwn(input, 'total'), false);
});
await check('F21-quote-rejects-invalid-lines-and-kinds', async () => {
  const quote = await fn('domain/order.mjs', 'quote');
  const invalid = [[], [{sku: 'A', quantity: '1', price: 1}], [{sku: '', quantity: 1, price: 1}],
    [{sku: 'A', quantity: 1.5, price: 1}], [{sku: 'A', quantity: 11, price: 1}], [{sku: 'A', quantity: 1, price: -1}],
    [{sku: 'A', quantity: 1, price: 1}, {sku: 'A', quantity: 2, price: 2}], Array.from({length: 21}, (_, i) => ({sku: String(i), quantity: 1, price: 1}))];
  for (const lines of invalid) assert.throws(() => quote({kind: 'purchase', lines}), failure('invalid-order'));
  for (const extra of [{kind: 'x'}, {tier: 'member'}, {region: 'x'}, {coupon: 'FREE'}, {credit: '1'}, {credit: -1}]) {
    assert.throws(() => quote({...orderInput(), ...extra}), failure('invalid-order'));
  }
});
await check('F22-quote-gift-does-not-inherit-purchase', async () => {
  const quote = await fn('domain/order.mjs', 'quote');
  assert.throws(() => quote({...orderInput(), kind: 'gift', coupon: 'SAVE'}), failure('invalid-order'));
  assert.deepEqual(quote({...orderInput(), kind: 'gift', tier: 'vip', region: 'remote'}),
    {subtotal: 2000, discount: 0, shipping: 0, creditUsed: 0, total: 2000});
});
await check('Q6-credit-scope', async () => {
  const quote = await fn('domain/order.mjs', 'quote');
  const value = quote({...orderInput(), region: 'remote', coupon: 'SAVE', credit: 99999});
  assert.equal(value.creditUsed, 1800); assert.equal(value.shipping, 700); assert.equal(value.total, 700);
});
await check('F23-reservation-validation-and-ownership', async () => {
  const validate = await fn('domain/inventory.mjs', 'validateReservation');
  const input = freeze({sku: 'A', quantity: 2, available: 2}); assert.deepEqual(validate(input), {sku: 'A', quantity: 2});
  for (const extra of [{sku: ''}, {quantity: 0}, {quantity: '1'}, {quantity: 1.5}, {available: -1}, {available: '2'}]) {
    assert.throws(() => validate({...input, ...extra}), failure('invalid-inventory'));
  }
});
await check('Q7-stock-shortage', async () => {
  const validate = await fn('domain/inventory.mjs', 'validateReservation');
  assert.throws(() => validate({sku: 'A', quantity: 2, available: 1}), failure('out-of-stock'));
});
await check('F24-return-window-boundaries', async () => {
  const canReturn = await fn('domain/returns.mjs', 'canReturn');
  for (const [reason, days] of [['damaged', 30], ['changed-mind', 7]]) {
    assert.equal(canReturn({reason, deliveredAt: 100, now: 100 + days * 86400000}), true);
    assert.equal(canReturn({reason, deliveredAt: 100, now: 101 + days * 86400000}), false);
  }
  for (const extra of [{now: -1}, {now: '1'}, {reason: 'unknown'}, {deliveredAt: 1.5}]) {
    assert.equal(canReturn({reason: 'damaged', deliveredAt: 0, now: 1, ...extra}), false);
  }
});
await check('F25-refund-proration-and-gift-policy', async () => {
  const amount = await fn('domain/returns.mjs', 'refundAmount'), input = returnInput().returnRequest;
  assert.equal(amount(freeze(input)), 333);
  assert.equal(amount({...input, kind: 'gift'}), 0);
  assert.throws(() => amount({...input, kind: 'gift', reason: 'changed-mind'}), failure('invalid-return'));
});
await check('F26-refund-invalid-inputs', async () => {
  const amount = await fn('domain/returns.mjs', 'refundAmount');
  for (const extra of [{paid: -1}, {paid: '1'}, {quantity: 0}, {quantity: 4}, {totalQuantity: 11}, {quantity: 1.5}, {kind: 'x'}, {reason: 'x'}]) {
    assert.throws(() => amount({...returnInput().returnRequest, ...extra}), failure('invalid-return'));
  }
});
await check('F27-debit-currency-integer-validation', async () => {
  const validate = await fn('domain/wallet.mjs', 'validateDebit');
  assert.deepEqual(validate(freeze({balance: 100, amount: 100, currency: 'KRW'})), {amount: 100, currency: 'KRW'});
  for (const extra of [{currency: 'USD'}, {balance: -1}, {amount: -1}, {amount: '1'}, {amount: 0.5}]) {
    assert.throws(() => validate({balance: 100, amount: 1, currency: 'KRW', ...extra}), failure('invalid-payment'));
  }
});
await check('F28-debit-balance-boundary', async () => {
  const validate = await fn('domain/wallet.mjs', 'validateDebit');
  assert.throws(() => validate({balance: 10, amount: 11, currency: 'KRW'}), failure('insufficient-balance'));
  assert.deepEqual(validate({balance: 0, amount: 0, currency: 'KRW'}), {amount: 0, currency: 'KRW'});
});

const repositories = [
  ['orders', 'createOrderRepository', {create: ['/orders', 'POST'], cancel: ['/orders/a%2Fb/cancel', 'POST', 'id']}],
  ['inventory', 'createInventoryRepository', {reserve: ['/inventory/reservations', 'POST'], release: ['/inventory/reservations/a%2Fb', 'DELETE', 'id'], restock: ['/inventory/restocks', 'POST']}],
  ['returns', 'createReturnRepository', {create: ['/returns', 'POST']}],
  ['wallet', 'createWalletRepository', {charge: ['/wallet/charges', 'POST'], refund: ['/wallet/refunds', 'POST']}],
];
for (const [index, [area, factory, methods]] of repositories.entries()) await check(`F${29 + index}-${area}-repository-boundary`, async () => {
  const calls = [], result = {}, body = freeze({metadata: {id: 1}}), signal = new AbortController().signal;
  const create = await fn(`data/${area}.mjs`, factory);
  const repository = create({client: {request(...args) { calls.push(args); return Promise.resolve(result); }}});
  assert.equal(await repository.list({signal}), result); assert.deepEqual(calls.shift(), [`/${area}`, {method: 'GET', signal}]);
  for (const [method, [path, verb, mode]] of Object.entries(methods)) {
    assert.equal(await repository[method](mode === 'id' ? 'a/b' : body), result);
    const actual = calls.shift(); assert.deepEqual(actual, [path, {method: verb, ...(mode === 'id' ? {} : {body})}]);
    if (mode !== 'id') assert.equal(actual[1].body, body);
  }
  assert.equal(calls.length, 0);
  const original = new Error('repository'); const broken = create({client: {request() { return Promise.reject(original); }}});
  await assert.rejects(broken.list(), error => error === original);
});
const services = [['orders', 'createOrders'], ['inventory', 'createInventory'], ['returns', 'createReturns'], ['wallet', 'createWallet']];
await check('F33-service-resource-isolation', async () => {
  const s = await session(), stores = [];
  for (const [area, name] of services) {
    const service = (await fn(`application/${area}.mjs`, name))({session: s, repository: {list: async () => [{id: area}]}});
    await service.load(); stores.push(service);
  }
  stores[0].reset(); assert.equal(stores[0].getState().items.length, 0);
  assert.deepEqual(stores.slice(1).map(store => store.getState().items[0].id), ['inventory', 'returns', 'wallet']);
});
await check('F34-order-service-pricing-and-input', async () => {
  const input = freeze({...orderInput(), metadata: {id: 1}}), result = {}; let calls = 0;
  const create = await fn('application/orders.mjs', 'createOrders');
  const service = create({session: await session(), repository: {create: async body => {
    calls++; assert.notEqual(body, input); assert.equal(body.lines, input.lines); assert.equal(body.metadata, input.metadata);
    assert.equal(body.pricing.total, 2300); return result;
  }}});
  assert.equal(await service.create(input), result); assert.equal(calls, 1);
  await assert.rejects(service.create({...input, kind: 'bad'}), failure('invalid-order')); assert.equal(calls, 1);
  assert.equal(service.getState().status, 'idle');
});
await check('F35-inventory-service-prevalidation-and-copy', async () => {
  const input = freeze({sku: 'A', quantity: 1, available: 2, metadata: {id: 1}}), result = {}; let calls = 0;
  const service = (await fn('application/inventory.mjs', 'createInventory'))({session: await session(), repository: {reserve: async body => {
    calls++; assert.notEqual(body, input); assert.equal(body.metadata, input.metadata); return result;
  }}});
  assert.equal(await service.reserve(input), result);
  await assert.rejects(service.reserve({...input, quantity: 3}), failure('out-of-stock')); assert.equal(calls, 1);
});
await check('F36-return-service-window-before-persistence', async () => {
  const input = freeze(returnInput().returnRequest), result = {}; let calls = 0;
  const service = (await fn('application/returns.mjs', 'createReturns'))({session: await session(), repository: {create: async body => {
    calls++; assert.notEqual(body, input); assert.equal(body.metadata, input.metadata); assert.equal(body.refund, 333); return result;
  }}});
  assert.equal(await service.create(input), result);
  await assert.rejects(service.create({...input, now: 31 * 86400000}), failure('return-window')); assert.equal(calls, 1);
});
await check('F37-wallet-service-private-balance-ownership', async () => {
  const input = freeze({balance: 10, amount: 2, currency: 'KRW', metadata: {id: 1}}), result = {}; let calls = 0;
  const service = (await fn('application/wallet.mjs', 'createWallet'))({session: await session(), repository: {charge: async body => {
    calls++; assert.notEqual(body, input); assert.equal(Object.hasOwn(body, 'balance'), false); assert.equal(body.metadata, input.metadata); return result;
  }}});
  assert.equal(await service.charge(input), result); assert.equal(input.balance, 10);
  await assert.rejects(service.charge({...input, amount: 11}), failure('insufficient-balance')); assert.equal(calls, 1);
});
await check('F38-service-delegation-error-identity', async () => {
  const original = new Error('port'), result = {}, calls = [];
  for (const [area, name, method, input] of [
    ['orders', 'createOrders', 'cancel', 'id'], ['inventory', 'createInventory', 'release', 'id'],
    ['inventory', 'createInventory', 'restock', {sku: 'A'}], ['wallet', 'createWallet', 'refund', {amount: 2}],
  ]) {
    const create = await fn(`application/${area}.mjs`, name);
    const service = create({session: await session(), repository: {[method]: actual => { calls.push(actual); return Promise.resolve(result); }}});
    assert.equal(await service[method](input), result); assert.equal(calls.pop(), input);
    const broken = create({session: await session(), repository: {[method]: async () => { throw original; }}});
    await assert.rejects(broken[method](input), error => error === original);
  }
});

async function checkoutHarness(overrides = {}, map) {
  const events = [], order = {id: 'order-1'}, charge = {id: 'charge-1'}, reservations = [];
  const ports = {
    inventory: {async reserve(input) { events.push(['reserve', input]); const result = {id: `r${reservations.length}`}; reservations.push(result); return result; },
      async release(id) { events.push(['release', id]); }},
    orders: {async create(input) { events.push(['create', input]); return order; }, async cancel(id) { events.push(['cancel', id]); }},
    wallet: {async charge(input) { events.push(['charge', input]); return charge; }},
  };
  for (const [area, methods] of Object.entries(overrides)) Object.assign(ports[area], methods(events));
  const api = (await fn('application/checkout.mjs', 'createCheckout'))({...ports, inflight: map ?? await inflight()});
  return {api, events, order, charge, reservations};
}
await check('F39-checkout-order-total-and-reference-ownership', async () => {
  const h = await checkoutHarness(), input = freeze(checkoutInput()), result = await h.api.submit(input);
  assert.deepEqual(h.events.map(item => item[0]), ['reserve', 'reserve', 'create', 'charge']);
  assert.equal(h.events[0][1], input.reservations[0]); assert.equal(h.events[2][1], input.order);
  const payment = h.events[3][1]; assert.notEqual(payment, input.payment); assert.equal(payment.amount, 2300);
  assert.equal(payment.metadata, input.payment.metadata); assert.equal(payment.orderId, h.order.id); assert.equal(payment.requestId, input.requestId);
  assert.equal(result.order, h.order); assert.equal(result.charge, h.charge); assert.equal(result.reservations[0], h.reservations[0]);
});
await check('F40-checkout-validates-all-before-side-effects', async () => {
  for (const mutate of [input => { input.payment.balance = 0; }, input => { input.reservations[1].available = 0; },
    input => { input.requestId = ''; }, input => { input.reservations.pop(); }, input => { input.reservations[0].sku = 'wrong'; },
    input => { input.order.kind = 'unknown'; }]) {
    const input = checkoutInput(); mutate(input); const h = await checkoutHarness();
    await assert.rejects(h.api.submit(input)); assert.equal(h.events.length, 0);
  }
});
await check('F41-checkout-partial-reservation-compensation', async () => {
  const original = new Error('reserve'); let calls = 0;
  const h = await checkoutHarness({inventory: events => ({async reserve(input) {
    events.push(['reserve', input]); if (calls++) throw original; return {id: 'first'};
  }})});
  await assert.rejects(h.api.submit(checkoutInput()), error => error === original);
  assert.deepEqual(h.events.map(item => item[0]), ['reserve', 'reserve', 'release']); assert.equal(h.events[2][1], 'first');
});
await check('F42-checkout-order-failure-reverse-release', async () => {
  const original = new Error('order');
  const h = await checkoutHarness({orders: events => ({async create() { events.push(['create']); throw original; }})});
  await assert.rejects(h.api.submit(checkoutInput()), error => error === original);
  assert.deepEqual(h.events.slice(2), [['create'], ['release', 'r1'], ['release', 'r0']]);
});
await check('F43-checkout-charge-failure-cancel-before-release', async () => {
  const original = new Error('charge');
  const h = await checkoutHarness({wallet: events => ({async charge() { events.push(['charge']); throw original; }})});
  await assert.rejects(h.api.submit(checkoutInput()), error => error === original);
  assert.deepEqual(h.events.slice(3), [['charge'], ['cancel', 'order-1'], ['release', 'r1'], ['release', 'r0']]);
});
await check('Q3-compensation-failure', async () => {
  const original = Object.freeze(new Error('primary')), cancel = Object.freeze(new Error('cancel')), release = Object.freeze(new Error('release'));
  const h = await checkoutHarness({wallet: () => ({async charge() { throw original; }}),
    orders: events => ({async cancel(id) { events.push(['cancel', id]); throw cancel; }}),
    inventory: events => ({async release(id) { events.push(['release', id]); if (id === 'r1') throw release; }})});
  await assert.rejects(h.api.submit(checkoutInput()), error => {
    assert.notEqual(error, original); assert.equal(error.code, 'checkout-compensation'); assert.equal(error.cause, original);
    assert.deepEqual(error.cleanupErrors, [cancel, release]); return true;
  });
  assert.deepEqual(h.events.slice(-3), [['cancel', 'order-1'], ['release', 'r1'], ['release', 'r0']]);
});
await check('F44-checkout-duplicate-promise-and-retry', async () => {
  const wait = deferred(); let calls = 0;
  const h = await checkoutHarness({orders: () => ({async create() { calls++; return wait.promise; }})});
  const input = checkoutInput(), a = h.api.submit(input), b = h.api.submit(input); assert.equal(a, b);
  wait.resolve({id: 'o'}); await a; assert.equal(calls, 1);
  const c = h.api.submit(input); assert.notEqual(a, c); await c; assert.equal(calls, 2);
});
async function refundHarness(overrides = {}, map) {
  const events = [], record = {id: 'return-1', refund: 333}, refund = {id: 'refund-1'};
  const ports = {returns: {async create(input) { events.push(['create', input]); return record; }},
    wallet: {async refund(input) { events.push(['refund', input]); return refund; }},
    inventory: {async restock(input) { events.push(['restock', input]); }}};
  for (const [area, methods] of Object.entries(overrides)) Object.assign(ports[area], methods(events));
  return {api: (await fn('application/refund.mjs', 'createRefundFlow'))({...ports, inflight: map ?? await inflight()}), events, record, refund};
}
await check('F45-refund-sequence-payload-and-identity', async () => {
  const h = await refundHarness(), input = freeze(returnInput()), result = await h.api.submit(input);
  assert.deepEqual(h.events.map(item => item[0]), ['create', 'refund', 'restock']); assert.equal(h.events[0][1], input.returnRequest);
  assert.deepEqual(h.events[1][1], {returnId: 'return-1', amount: 333, currency: 'KRW', metadata: input.returnRequest.metadata});
  assert.equal(h.events[1][1].metadata, input.returnRequest.metadata);
  assert.deepEqual(h.events[2][1], {sku: 'A', quantity: 1, returnId: 'return-1'});
  assert.deepEqual(result, {record: h.record, refund: h.refund, restockPending: false, restockError: null});
  assert.equal(result.record, h.record); assert.equal(result.refund, h.refund);
});
await check('F46-refund-stop-after-create-or-refund-failure', async () => {
  const original = new Error('port');
  for (const area of ['returns', 'wallet']) {
    const method = area === 'returns' ? 'create' : 'refund';
    const h = await refundHarness({[area]: events => ({async [method]() { events.push([method]); throw original; }})});
    await assert.rejects(h.api.submit(returnInput()), error => error === original);
    assert.deepEqual(h.events.map(item => item[0]), area === 'returns' ? ['create'] : ['create', 'refund']);
  }
  const h = await refundHarness(); await assert.rejects(h.api.submit({...returnInput(), requestId: ''}), failure('invalid-return')); assert.equal(h.events.length, 0);
});
await check('Q4-restock-failure', async () => {
  const original = new Error('restock');
  const h = await refundHarness({inventory: events => ({async restock(input) { events.push(['restock', input]); throw original; }})});
  const result = await h.api.submit(returnInput()); assert.equal(result.restockPending, true); assert.equal(result.restockError, original);
  assert.equal(result.record, h.record); assert.equal(result.refund, h.refund); assert.equal(h.events.filter(row => row[0] === 'refund').length, 1);
});
await check('F47-cross-workflow-key-namespaces', async () => {
  const map = await inflight(), checkout = await checkoutHarness({}, map), refund = await refundHarness({}, map);
  const first = checkout.api.submit(checkoutInput()), second = refund.api.submit(returnInput());
  assert.notEqual(first, second); assert.equal((await first).order.id, 'order-1'); assert.equal((await second).record.id, 'return-1');
});
await check('F48-system-real-composition', async () => {
  const seen = []; let reservation = 0;
  const system = (await fn('application/system.mjs', 'createSystem'))({initialToken: 'token', onUnauthorized() { assert.fail(); }, transport: async (path, options) => {
    seen.push([path, options]); assert.equal(options.headers.Authorization, 'Bearer token');
    if (options.method === 'GET') return {status: 200, data: [{id: path}]};
    if (path === '/inventory/reservations') return {status: 200, data: {id: `r${reservation++}`}};
    if (path === '/orders') { assert.equal(options.body.pricing.total, 2300); return {status: 200, data: {id: 'placed'}}; }
    if (path === '/wallet/charges') { assert.equal(options.body.amount, 2300); assert.equal(Object.hasOwn(options.body, 'balance'), false); return {status: 200, data: {id: 'paid'}}; }
    if (path === '/returns') return {status: 200, data: {id: 'returned', refund: options.body.refund}};
    if (path === '/wallet/refunds') { assert.equal(options.body.amount, 333); return {status: 200, data: {id: 'refunded'}}; }
    return {status: 200, data: {}};
  }});
  await Promise.all(['orders', 'inventory', 'returns', 'wallet'].map(area => system[area].load()));
  assert.deepEqual(['orders', 'inventory', 'returns', 'wallet'].map(area => system[area].getState().items[0].id), ['/orders', '/inventory', '/returns', '/wallet']);
  assert.equal((await system.checkout.submit(checkoutInput())).charge.id, 'paid');
  assert.equal((await system.refund.submit(returnInput())).refund.id, 'refunded'); assert.equal(seen.length, 11);
});
await check('Q8-session-switch', async () => {
  const pending = deferred(); let calls = 0, auth = 0;
  const system = (await fn('application/system.mjs', 'createSystem'))({initialToken: 'same', onUnauthorized() { auth++; }, transport: async () => {
    calls++; if (calls <= 4) return {status: 200, data: [{id: 'old'}]}; return pending.promise;
  }});
  for (const area of ['orders', 'inventory', 'returns', 'wallet']) await system[area].load();
  const late = system.orders.load(); system.login('same');
  for (const area of ['orders', 'inventory', 'returns', 'wallet']) assert.deepEqual(system[area].getState(), {items: [], status: 'idle', error: null});
  pending.resolve({status: 401}); await late; assert.equal(auth, 0); assert.equal(system.orders.getState().status, 'idle');
  const s = await session('a'), reply = deferred();
  const client = (await fn('shared/http.mjs', 'createClient'))({session: s, transport: () => reply.promise, onUnauthorized() { assert.fail(); }});
  const request = client.request('/'); s.setToken(null); reply.resolve({status: 401}); await assert.rejects(request, failure('stale-session'));
});

// A controlled hook/element harness checks event delegation, not a browser or React scheduler.
const build = (await import(pathToFileURL(join(project, '../runtime/node_modules/esbuild/lib/main.js')).href)).build;
const compiled = new Map();
async function harness(file, props = {}, exportName = 'default') {
  if (!compiled.has(file)) compiled.set(file, (await build({entryPoints: [join(project, file)], bundle: true, write: false,
    platform: 'node', format: 'cjs', external: ['react'], logLevel: 'silent'})).outputFiles[0].text);
  const cells = []; let cursor = 0;
  const React = {createElement(type, props, ...children) { return {type, props: {...props, children}}; },
    useState(initial) { const id = cursor++; if (!(id in cells)) cells[id] = typeof initial === 'function' ? initial() : initial;
      return [cells[id], value => { cells[id] = typeof value === 'function' ? value(cells[id]) : value; }]; },
    useRef(initial) { const id = cursor++; if (!(id in cells)) cells[id] = {current: initial}; return cells[id]; }};
  const module = {exports: {}};
  vm.runInNewContext(compiled.get(file), {module, exports: module.exports, require(name) { assert.equal(name, 'react'); return React; }}, {timeout: 1000});
  const Component = module.exports[exportName];
  const expand = node => {
    if (Array.isArray(node)) return node.map(expand);
    if (!node || typeof node !== 'object') return node;
    if (typeof node.type === 'function') return expand(node.type(node.props));
    return {...node, props: {...node.props, children: expand(node.props?.children)}};
  };
  return {render() { cursor = 0; return exportName === 'useAction' ? Component(props.task) : expand(Component(props)); }, exports: module.exports};
}
const nodes = tree => !tree || typeof tree !== 'object' ? [] : Array.isArray(tree) ? tree.flatMap(nodes) : [tree, ...nodes(tree.props?.children)];
const text = tree => tree == null || tree === false ? '' : Array.isArray(tree) ? tree.map(text).join('') : typeof tree === 'object' ? text(tree.props?.children) : String(tree);
const button = (tree, name) => { const found = nodes(tree).find(node => node.type === 'button' && text(node) === name); assert.ok(found, `Missing button ${name}`); return found; };
await check('F49-ui-action-pending-duplicate-and-recovery', async () => {
  const pending = deferred(), original = new Error('task'), argument = {}; let calls = 0;
  const h = await harness('ui/useAction.mjs', {task: actual => { calls++; assert.equal(actual, argument); return calls === 1 ? pending.promise : Promise.reject(original); }}, 'useAction');
  const initial = h.render(); assert.equal(initial.pending, false); assert.equal(initial.error, null);
  const first = initial.run(argument); assert.equal(h.render().pending, true); await initial.run(argument); assert.equal(calls, 1);
  const result = {}; pending.resolve(result); assert.equal(await first, undefined); assert.equal(h.render().result, result);
  await h.render().run(argument); assert.equal(calls, 2); assert.equal(h.render().pending, false); assert.equal(h.render().error, original);
});
await check('F50-ui-status-and-amount', async () => {
  for (const error of [null, new Error('secret stack')]) {
    const h = await harness('ui/Status.jsx', {state: {status: 'error', error}}), tree = h.render();
    assert.ok(nodes(tree).some(node => node.props?.role === 'status' && text(node) === 'error'));
    assert.equal(nodes(tree).some(node => node.props?.role === 'alert'), error !== null); assert.equal(text(tree).includes('secret stack'), false);
  }
  const amount = (await harness('ui/Amount.jsx', {value: 1200})).render();
  assert.ok(nodes(amount).some(node => node.props?.['aria-label'] === '금액')); assert.ok(text(amount).includes('1,200원'));
});
for (const [index, [file, prop, label, row, expected]] of [
  ['OrderPanel', 'orders', '주문 조회', {id: 'order-row'}, 'order-row'],
  ['InventoryPanel', 'inventory', '재고 조회', {id: 'i', sku: 'sku-row', available: 7}, 'sku-row'],
  ['ReturnsPanel', 'returns', '반품 조회', {id: 'return-row', reason: 'damaged'}, 'return-row'],
  ['WalletPanel', 'wallet', '지갑 조회', {id: 'w', balance: 1200}, '1,200원'],
].entries()) await check(`F${51 + index}-${prop}-panel-events`, async () => {
  const pending = deferred(); let calls = 0, state = {items: [], status: 'idle', error: null};
  const service = {getState: () => state, async load(...args) { assert.equal(args.length, 0); calls++; state = {...state, status: 'loading'}; await pending.promise; state = {items: [row], status: 'ready', error: null}; }};
  const h = await harness(`ui/${file}.jsx`, {[prop]: service}); let tree = h.render(); assert.equal(calls, 0);
  const operation = button(tree, label).props.onClick(); tree = h.render(); assert.equal(button(tree, label).props.disabled, true);
  pending.resolve(); await operation; tree = h.render(); assert.equal(calls, 1); assert.ok(text(tree).includes(expected)); assert.ok(text(tree).includes('ready'));
  assert.equal(Boolean(button(tree, label).props.disabled), false);
});
await check('F55-checkout-form-identity-result-and-error', async () => {
  const input = freeze(checkoutInput()), pending = deferred(); let calls = 0;
  const h = await harness('ui/CheckoutForm.jsx', {input, checkout: {submit(actual) { calls++; assert.equal(actual, input); return calls === 1 ? pending.promise : Promise.reject(new Error('private')); }}});
  assert.equal(calls, 0); const first = button(h.render(), '결제').props.onClick(); assert.equal(button(h.render(), '결제').props.disabled, true);
  pending.resolve({order: {id: 'saved-order'}}); await first; assert.ok(text(h.render()).includes('saved-order'));
  await button(h.render(), '결제').props.onClick(); assert.ok(nodes(h.render()).some(node => node.props?.role === 'alert')); assert.equal(text(h.render()).includes('private'), false);
});
await check('F56-return-form-pending-restock-feedback', async () => {
  const input = freeze(returnInput()); let calls = 0;
  const h = await harness('ui/ReturnForm.jsx', {input, refund: {async submit(actual) { calls++; assert.equal(actual, input); return {record: {id: 'r'}, restockPending: true}; }}});
  h.render(); assert.equal(calls, 0); await button(h.render(), '환불').props.onClick(); assert.ok(text(h.render()).includes('재입고 대기')); assert.equal(calls, 1);
});
await check('F57-session-bar-explicit-events-and-password', async () => {
  const calls = [], h = await harness('ui/SessionBar.jsx', {onLogin: token => calls.push(['login', token]), onLogout: () => calls.push(['logout'])});
  let tree = h.render(); const input = nodes(tree).find(node => node.type === 'input'); assert.ok(input); assert.equal(input.props.type, 'password'); assert.equal(input.props['aria-label'], '세션 토큰');
  input.props.onChange({target: {value: 'new'}}); tree = h.render(); assert.equal(calls.length, 0);
  button(tree, '로그인').props.onClick(); button(tree, '로그아웃').props.onClick(); assert.deepEqual(calls, [['login', 'new'], ['logout']]);
});
await check('F58-app-wiring-and-no-render-effects', async () => {
  const calls = [], system = {};
  for (const area of ['orders', 'inventory', 'returns', 'wallet']) system[area] = {getState: () => ({items: [], status: 'idle', error: null}), async load() { calls.push(area); }};
  Object.assign(system, {checkout: {submit() { calls.push('checkout'); return Promise.resolve({order: {id: 'o'}}); }},
    refund: {submit() { calls.push('refund'); return Promise.resolve({record: {id: 'r'}}); }}, login() { calls.push('login'); }, logout() { calls.push('logout'); }});
  const h = await harness('App.jsx', {system, checkoutInput: checkoutInput(), refundInput: returnInput()});
  const tree = h.render(); assert.equal(calls.length, 0); assert.ok(nodes(tree).some(node => node.type === 'h1' && text(node) === '운영 콘솔'));
  for (const name of ['주문 조회', '재고 조회', '반품 조회', '지갑 조회', '결제', '환불', '로그아웃']) await button(tree, name).props.onClick();
  assert.deepEqual(calls, ['orders', 'inventory', 'returns', 'wallet', 'checkout', 'refund', 'logout']);
});
await check('F59-ui-build-and-exports', async () => {
  for (const file of SPEC.editable.filter(file => file.endsWith('.jsx'))) assert.deepEqual(keys((await harness(file)).exports), ['default']);
  await build({entryPoints: [join(project, 'App.jsx')], bundle: true, write: false, platform: 'browser', logLevel: 'silent'});
});
await check('N2-approved-dependency-edges', async () => {
  const ts = (await import(pathToFileURL(join(project, '../runtime/node_modules/typescript/lib/typescript.js')).href)).default;
  for (const [file, allowed] of Object.entries(SPEC.edges)) {
    const source = ts.createSourceFile(file, await readFile(join(project, file), 'utf8'), ts.ScriptTarget.Latest, true, file.endsWith('.jsx') ? ts.ScriptKind.JSX : ts.ScriptKind.JS);
    const visit = node => {
      if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node) && node.moduleSpecifier) assert.ok(allowed.includes(node.moduleSpecifier.text), `${file}: ${node.moduleSpecifier.text}`);
      if (ts.isCallExpression(node)) assert.notEqual(node.expression.kind, ts.SyntaxKind.ImportKeyword, 'dynamic import');
      if (ts.isIdentifier(node) && ['require', 'fetch', 'axios', 'XMLHttpRequest', 'WebSocket', 'eval', 'Function', 'useEffect', 'useLayoutEffect', 'globalThis', 'window', 'self', 'localStorage', 'sessionStorage'].includes(node.text)) assert.fail(`${file}: forbidden ${node.text}`);
      ts.forEachChild(node, visit);
    }; visit(source);
  }
});
console.log(JSON.stringify({status: 'graded', results,
  limits: 'Finite contract tests, AST edge checks and a controlled hook/element harness. Not a browser, React scheduler, visual quality, profiling or a proof against arbitrary JavaScript evasions.'}));
