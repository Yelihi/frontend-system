#!/usr/bin/env python3
"""Build fresh checkout starters and evaluator-only reference implementations."""
import argparse
import json
from pathlib import Path
import shutil
import subprocess

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[3]
BASE = REPO / 'test/fixtures/frontend'

CATALOG = '''export async function loadCatalog() {
  return [{ id: 'A', price: 12000, stock: 10 }, { id: 'B', price: 8000, stock: 4 }];
}
'''

PRICING = '''function invalid(message, status = 400) {
  throw Object.assign(new Error(message), { status });
}

export function calculateQuote(input, catalog) {
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
      !Array.isArray(input.lines) || input.lines.length === 0) invalid('Invalid cart');
  const coupon = input.coupon === undefined ? '' : input.coupon;
  if (!['', 'SAVE10', 'SHIPFREE'].includes(coupon)) invalid('Invalid coupon');
  const seen = new Set();
  let subtotal = 0;
  for (const line of input.lines) {
    if (!line || typeof line !== 'object' || !Number.isInteger(line.quantity) ||
        line.quantity < 1 || line.quantity > 10 || typeof line.productId !== 'string' ||
        seen.has(line.productId)) invalid('Invalid line');
    seen.add(line.productId);
    const product = catalog.find(item => item.id === line.productId);
    if (!product) invalid('Unknown product');
    if (line.quantity > product.stock) invalid('Insufficient stock', 409);
    subtotal += product.price * line.quantity;
  }
  const discount = coupon === 'SAVE10' ? Math.floor(subtotal / 10) : 0;
  const net = subtotal - discount;
  const shipping = coupon === 'SHIPFREE' || net >= 50000 ? 0 : 3000;
  return { subtotal, discount, shipping, total: net + shipping };
}
'''

CONTROLLER = '''export const initialState = {
  quantities: { A: '1', B: '0' }, coupon: '', quote: null,
  quoting: false, ordering: false, error: '', submitted: false,
};

export function createCheckoutController(send, publish) {
  let state = { ...initialState, quantities: { ...initialState.quantities } };
  let revision = 0, disposed = false;
  function update(patch) {
    state = { ...state, ...patch };
    if (!disposed) publish(state);
  }
  function body() {
    const entries = Object.entries(state.quantities);
    if (entries.some(([, value]) => value.trim() === '' ||
        !Number.isInteger(Number(value)) || Number(value) < 0 || Number(value) > 10)) return null;
    const lines = entries.filter(([, value]) => Number(value) > 0)
      .map(([productId, value]) => ({ productId, quantity: Number(value) }));
    return lines.length ? { lines, coupon: state.coupon } : null;
  }
  async function refresh() {
    if (disposed || state.ordering) return;
    const request = ++revision;
    const input = body();
    update({ quote: null, quoting: Boolean(input), error: input ? '' : 'Enter a valid cart', submitted: false });
    if (!input) return;
    try {
      const quote = await send('/api/quote', input);
      if (!disposed && request === revision) update({ quote, error: '' });
    } catch (error) {
      if (!disposed && request === revision) update({ quote: null, error: error.message });
    } finally {
      if (!disposed && request === revision) update({ quoting: false });
    }
  }
  async function submit() {
    if (disposed || state.ordering || state.quoting || !state.quote) return false;
    const input = body();
    if (!input) return false;
    update({ ordering: true, error: '', submitted: false });
    try {
      const result = await send('/api/orders', input);
      update({ quote: result.quote, submitted: true, error: '' });
      return true;
    } catch (error) {
      update({ error: error.message });
      return false;
    } finally { update({ ordering: false }); }
  }
  return {
    refresh, submit,
    quantity(id, value) {
      if (disposed || state.ordering) return;
      update({ quantities: { ...state.quantities, [id]: value } });
      return refresh();
    },
    coupon(value) {
      if (disposed || state.ordering) return;
      update({ coupon: value });
      return refresh();
    },
    dispose() { disposed = true; revision++; },
  };
}
'''

