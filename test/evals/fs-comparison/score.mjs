import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';
import { chromium, expect } from '../../fixtures/frontend/node_modules/@playwright/test/index.mjs';

const [projectArg, outputArg, portArg = '3217'] = process.argv.slice(2);
if (!projectArg || !outputArg) throw new Error('Usage: node score.mjs PROJECT OUTPUT [PORT]');
const project = resolve(projectArg), output = resolve(outputArg), port = Number(portArg);
await mkdir(output, { recursive: true });
const result = { checks: [], requirements: [], pageErrors: [], gzipJavaScriptBytes: null };
const env = { ...process.env, CI: 'true', NEXT_TELEMETRY_DISABLED: '1' };
delete env.NODE_TEST_CONTEXT;

function command(args, timeout = 180000) {
  return new Promise(resolveResult => {
    const started = Date.now();
    const child = spawn('npm', args, { cwd: project, env, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let log = '', timedOut = false;
    child.stdout.on('data', data => { log += data; });
    child.stderr.on('data', data => { log += data; });
    const timer = setTimeout(() => { timedOut = true; try { process.kill(-child.pid, 'SIGKILL'); } catch {} }, timeout);
    child.on('error', error => { log += String(error); });
    child.on('close', code => {
      clearTimeout(timer);
      resolveResult({ passed: code === 0 && !timedOut, code, timedOut, seconds: (Date.now() - started) / 1000, log });
    });
  });
}

// The runner restores these original checks in an evaluation-only copy.
for (const script of ['lint', 'typecheck', 'check:boundaries', 'test:unit', 'build', 'test:e2e']) {
  const checked = await command(['run', script]);
  await writeFile(join(output, `${script.replace(':', '-')}.log`), checked.log);
  const summary = { ...checked };
  delete summary.log;
  result.checks.push({ id: script, ...summary });
}

const cases = [];
function check(category, id, action) { cases.push({ category, id, action }); }
let submitter;
try { ({ createOrderSubmitter: submitter } = await import(pathToFileURL(join(project, 'src/domain/orders.js')))); }
catch { /* Every domain case records failure below. */ }
for (const quantity of [1, 10]) check('domain', `accept-${quantity}`, async () => {
  let sent;
  assert.equal(await submitter(async value => { sent = value; }, () => {})(quantity), true);
  assert.equal(sent, quantity);
});
for (const [name, quantity] of [['zero', 0], ['negative', -1], ['fraction', 1.5], ['above-max', 11], ['nan', NaN], ['infinity', Infinity], ['string', '2'], ['missing', undefined]]) {
  check('domain', `reject-${name}`, async () => {
    let sent = 0;
    try { await submitter(async () => { sent++; }, () => {})(quantity); } catch {}
    assert.equal(typeof submitter, 'function');
    assert.equal(sent, 0);
  });
}
check('domain', 'pending-deduplication', async () => {
  let release, calls = 0;
  const submit = submitter(() => { calls++; return new Promise(resolve => { release = resolve; }); }, () => {});
  const first = submit(2);
  try { assert.equal(await submit(2), false); assert.equal(calls, 1); }
  finally { release?.(); await first; }
});
check('domain', 'failure-retry-clears-error', async () => {
  let calls = 0;
  const states = [];
  const submit = submitter(async () => { if (++calls === 1) throw new Error('Temporary failure'); }, state => states.push(state));
  assert.equal(await submit(3), false);
  assert.equal(states.at(-1).pending, false);
  assert.ok(states.at(-1).error);
  assert.equal(await submit(3), true);
  assert.equal(states.at(-1).error, '');
  assert.equal(states.at(-1).submitted, true);
});

const built = result.checks.find(item => item.id === 'build').passed;
if (built) {
  let bytes = 0;
  async function sum(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await sum(path);
      else if (entry.name.endsWith('.js')) bytes += gzipSync(await readFile(path)).length;
    }
  }
  await sum(join(project, '.next/static'));
  result.gzipJavaScriptBytes = bytes;
}
const server = spawn(process.execPath, [join(project, 'node_modules/next/dist/bin/next'), built ? 'start' : 'dev', '--hostname', '127.0.0.1', '--port', String(port)], { cwd: project, env, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
let serverLog = '', browser, serverReady = false;
server.stdout.on('data', data => { serverLog += data; });
server.stderr.on('data', data => { serverLog += data; });
const base = `http://127.0.0.1:${port}`;
try {
  for (let attempt = 0; attempt < 90; attempt++) {
    try { if ((await fetch(base, { signal: AbortSignal.timeout(2000) })).ok) { serverReady = true; break; } } catch {}
    if (server.exitCode !== null) break;
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  if (serverReady) browser = await chromium.launch({ headless: true });
} catch (error) { result.browserSetupError = String(error); }

for (const quantity of [1, 10]) check('api', `accept-${quantity}`, async () => {
  const response = await fetch(`${base}/api/orders`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ quantity }), signal: AbortSignal.timeout(5000) });
  assert.ok(response.ok);
  assert.equal((await response.json()).accepted, true);
});
for (const [name, body] of [['zero', '{"quantity":0}'], ['negative', '{"quantity":-1}'], ['fraction', '{"quantity":1.5}'], ['above-max', '{"quantity":11}'], ['string', '{"quantity":"2"}'], ['null', '{"quantity":null}'], ['missing', '{}'], ['malformed', '{']]) {
  check('api', `reject-${name}`, async () => {
    const response = await fetch(`${base}/api/orders`, { method: 'POST', headers: { 'content-type': 'application/json' }, body, signal: AbortSignal.timeout(5000) });
    assert.equal(response.status, 400);
  });
}

function ui(id, action) {
  check('browser', id, async () => {
    assert.ok(browser, 'Browser/server unavailable');
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    page.setDefaultTimeout(4000);
    page.on('pageerror', error => result.pageErrors.push({ case: id, message: error.message }));
    try {
      await page.goto(base);
      await action(page, page.getByRole('spinbutton', { name: 'Quantity', exact: true }));
    } finally { await page.close(); }
  });
}
const amount = text => Number(text.replace(/[^0-9]/g, ''));
ui('default-label-total-catalogue', async (page, input) => {
  await expect(input).toHaveValue('1');
  await expect(page.getByText('Server-rendered catalogue')).toBeVisible();
  const total = page.getByRole('status', { name: 'Total', exact: true });
  await expect(total).toBeVisible();
  assert.equal(await total.evaluate(node => node.tagName), 'OUTPUT');
  assert.equal(amount(await total.innerText()), 12000);
});
ui('quantity-total-payload', async (page, input) => {
  let sent;
  await page.route('**/api/orders', async route => { sent = route.request().postDataJSON(); await route.fulfill({ json: { accepted: true } }); });
  await input.fill('3');
  assert.equal(amount(await page.getByRole('status', { name: 'Total', exact: true }).innerText()), 36000);
  await page.getByRole('button', { name: 'Place order', exact: true }).click();
  await expect(page.getByText('Order received', { exact: true })).toBeVisible();
  assert.deepEqual(sent, { quantity: 3 });
});
for (const [name, value] of [['empty', ''], ['zero', '0'], ['negative', '-1'], ['fraction', '1.5'], ['above-max', '11']]) ui(`reject-${name}-without-request`, async (page, input) => {
  let requests = 0;
  await page.route('**/api/orders', async route => { requests++; await route.fulfill({ json: { accepted: true } }); });
  await input.fill(value);
  const button = page.getByRole('button', { name: 'Place order', exact: true });
  if (await button.isEnabled()) await button.click();
  await page.waitForTimeout(200);
  assert.equal(requests, 0);
  assert.equal(await page.getByText('Order received', { exact: true }).count(), 0);
});
ui('pending-controls-deduplication', async (page, input) => {
  let requests = 0, release;
  await page.route('**/api/orders', async route => { requests++; await new Promise(resolve => { release = resolve; }); await route.fulfill({ json: { accepted: true } }); });
  await input.fill('2');
  await page.getByRole('button', { name: 'Place order', exact: true }).click();
  try {
    await expect(input).toBeDisabled();
    await expect(page.locator('button[type="submit"]')).toBeDisabled();
    await page.locator('form').evaluate(form => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    await page.waitForTimeout(200);
    assert.equal(requests, 1);
  } finally { release?.(); }
});
ui('accessible-error-retry-preserves-quantity', async (page, input) => {
  const quantities = [];
  await page.route('**/api/orders', async route => { quantities.push(route.request().postDataJSON().quantity); await route.fulfill({ status: quantities.length === 1 ? 500 : 200, json: { accepted: true } }); });
  await input.fill('4');
  await page.getByRole('button', { name: 'Place order', exact: true }).click();
  await expect(page.locator('form').getByRole('alert')).toBeVisible();
  await expect(input).toHaveValue('4');
  await expect(input).toBeEnabled();
  await page.getByRole('button', { name: 'Place order', exact: true }).click();
  await expect(page.getByText('Order received', { exact: true })).toBeVisible();
  // Next.js has its own global route-announcer alert, unrelated to order errors.
  await expect(page.locator('form').getByRole('alert')).toHaveCount(0);
  assert.deepEqual(quantities, [4, 4]);
});
ui('keyboard-order', async (page, input) => {
  await page.route('**/api/orders', route => route.fulfill({ json: { accepted: true } }));
  await input.focus();
  await page.keyboard.press('ArrowUp');
  await expect(input).toHaveValue('2');
  await page.keyboard.press('Enter');
  await expect(page.getByText('Order received', { exact: true })).toBeVisible();
});
ui('mobile-no-horizontal-overflow', async (page, input) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await expect(input).toBeVisible();
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: join(output, 'mobile.png'), fullPage: true });
});

try {
  for (const { category, id, action } of cases) {
    let timer;
    try {
      await Promise.race([action(), new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Requirement timeout')), 15000); })]);
      result.requirements.push({ category, id, passed: true });
    }
    catch (error) { result.requirements.push({ category, id, passed: false, error: String(error).slice(0, 1200) }); }
    finally { clearTimeout(timer); }
  }
} finally {
  await browser?.close();
  try { process.kill(-server.pid, 'SIGKILL'); } catch {}
  await writeFile(join(output, 'server.log'), serverLog);
  await writeFile(join(output, 'score.json'), `${JSON.stringify(result, null, 2)}\n`);
}
console.log(JSON.stringify({ checks: result.checks.filter(x => x.passed).length, requirements: result.requirements.filter(x => x.passed).length, total: result.requirements.length, pageErrors: result.pageErrors.length }));
