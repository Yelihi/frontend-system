import assert from 'node:assert/strict';
import { mkdir, readFile, realpath, writeFile } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { createRequire, registerHooks } from 'node:module';

const [projectArgument, outputArgument, baseURL] = process.argv.slice(2);
if (!projectArgument || !outputArgument) throw new Error('Usage: node grade.mjs PROJECT OUTPUT [LIVE_BASE_URL]');
const project = await realpath(projectArgument), output = resolve(outputArgument);
// Honor the fixture's @/* alias and Node-style extension resolution supported by
// Next. A valid next/server import must not become a functional failure here.
registerHooks({ resolve(specifier, context, nextResolve) {
  const source = specifier.startsWith('@/') ? resolve(project, 'src', specifier.slice(2)) : specifier;
  try { return nextResolve(source, context); }
  catch (error) {
    if (!['ERR_MODULE_NOT_FOUND', 'ERR_UNSUPPORTED_DIR_IMPORT'].includes(error.code)) throw error;
    try { return nextResolve(pathToFileURL(createRequire(context.parentURL || import.meta.url).resolve(source)).href, context); }
    catch { throw error; }
  }
} });
await mkdir(output, { recursive: true });
const results = [], cases = [];
const catalogue = [{ id: 'A', price: 12000, stock: 10 }, { id: 'B', price: 8000, stock: 4 }];
const cart = (a = 1, b = 0, coupon = '') => ({
  lines: [...(a ? [{ productId: 'A', quantity: a }] : []), ...(b ? [{ productId: 'B', quantity: b }] : [])], coupon,
});
const add = (category, rule, id, run) => cases.push({ category, rule, id, run });
const publicAssets = JSON.parse(await readFile(new URL('./public-assets.json', import.meta.url), 'utf8'));
for (const [path, expected] of Object.entries(publicAssets)) add('protected-assets', 'H10', path, async () => {
  assert.equal(createHash('sha256').update(await readFile(resolve(project, path))).digest('hex'), expected);
});
let quote, bindingError;
try {
  const binding = JSON.parse(await readFile(resolve(project, 'checkout.contract.json'), 'utf8')).quote;
  const path = await realpath(resolve(project, binding.module));
  assert.ok(!isAbsolute(relative(project, path)) && !relative(project, path).startsWith('..'), 'Binding must stay in project');
  quote = (await import(pathToFileURL(path)))[binding.export];
  assert.equal(typeof quote, 'function');
} catch (error) { bindingError = String(error); }
function calculate(input, data = catalogue) {
  assert.ok(quote, bindingError);
  return quote(input, structuredClone(data));
}
const valid = [
  ['default', cart(), { subtotal: 12000, discount: 0, shipping: 3000, total: 15000 }],
  ['mixed', cart(2, 1), { subtotal: 32000, discount: 0, shipping: 3000, total: 35000 }],
  ['discount-free-shipping', cart(4, 1, 'SAVE10'), { subtotal: 56000, discount: 5600, shipping: 0, total: 50400 }],
  ['discount-paid-shipping', cart(4, 0, 'SAVE10'), { subtotal: 48000, discount: 4800, shipping: 3000, total: 46200 }],
  ['shipping-coupon', cart(1, 0, 'SHIPFREE'), { subtotal: 12000, discount: 0, shipping: 0, total: 12000 }],
  ['maximum-valid', cart(10), { subtotal: 120000, discount: 0, shipping: 0, total: 120000 }],
  ['coupon-omitted', { lines: cart().lines }, { subtotal: 12000, discount: 0, shipping: 3000, total: 15000 }],
];
const invalid = [
  ['null', null], ['array', []], ['missing-lines', {}], ['empty-lines', { lines: [] }],
  ['nonarray-lines', { lines: {} }], ['null-line', { lines: [null] }],
  ['unknown-product', { lines: [{ productId: 'X', quantity: 1 }] }],
  ['missing-product', { lines: [{ quantity: 1 }] }],
  ['duplicate-product', { lines: [...cart().lines, ...cart().lines] }],
  ...[['string', '1'], ['zero', 0], ['negative', -1], ['fraction', 1.5], ['above', 11], ['null', null], ['missing', undefined]]
    .map(([id, quantity]) => [`quantity-${id}`, { lines: [{ productId: 'A', quantity }] }]),
  ['unknown-coupon', { ...cart(), coupon: 'OTHER' }], ['coupon-case', { ...cart(), coupon: 'save10' }],
  ['coupon-null', { ...cart(), coupon: null }], ['coupon-number', { ...cart(), coupon: 10 }],
];
for (const [id, input, expected] of valid) add('domain', 'H1', id, () => assert.deepEqual(calculate(input), expected));
for (const [id, input] of invalid) add('domain', id.startsWith('quantity') || id.includes('coupon') ? 'H3' : 'H2', id,
  () => assert.throws(() => calculate(input), { status: 400 }));