FORM = ''''use client';
import { useEffect, useRef, useState } from 'react';
import { createCheckoutController, initialState } from '../src/controller.js';

async function send(path, body) {
  const response = await fetch(path, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Request failed');
  return result;
}

export default function Checkout() {
  const [state, setState] = useState(initialState);
  const controller = useRef(null);
  useEffect(() => {
    const instance = createCheckoutController(send, setState);
    controller.current = instance;
    void instance.refresh();
    return () => instance.dispose();
  }, []);
  return <form onSubmit={event => { event.preventDefault(); void controller.current?.submit(); }}>
    {['A', 'B'].map(id => <p key={id}>
      <label htmlFor={`quantity-${id}`}>Quantity {id}</label>{' '}
      <input id={`quantity-${id}`} type="number" min="0" max="10" step="1" required
        value={state.quantities[id]} disabled={state.ordering}
        onChange={event => { void controller.current?.quantity(id, event.target.value); }} />
    </p>)}
    <p><label htmlFor="coupon">Coupon</label>{' '}
      <select id="coupon" value={state.coupon} disabled={state.ordering}
        onChange={event => { void controller.current?.coupon(event.target.value); }}>
        <option value="">None</option><option>SAVE10</option><option>SHIPFREE</option>
      </select>
    </p>
    <p>Total: <output aria-label="Total">{state.quote ? `${state.quote.total.toLocaleString('en-US')} KRW` : 'Unavailable'}</output></p>
    {state.quoting && <p role="status">Updating quote</p>}
    {state.error && <p role="alert" aria-label="Checkout error">{state.error}</p>}
    <button type="button" disabled={state.quoting || state.ordering} onClick={() => { void controller.current?.refresh(); }}>Retry quote</button>{' '}
    <button type="submit" disabled={state.ordering || state.quoting || !state.quote}>Place order</button>
    {state.submitted && <p role="status">Order received</p>}
  </form>;
}
'''

PUBLIC_TEST = '''import assert from 'node:assert/strict';
import test from 'node:test';
import { loadCatalog } from '../src/catalog.js';
test('catalog supplies independent server data', async () => {
  const first = await loadCatalog();
  assert.deepEqual(first.map(item => item.id), ['A', 'B']);
  first[0].price = 1;
  assert.equal((await loadCatalog())[0].price, 12000);
});
'''

REFERENCE_TEST = '''import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
const bindings = JSON.parse(await readFile(new URL('../checkout.contract.json', import.meta.url)));
const { [bindings.quote.export]: quote } = await import(new URL('../' + bindings.quote.module, import.meta.url));
const catalog = [{ id: 'X', price: 12345, stock: 10 }];
test('real pricing and trust boundary', () => {
  assert.deepEqual(quote({ lines: [{ productId: 'X', quantity: 1 }], coupon: 'SAVE10', total: 1 }, catalog),
    { subtotal: 12345, discount: 1234, shipping: 3000, total: 14111 });
  for (const quantity of ['1', 0, -1, 1.5, 11, null]) {
    assert.throws(() => quote({ lines: [{ productId: 'X', quantity }] }, catalog), { status: 400 });
  }
});
test('actual quote and order handlers share the contract', async () => {
  for (const path of ['quote', 'orders']) {
    const { POST } = await import(new URL(`../app/api/${path}/route.js`, import.meta.url));
    const response = await POST(new Request('http://fixture/api/' + path, {
      method: 'POST', body: JSON.stringify({ lines: [{ productId: 'A', quantity: 1 }], total: 1 }),
    }));
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal((path === 'orders' ? data.quote : data).total, 15000);
  }
});
'''

PUBLIC_E2E = '''import { test, expect } from '@playwright/test';
test('server product description remains available', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Checkout' })).toBeVisible();
  await expect(page.getByText('A: 12000 KRW · B: 8000 KRW')).toBeVisible();
});
'''


def route(pricing, ordered):
    response = '{ accepted: true, quote }' if ordered else 'quote'
    return f'''import {{ calculateQuote }} from '../../../{pricing}';
import {{ loadCatalog }} from '../../../src/catalog.js';
export async function POST(request) {{
  let input;
  try {{ input = await request.json(); }}
  catch {{ return Response.json({{ error: 'Invalid JSON' }}, {{ status: 400 }}); }}
  try {{
    const quote = calculateQuote(input, await loadCatalog());
    return Response.json({response});
  }} catch (error) {{
    return Response.json({{ error: error.message || 'Request failed' }}, {{ status: error.status || 500 }});
  }}
}}
'''


