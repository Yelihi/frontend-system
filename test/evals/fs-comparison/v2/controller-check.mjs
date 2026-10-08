// Reference calibration only. Implementations may use other state structures.
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const { createCheckoutController } = await import(pathToFileURL(resolve(process.argv[2], 'src/controller.js')));
const quote = total => ({ subtotal: total - 3000, discount: 0, shipping: 3000, total });
function setup() {
  const requests = [];
  let state;
  const controller = createCheckoutController((path, body) => new Promise((resolve, reject) => {
    requests.push({ path, body, resolve, reject });
  }), value => { state = value; });
  return { controller, requests, state: () => state };
}
const cases = [];
for (const late of ['success', 'failure']) cases.push([`stale-${late}`, async () => {
  const t = setup();
  const initial = t.controller.refresh(); t.requests[0].resolve(quote(15000)); await initial;
  const old = t.controller.quantity('A', '2');
  const latest = t.controller.quantity('A', '3');
  t.requests[2].resolve(quote(39000)); await latest;
  if (late === 'success') t.requests[1].resolve(quote(27000));
  else t.requests[1].reject(new Error('Outdated error'));
  await old;
  assert.equal(t.state().quote.total, 39000);
  assert.equal(t.state().error, '');
  assert.equal(t.state().quoting, false);
}]);
cases.push(['pending-quote-blocks-order', async () => {
  const t = setup();
  const initial = t.controller.refresh(); t.requests[0].resolve(quote(15000)); await initial;
  const next = t.controller.quantity('A', '2');
  // Do not await a broken submit waiting for a fake order response.
  const attempted = t.controller.submit();
  assert.equal(t.requests.filter(r => r.path === '/api/orders').length, 0);
  assert.equal(await attempted, false);
  t.requests[1].resolve(quote(27000)); await next;
}]);
cases.push(['failed-quote-retry', async () => {
  const t = setup();
  const first = t.controller.refresh(); t.requests[0].reject(new Error('Quote failed')); await first;
  assert.equal(t.state().quantities.A, '1'); assert.ok(t.state().error);
  assert.equal(await t.controller.submit(), false);
  const retry = t.controller.refresh(); t.requests[1].resolve(quote(15000)); await retry;
  assert.equal(t.state().error, ''); assert.equal(t.state().quote.total, 15000);
}]);
cases.push(['order-duplicate-and-retry', async () => {
  const t = setup();
  const initial = t.controller.refresh(); t.requests[0].resolve(quote(15000)); await initial;
  const first = t.controller.submit();
  assert.equal(t.state().ordering, true);
  assert.equal(await t.controller.submit(), false);
  assert.equal(t.requests.length, 2);
  t.requests[1].reject(new Error('Order failed')); assert.equal(await first, false);
  assert.equal(t.state().ordering, false); assert.equal(t.state().quantities.A, '1');
  assert.ok(t.state().error);
  const retry = t.controller.submit(); t.requests[2].resolve({ accepted: true, quote: quote(15000) });
  assert.equal(await retry, true); assert.equal(t.state().error, ''); assert.equal(t.state().submitted, true);
}]);
cases.push(['dispose-ignores-completion', async () => {
  const t = setup(); const pending = t.controller.refresh();
  const before = t.state(); t.controller.dispose();
  t.requests[0].resolve(quote(15000)); await pending;
  assert.equal(t.state(), before);
}]);
const results = [];
for (const [id, check] of cases) {
  try { await check(); results.push({ id, passed: true }); }
  catch (error) { results.push({ id, passed: false, error: String(error) }); }
}
console.log(JSON.stringify(results));
process.exitCode = results.every(r => r.passed) ? 0 : 1;
