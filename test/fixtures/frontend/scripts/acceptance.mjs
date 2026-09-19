import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { promisify } from 'node:util';
const exec = promisify(execFile);
async function command(script, expected) {
  let code = 0, output = '';
  try { const result = await exec('npm', ['run', script], { timeout: 180000, maxBuffer: 10 * 1024 * 1024, env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' } }); output = result.stdout + result.stderr; }
  catch (error) { code = error.code; output = `${error.stdout}\n${error.stderr}`; }
  if (expected) { assert.notEqual(code, 0, `Violation passed ${script}`); assert.match(output, expected, `Wrong failure for ${script}: ${output}`); }
  else assert.equal(code, 0, `${script} failed: ${output}`);
}
async function mutation(path, transform, script, diagnostic) {
  const original = await readFile(path, 'utf8');
  try { await writeFile(path, transform(original)); await command(script, diagnostic); }
  finally { await writeFile(path, original); }
}
for (const script of ['lint', 'typecheck', 'check:boundaries', 'test:unit', 'build']) await command(script);
await mutation('app/order-form.jsx', text => text.replace("  const [status", "  if (!children) return null;\n  const [status"), 'lint', /react-hooks\/rules-of-hooks/);
await mutation('app/order-form.jsx', text => text.replace('{children}', '{children}<img src="/example.png" />'), 'lint', /jsx-a11y\/alt-text/);
for (const syntax of ["import { price } from '../cart/internal/price.js'; export const total = price;", "export { price } from '@/features/cart/internal/price.js';", "export const total = import('../cart/internal/price.js');"]) {
  await mutation('src/features/checkout/index.js', () => syntax, 'check:boundaries', /FEATURE_BOUNDARY/);
}
await mutation('src/domain/orders.js', text => text.replace('if (pending) return false;', 'if (pending) return true;'), 'test:unit', /AssertionError|ERR_ASSERTION/);
for (const target of ['@/server/catalog', '@/server/public']) {
  await mutation('app/order-form.jsx', text => text.replace("import { useState }", `import { serverLabel } from '${target}';\nimport { useState }`).replace('{children}', '{children}{serverLabel()}'), 'build', /server-only|only works in a Server Component/);
}
for (const script of ['lint', 'typecheck', 'check:boundaries', 'test:unit', 'build']) await command(script);
console.log('Frontend acceptance: valid fixtures passed; hooks, accessibility, import/re-export/dynamic boundary, domain mutation and server-only violations rejected.');