def public_prompt(experiment):
    protocol = (HERE.parent / 'v2-protocol.md').read_text()
    task = protocol.split('## 양쪽에 공개할 제품 과제\n', 1)[1].split('## A: 산출물', 1)[0]
    task = task.replace('기존 Next.js 예제를 바탕으로 별도 checkout fixture를 준비한다. 가격 판단, 서버 신뢰 경계, 원격 견적의 비동기 상태, 테스트 대체 가능성이 함께 드러나는 과제다. fixture의 초기 화면·API·공개 테스트·허용 변경 범위는 본 실험 전에 확정한다. 기존 v1의 단일 quantity API를 암묵적으로 새 계약에 덮어쓰지 않는다.',
                        '제공한 프로젝트의 checkout을 아래 계약으로 구현하세요. 설계·구현·검증을 승인합니다.')
    task = task.replace('[공통 규칙](../../../mandatory-rules/common/review.md)', '제공한 common-rules.md').replace('[품질 기준](../../../references/frontend-quality.md)', '제공한 frontend-quality.md')
    rubric = protocol.split('## B: 구현 품질 채점\n', 1)[1].split('평가자는', 1)[0]
    docs = ('project.md와 plan.md를 작성하고 구현·테스트·검증까지 완료하세요. project.md는 실제 구조·진입점·검사·제약, plan.md는 범위·책임·규칙별 검증을 포함하세요. FS 네이티브 경로의 동등 문서를 허용하며 중복 작성은 필요 없습니다.'
            if experiment == 'A' else '구현·테스트·검증을 완료하세요. 별도 project.md·plan.md 작성 의무는 없습니다.')
    return task + '\n' + rubric + '\n' + docs + '''

호출 계약:
- checkout.contract.json의 quote.module/export는 실제 제품이 사용하는 업무 함수다. 함수는 (input, catalog 배열) → {subtotal, discount, shipping, total}, 유효성 오류는 status 400/409를 가진 Error다. 같은 공개 호출 계약을 유지하며 파일 배치는 변경할 수 있다. 검사 전용 정답 함수를 따로 만들지 않는다.
- src/catalog.js의 loadCatalog()는 서버 상품 배열을 반환한다. app/api/quote/route.js와 app/api/orders/route.js의 POST(Request) 및 공개 HTTP 경로를 유지한다. 견적 응답은 quote 객체 자체, 주문 응답은 {accepted:true,quote}, 오류는 {error:문자열}이다.
- Quantity A, Quantity B, Coupon, Total, Place order, Retry quote라는 접근 가능한 이름을 사용한다. Coupon은 select 또는 text input일 수 있다. 브라우저 기본 입력값 A=1/B=0이다.
- 오류 표시에는 Checkout error라는 접근 가능한 이름과 alert 또는 aria-live를 제공한다. 오류 해소 시 메시지를 비우거나 표시를 제거한다. 오류의 정확한 문구와 DOM 위치는 자유다.
- package.json·lockfile·설정·공개 기존 테스트는 보존한다. 제품 코드/추가 테스트/작업 기록은 수정·추가 가능하다. 실제 기존 검사의 결과와 미확인 범위를 보고한다. 기준 검사 후 누락된 제품 테스트를 작성한다.
- 추가 모델·하위 에이전트·웹 검색·외부 서비스·패키지 설치·커밋·푸시를 사용하지 않는다. 제공 프로젝트/FS 자료 이외의 정답지·이전 결과·개인 자료를 읽지 않는다.
'''