add('domain', 'H4', 'insufficient-stock', () => assert.throws(() => calculate(cart(0, 5)), { status: 409 }));
for (const [id, price, coupon, expected] of [
  ['rounding', 12345, 'SAVE10', { subtotal: 12345, discount: 1234, shipping: 3000, total: 14111 }],
  ['below-discounted-threshold', 55554, 'SAVE10', { subtotal: 55554, discount: 5555, shipping: 3000, total: 52999 }],
  ['at-discounted-threshold', 55555, 'SAVE10', { subtotal: 55555, discount: 5555, shipping: 0, total: 50000 }],
  ['above-discounted-threshold', 55556, 'SAVE10', { subtotal: 55556, discount: 5555, shipping: 0, total: 50001 }],
]) add('domain', 'H1', id, () => assert.deepEqual(calculate({ lines: [{ productId: 'X', quantity: 1 }], coupon }, [{ id: 'X', price, stock: 10 }]), expected));
add('domain', 'H5', 'tampered-money', () => {
  const input = { ...cart(), subtotal: 1, discount: 999999, shipping: 0, total: 1 };
  input.lines[0].price = 1;
  try { assert.deepEqual(calculate(input), valid[0][2]); }
  catch (error) { if (error.status !== 400) throw error; }
});

for (const endpoint of ['quote', 'orders']) {
  let handler, errorMessage;
  try { handler = (await import(pathToFileURL(resolve(project, `app/api/${endpoint}/route.js`)))).POST; }
  catch (error) { errorMessage = String(error); }
  async function post(input, raw = false) {
    assert.equal(typeof handler, 'function', errorMessage);
    const response = await handler(new Request(`http://fixture/api/${endpoint}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: raw ? input : JSON.stringify(input),
    }));
    return { status: response.status, data: await response.json() };
  }
  for (const [id, input, expected] of valid) add('api', 'H1', `${endpoint}/${id}`, async () => {
    const response = await post(input);
    assert.equal(response.status, 200);
    if (endpoint === 'orders') assert.equal(response.data.accepted, true);
    assert.deepEqual(endpoint === 'orders' ? response.data.quote : response.data, expected);
  });
  for (const [id, input] of invalid) add('api', id.startsWith('quantity') || id.includes('coupon') ? 'H3' : 'H2', `${endpoint}/${id}`, async () => {
    const response = await post(input);
    assert.equal(response.status, 400);
    assert.equal(typeof response.data.error, 'string');
    assert.ok(response.data.error.length);
  });
  add('api', 'H2', `${endpoint}/malformed-json`, async () => assert.equal((await post('{', true)).status, 400));
  add('api', 'H4', `${endpoint}/insufficient-stock`, async () => assert.equal((await post(cart(0, 5))).status, 409));
  add('api', 'H5', `${endpoint}/tampered-money`, async () => {
    const input = { ...cart(), total: 1, price: 1, discount: 999999, shipping: 0 };
    input.lines[0].price = 1;
    const response = await post(input);
    if (response.status === 400) return;
    assert.equal(response.status, 200);
    assert.deepEqual(endpoint === 'orders' ? response.data.quote : response.data, valid[0][2]);
  });
}

const browserCases = [
  ['H1', 'default-and-updated-total'], ['H6', 'late-success'], ['H6', 'late-failure'],
  ['H7', 'pending-quote-prevents-order'], ['H7', 'failed-quote-retry'],
  ['H8', 'order-lock-failure-retry'], ['H9', 'keyboard-order'], ['H9', 'mobile-and-runtime'],
];
let browser, browserProblem;
const pageErrors = [];
if (baseURL) {
  try {
    const { chromium } = await import('../../../fixtures/frontend/node_modules/@playwright/test/index.mjs');
    browser = await chromium.launch({ headless: true });
  } catch (error) { browserProblem = String(error).slice(0, 1200); }
} else browserProblem = 'Live browser evaluation not requested; domain/handler checks do not substitute for browser evidence';

async function ui(id) {
  const { expect } = await import('../../../fixtures/frontend/node_modules/@playwright/test/index.mjs');
  const page = await browser.newPage({ viewport: { width: 1000, height: 800 } });
  page.setDefaultTimeout(4000);
  page.on('pageerror', error => pageErrors.push({ id, error: error.message }));
  const a = page.getByRole('spinbutton', { name: 'Quantity A', exact: true });
  const total = page.getByLabel('Total', { exact: true });
  const submit = page.getByRole('button', { name: 'Place order', exact: true });
  const errorRegion = page.getByLabel('Checkout error', { exact: true });
  const errorCleared = async () => await errorRegion.count() === 0 || (await errorRegion.innerText()).trim() === '' || !await errorRegion.isVisible();
  async function accessibleError() {
    await expect(errorRegion).toBeVisible();
    assert.ok((await errorRegion.innerText()).trim());
    assert.ok(await errorRegion.evaluate(node => node.getAttribute('role') === 'alert' || ['polite', 'assertive'].includes(node.getAttribute('aria-live'))));
  }
  const amount = async () => Number((await total.innerText()).replace(/[^0-9]/g, ''));
  const quoteFor = request => {
    const input = request.postDataJSON();
    const quantity = input.lines.find(line => line.productId === 'A')?.quantity || 0;
    return { subtotal: quantity * 12000, discount: 0, shipping: 3000, total: quantity * 12000 + 3000 };
  };
  const response = async (route, data, status = 200) => {
    try { await route.fulfill({ status, json: data }); }
    catch (error) { if (!/closed|disposed|cancel|Invalid InterceptionId/i.test(String(error))) throw error; }
  };
  try {
    if (['late-success', 'late-failure', 'pending-quote-prevents-order'].includes(id)) {
      let held, quotes = 0, orders = 0;
      await page.route('**/api/orders', async route => { orders++; await response(route, { accepted: true, quote: quoteFor(route.request()) }); });
      await page.route('**/api/quote', async route => {
        quotes++;
        if (route.request().postDataJSON().lines[0]?.quantity === 2) { held = route; return; }
        await response(route, quoteFor(route.request()));
      });
      await page.goto(baseURL); await expect(submit).toBeEnabled();
      await a.fill('2'); await expect.poll(() => Boolean(held)).toBe(true);
      if (id === 'pending-quote-prevents-order') {
        await expect(submit).toBeDisabled();
        await a.press('Enter');
        await page.locator('form').evaluate(form => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
        await page.waitForTimeout(100); assert.equal(orders, 0);
        await response(held, quoteFor(held.request())); await expect(submit).toBeEnabled();
      } else {
        await a.fill('3'); await expect.poll(amount).toBe(39000);
        await response(held, id === 'late-failure' ? { error: 'Outdated error' } : quoteFor(held.request()), id === 'late-failure' ? 500 : 200);
        await page.waitForTimeout(100);
        assert.equal(await amount(), 39000); await expect(submit).toBeEnabled();
        await expect.poll(errorCleared).toBe(true);
      }
      assert.ok(quotes >= 2);
    } else if (id === 'failed-quote-retry') {
      let failures = true;
      await page.route('**/api/quote', route => response(route, failures ? { error: 'Quote unavailable' } : quoteFor(route.request()), failures ? 500 : 200));
      await page.goto(baseURL); await accessibleError();
      await expect(submit).toBeDisabled(); await expect(a).toHaveValue('1');
      failures = false; await page.getByRole('button', { name: 'Retry quote', exact: true }).click();
      await expect(submit).toBeEnabled(); await expect.poll(errorCleared).toBe(true);
    } else if (id === 'order-lock-failure-retry') {
      let held, count = 0;
      await page.route('**/api/orders', async route => {
        if (++count === 1) { held = route; return; }
        await response(route, { accepted: true, quote: quoteFor(route.request()) });
      });
      await page.goto(baseURL); await expect(submit).toBeEnabled(); await a.fill('2'); await expect(submit).toBeEnabled();
      await submit.click(); await expect.poll(() => Boolean(held)).toBe(true);
      await expect(a).toBeDisabled(); await expect(page.getByLabel('Coupon', { exact: true })).toBeDisabled();
      await expect(page.getByRole('spinbutton', { name: 'Quantity B', exact: true })).toBeDisabled();
      await expect(submit).toBeDisabled();
      await page.locator('form').evaluate(form => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
      await page.waitForTimeout(100); assert.equal(count, 1); await response(held, { error: 'Order failed' }, 500);
      await accessibleError(); await expect(a).toHaveValue('2');
      await expect(submit).toBeEnabled(); await submit.click();
      await expect(page.getByText('Order received', { exact: true })).toBeVisible();
      await expect.poll(errorCleared).toBe(true); assert.equal(count, 2);
    } else {
      await page.goto(baseURL); await expect(submit).toBeEnabled();
      await expect(a).toHaveValue('1'); await expect(page.getByRole('spinbutton', { name: 'Quantity B', exact: true })).toHaveValue('0');
      assert.equal(await total.evaluate(element => element.tagName), 'OUTPUT');
      assert.equal(await amount(), 15000);
      if (id === 'default-and-updated-total') {
        await a.fill('4'); await page.getByRole('spinbutton', { name: 'Quantity B', exact: true }).fill('1');
        const coupon = page.getByLabel('Coupon', { exact: true });
        if (await coupon.evaluate(element => element.tagName) === 'SELECT') await coupon.selectOption('SAVE10');
        else await coupon.fill('SAVE10');
        await expect.poll(amount).toBe(50400);
      } else if (id === 'keyboard-order') {
        await a.focus(); await a.press('ArrowUp'); await expect(a).toHaveValue('2'); await expect(submit).toBeEnabled();
        await a.press('Enter'); await expect(page.getByText('Order received', { exact: true })).toBeVisible();
      } else {
        await page.setViewportSize({ width: 360, height: 800 });
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        await submit.click(); await expect(page.getByText('Order received', { exact: true })).toBeVisible();
        await page.screenshot({ path: resolve(output, 'mobile.png'), fullPage: true });
      }
    }
    assert.equal(pageErrors.filter(error => error.id === id).length, 0);
  } finally { await page.close(); }
}
for (const [rule, id] of browserCases) add('browser', rule, id, browser ? () => ui(id) : null);

try {
  for (const { category, rule, id, run } of cases) {
    if (!run) { results.push({ category, rule, id, status: 'not-run', reason: browserProblem }); continue; }
    let timer;
    try {
      await Promise.race([Promise.resolve().then(run), new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Case timeout')), 15000); })]);
      results.push({ category, rule, id, status: 'passed' });
    } catch (error) { results.push({ category, rule, id, status: 'failed', error: String(error).slice(0, 2000) }); }
    finally { clearTimeout(timer); }
  }
} finally { await browser?.close(); }
const review = {};
for (let index = 1; index <= 10; index++) review[`Q${index}`] = { items: [null, null], evidence: [], status: 'review-required' };
const result = {
  schemaVersion: 2, project, cases: results, pageErrors, review,
  workflowEvidence: { status: 'review-required', rule: 'H10', reason: 'Requires actual model trace, protected asset hashes, and final source/check association' },
  complete: false, qualityScore: null,
  limitations: ['Direct handler tests exercise POST exports, not a running Next.js server.', 'Q1–Q10 require independent semantic review and change probes; functional passes do not award architecture points.'],
};
await writeFile(resolve(output, 'score.json'), JSON.stringify(result, null, 2) + '\n');
await writeFile(resolve(output, 'case-index.json'), JSON.stringify(results.map(({ category, rule, id }) => ({ category, rule, id })), null, 2) + '\n');
console.log(JSON.stringify({ passed: results.filter(x => x.status === 'passed').length, failed: results.filter(x => x.status === 'failed').length, notRun: results.filter(x => x.status === 'not-run').length, total: results.length, qualityScore: null }));
