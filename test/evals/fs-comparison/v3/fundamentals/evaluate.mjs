import assert from 'node:assert/strict';
import {readFile, writeFile} from 'node:fs/promises';
import {resolve, dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from '../../../../../node_modules/esbuild/lib/main.js';
import {chromium, expect} from '../../../../fixtures/frontend/node_modules/@playwright/test/index.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../../../../..');
const scenario = JSON.parse(await readFile(join(here, 'scenario.json'), 'utf8'));
const [project, profile, stage, destination] = process.argv.slice(2);
assert.ok(project && destination && ['independent', 'shared'].includes(profile) && ['initial', 'change'].includes(stage));
let compiled;
try {
  compiled = await build({stdin: {contents: `import React from 'react'; import {createRoot} from 'react-dom/client';
import App from ${JSON.stringify(join(resolve(project), 'App.jsx'))};
createRoot(document.getElementById('root')).render(React.createElement(App,{api:window.fixtureApi}));`,
  resolveDir: resolve(project), sourcefile: 'entry.jsx', loader: 'jsx'}, bundle: true, write: false,
  platform: 'browser', format: 'iife', nodePaths: [join(root, 'test/fixtures/frontend/node_modules')], logLevel: 'silent'});
} catch (error) {
  const report = {profile, stage, eligible: false, status: 'graded', results: [{id: 'build', status: 'failed', reason: String(error.message)}]};
  await writeFile(destination, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
  process.exit(0);
}
const cases = [];
const add = (id, run) => cases.push({id, run});
const form = (page, kind) => page.getByRole('region', {name: kind === 'purchase' ? '일반 주문' : '선물 주문', exact: true});
const fill = async (page, kind, coupon = '', quantity = '2') => {
  const area = form(page, kind);
  await area.getByLabel('이메일', {exact: true}).fill('buyer@example.test');
  await area.getByLabel('수량', {exact: true}).fill(quantity);
  await area.getByLabel('쿠폰', {exact: true}).fill(coupon);
  return area;
};
const calls = (page, method, kind) => page.evaluate(({method, kind}) => window.observed.filter(call => call.method === method && call.input.kind === kind), {method, kind});
for (const kind of ['purchase', 'gift']) {
  add(`${kind}/existing-save-and-input`, async page => {
    const area = await fill(page, kind, 'SAVE');
    await area.getByRole('button', {name: '주문하기'}).click();
    await expect(area.getByRole('status')).toContainText('order-');
    const sent = await calls(page, 'submit', kind);
    assert.equal(sent.length, 1); assert.equal(sent[0].input.total, 17321);
    assert.equal(sent[0].input.quantity, 2); assert.equal(sent[0].input.coupon, 'SAVE');
    assert.equal(sent[0].input.email, 'buyer@example.test');
  });
  add(`${kind}/analytics-contract`, async page => {
    const area = await fill(page, kind);
    await area.getByRole('button', {name: '주문하기'}).click();
    await expect(area.getByRole('status')).toContainText('order-');
    await expect.poll(async () => (await calls(page, 'track', kind)).length).toBe(1);
    const actual = await page.evaluate(kind => window.observed.filter(call => call.input.kind === kind).map(call => call.name ?? call.method), kind);
    assert.deepEqual(actual, profile === 'independent' && kind === 'gift'
      ? ['quote', 'submit', 'gift-ordered'] : ['quote', 'quote-viewed', 'submit']);
  });
  add(`${kind}/analytics-failure-does-not-fail-order`, async page => {
    await page.evaluate(() => { window.failTrack = true; });
    const area = await fill(page, kind);
    await area.getByRole('button', {name: '주문하기'}).click();
    await expect(area.getByRole('status')).toContainText('order-');
    assert.equal((await calls(page, 'submit', kind)).length, 1);
  });
  add(`${kind}/submit-failure-preserves-input-and-retries`, async page => {
    await page.evaluate(() => { window.failSubmit = true; });
    const area = await fill(page, kind, 'SAVE');
    await area.getByRole('button', {name: '주문하기'}).click();
    await expect(area.getByRole('alert')).toBeVisible();
    await expect(area.getByRole('alert')).toHaveText(/\S/);
    await expect(area.getByLabel('이메일', {exact: true})).toHaveValue('buyer@example.test');
    if (profile === 'independent' && kind === 'gift') assert.equal((await calls(page, 'track', kind)).length, 0);
    await page.evaluate(() => { window.failSubmit = false; });
    await area.getByRole('button', {name: '주문하기'}).click();
    await expect(area.getByRole('status')).toContainText('order-');
  });
  add(`${kind}/quote-failure-prevents-submit-and-retries`, async page => {
    await page.evaluate(() => { window.failQuote = true; });
    const area = await fill(page, kind);
    await area.getByRole('button', {name: '주문하기'}).click();
    await expect(area.getByRole('alert')).toBeVisible();
    await expect(area.getByRole('alert')).toHaveText(/\S/);
    assert.equal((await calls(page, 'submit', kind)).length, 0);
    assert.equal((await calls(page, 'track', kind)).length, 0);
    await page.evaluate(() => { window.failQuote = false; });
    await area.getByRole('button', {name: '주문하기'}).click();
    await expect(area.getByRole('status')).toContainText('order-');
  });
  add(`${kind}/quantity-range`, async page => {
    const area = await fill(page, kind, '', '11');
    await area.locator('form').evaluate(node => node.dispatchEvent(new Event('submit', {bubbles: true, cancelable: true})));
    await expect(area.getByRole('alert')).toBeVisible();
    assert.equal((await calls(page, 'quote', kind)).length, 0);
  });
  if (stage === 'change') for (const quantity of ['1', '2']) add(`${kind}/member-${quantity}`, async page => {
    const area = await fill(page, kind, 'MEMBER', quantity);
    await area.getByRole('button', {name: '주문하기'}).click();
    const accepted = quantity === '2' && (kind === 'purchase' || profile === 'shared');
    if (accepted) {
      await expect(area.getByRole('status')).toContainText('order-');
      assert.equal((await calls(page, 'quote', kind))[0].input.coupon, 'MEMBER');
    } else {
      await expect(area.getByRole('alert')).toBeVisible();
      assert.equal((await calls(page, 'quote', kind)).length, 0);
    }
  });
}
add('independent-pending-and-no-duplicate', async page => {
  await page.evaluate(() => { window.holdPurchase = true; });
  const purchase = await fill(page, 'purchase');
  await purchase.getByRole('button', {name: '주문하기'}).click();
  await expect.poll(async () => (await calls(page, 'quote', 'purchase')).length).toBe(1);
  await purchase.locator('form').evaluate(node => node.dispatchEvent(new Event('submit', {bubbles: true, cancelable: true})));
  const gift = await fill(page, 'gift');
  await gift.getByRole('button', {name: '주문하기'}).click();
  await expect(gift.getByRole('status')).toContainText('order-');
  assert.equal((await calls(page, 'quote', 'purchase')).length, 1);
  await page.evaluate(() => window.releasePurchase());
  await expect(purchase.getByRole('status')).toContainText('order-');
});
add('keep-valid-money', async () => assert.equal(await readFile(join(project, 'money.mjs'), 'utf8'), await readFile(join(here, 'fixture/money.mjs'), 'utf8')));

let browser;
const results = [];
try {
  if (!process.env.PW_TEST_CONNECT_WS_ENDPOINT) throw new Error('Restricted browser broker required; do not launch an unrestricted fallback');
  browser = await chromium.connect(process.env.PW_TEST_CONNECT_WS_ENDPOINT);
  for (const {id, run} of cases) {
    const context = await browser.newContext();
    await context.route('**/*', route => route.abort());
    const page = await context.newPage();
    page.setDefaultTimeout(2500);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    try {
      await page.setContent('<html lang="ko"><body><div id="root"></div></body></html>');
      await page.evaluate(() => {
        window.observed = [];
        window.fixtureApi = {
          async quote(input) {
            window.observed.push({method: 'quote', input: {...input}});
            if (window.failQuote) throw new Error('quote offline');
            if (window.holdPurchase && input.kind === 'purchase') await new Promise(resolve => { window.releasePurchase = resolve; });
            return {total: 17321};
          },
          async submit(input) {
            window.observed.push({method: 'submit', input: {...input}});
            if (window.failSubmit) throw new Error('offline');
            return {id: `order-${input.kind}`};
          },
          async track(name, input) {
            window.observed.push({method: 'track', name, input: {...input}});
            if (window.failTrack) throw new Error('analytics offline');
          },
        };
      });
      await page.addScriptTag({content: compiled.outputFiles[0].text});
      await run(page);
      assert.deepEqual(errors, [], 'Unhandled runtime errors');
      results.push({id, status: 'passed'});
    } catch (error) { results.push({id, status: 'failed', reason: String(error.message).slice(0, 1200)}); }
    finally { await context.close(); }
  }
} catch (error) {
  for (const {id} of cases) results.push({id, status: 'unverified', reason: String(error.message)});
} finally { await browser?.close(); }
const report = {profile, stage, eligible: results.every(result => result.status === 'passed'), results,
  status: results.some(result => result.status === 'unverified') ? 'unverified' : 'graded',
  review: scenario.reviewCriteria.map(({id}) => ({id, status: 'unverified', evidence: []})),
  scope: 'Behavior checks do not establish readability, appropriate abstraction or full accessibility.'};
await writeFile(destination, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({eligible: report.eligible, status: report.status, passed: results.filter(result => result.status === 'passed').length, total: results.length}));