def prepare(target, variant='starter', dependencies=False, experiment='B'):
    target = Path(target)
    target.mkdir(parents=True, exist_ok=False)
    for name in ('package.json', 'package-lock.json', 'next.config.mjs', 'eslint.config.mjs', 'jsconfig.json', 'AGENTS.md'):
        shutil.copyfile(BASE / name, target / name)
    package = json.loads((target / 'package.json').read_text())
    package['scripts'] = {
        'dev': 'next dev --hostname 127.0.0.1 --port 3217', 'build': 'next build --webpack',
        'lint': 'eslint app src', 'typecheck': 'tsc --noEmit -p tsconfig.check.json',
        'test:unit': 'node --test tests/*.test.mjs', 'test:e2e': 'playwright test',
    }
    files = {
        '.gitignore': 'node_modules/\n.next/\nplaywright-report/\ntest-results/\n',
        'package.json': json.dumps(package, indent=2) + '\n',
        'tsconfig.check.json': json.dumps({'compilerOptions': {'allowJs': True, 'checkJs': False, 'noEmit': True, 'jsx': 'react-jsx', 'target': 'ES2022', 'module': 'NodeNext', 'moduleResolution': 'NodeNext', 'skipLibCheck': True}, 'include': ['app/**/*.js', 'app/**/*.jsx', 'src/**/*.js']}),
        'playwright.config.mjs': "import { defineConfig } from '@playwright/test';\nexport default defineConfig({testDir:'./e2e',workers:1,retries:0,use:{baseURL:'http://127.0.0.1:3217'},webServer:{command:'npm run dev',url:'http://127.0.0.1:3217',reuseExistingServer:false}});\n",
        'app/layout.jsx': "export default function Layout({children}) { return <html lang=\"en\"><body style={{margin:16,fontFamily:'system-ui'}}>{children}</body></html>; }\n",
        'app/page.jsx': "import Checkout from './checkout.jsx';\nexport default function Page() { return <main><h1>Checkout</h1><p>A: 12000 KRW · B: 8000 KRW</p><Checkout /></main>; }\n",
        'app/checkout.jsx': "'use client';\nexport default function Checkout() { return <p>Checkout implementation pending</p>; }\n",
        'src/catalog.js': CATALOG,
        'src/checkout.js': "export function calculateQuote() { throw Object.assign(new Error('Not implemented'), {status:501}); }\n",
        'app/api/quote/route.js': "export async function POST() { return Response.json({error:'Not implemented'}, {status:501}); }\n",
        'app/api/orders/route.js': "export async function POST() { return Response.json({error:'Not implemented'}, {status:501}); }\n",
        'tests/catalog.test.mjs': PUBLIC_TEST, 'e2e/catalog.spec.mjs': PUBLIC_E2E,
        'checkout.contract.json': json.dumps({'quote': {'module': 'src/checkout.js', 'export': 'calculateQuote'}}, indent=2),
        'TASK.md': public_prompt(experiment),
        'common-rules.md': (REPO / 'mandatory-rules/common/review.md').read_text(),
        'frontend-quality.md': (REPO / 'references/frontend-quality.md').read_text(),
    }
    if variant != 'starter':
        pricing = 'src/checkout.js' if variant == 'flat' else 'src/domain/pricing.js'
        files[pricing] = PRICING
        if variant == 'layered':
            del files['src/checkout.js']
            files['src/application/checkout.js'] = "import { calculateQuote } from '../domain/pricing.js';\nexport function createCheckout(loadCatalog) { return async input => calculateQuote(input, await loadCatalog()); }\n"
            files['src/http/checkout.js'] = "import { createCheckout } from '../application/checkout.js';\nimport { loadCatalog } from '../catalog.js';\nconst quoteCart = createCheckout(loadCatalog);\nexport function handler(ordered) { return async request => {\n let input; try { input = await request.json(); } catch { return Response.json({error:'Invalid JSON'}, {status:400}); }\n try { const quote = await quoteCart(input); return Response.json(ordered ? {accepted:true,quote} : quote); }\n catch (error) { return Response.json({error:error.message || 'Request failed'}, {status:error.status || 500}); }\n}; }\n"
            for endpoint in ('quote', 'orders'):
                files[f'app/api/{endpoint}/route.js'] = "import { handler } from '../../../src/http/checkout.js';\nexport const POST = handler(" + str(endpoint == 'orders').lower() + ');\n'
        else:
            for endpoint in ('quote', 'orders'):
                files[f'app/api/{endpoint}/route.js'] = route(pricing, endpoint == 'orders')
        files['checkout.contract.json'] = json.dumps({'quote': {'module': pricing, 'export': 'calculateQuote'}}, indent=2)
        files['app/checkout.jsx'] = FORM
        files['src/controller.js'] = CONTROLLER
        files['tests/checkout.test.mjs'] = REFERENCE_TEST
        lifecycle = (HERE / 'controller-check.mjs').read_text()
        lifecycle = lifecycle.replace("import { resolve } from 'node:path';\n", '').replace("import { pathToFileURL } from 'node:url';\n", '')
        lifecycle = lifecycle.replace("await import(pathToFileURL(resolve(process.argv[2], 'src/controller.js')))", "await import('../src/controller.js')")
        files['tests/controller.test.mjs'] = lifecycle
        files['e2e/checkout.spec.mjs'] = '''import { test, expect } from '@playwright/test';
test('real quote and failed order can recover without losing input', async ({ page }) => {
  let calls = 0;
  await page.route('**/api/orders', route => route.fulfill(++calls === 1
    ? { status: 500, json: { error: 'Temporary failure' } }
    : { json: { accepted: true, quote: { subtotal: 12000, discount: 0, shipping: 3000, total: 15000 } } }));
  await page.goto('/');
  const submit = page.getByRole('button', { name: 'Place order', exact: true });
  await expect(submit).toBeEnabled();
  await expect(page.getByLabel('Total', { exact: true })).toHaveText('15,000 KRW');
  await submit.click(); await expect(page.getByLabel('Checkout error', { exact: true })).toBeVisible();
  await expect(page.getByRole('spinbutton', { name: 'Quantity A', exact: true })).toHaveValue('1');
  await submit.click(); await expect(page.getByText('Order received', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Checkout error', { exact: true })).toHaveCount(0);
});
'''
    for name, content in files.items():
        path = target / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content)
    if dependencies:
        subprocess.run(['cp', '-cR', str(BASE / 'node_modules'), str(target / 'node_modules')], check=True)
    return target


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('target', type=Path)
    parser.add_argument('--variant', choices=['starter', 'flat', 'layered'], default='starter')
    parser.add_argument('--dependencies', action='store_true')
    parser.add_argument('--experiment', choices=['A', 'B'], default='B')
    args = parser.parse_args()
    prepare(args.target, args.variant, args.dependencies, args.experiment)
