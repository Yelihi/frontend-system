// This is a readiness check, not a model benchmark or an authorization override.
import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
const output = resolve(process.argv[2] || 'test/evals/fs-comparison/v2/results/preflight');
await mkdir(output, { recursive: true });
const result = { checkedAt: new Date().toISOString(), node: process.version, platform: process.platform, modelCalls: 0, checks: {}, readyForModelRuns: false };
result.checks.localHttp = await new Promise(resolveCheck => {
  const server = createServer((_, response) => response.end('ok'));
  server.once('error', error => resolveCheck({ passed: false, code: error.code, message: error.message }));
  server.listen(0, '127.0.0.1', () => server.close(() => resolveCheck({ passed: true })));
});
try {
  const { chromium } = await import('../../../fixtures/frontend/node_modules/@playwright/test/index.mjs');
  const browser = await chromium.launch({ headless: true });
  await browser.close(); result.checks.chromium = { passed: true };
} catch (error) { result.checks.chromium = { passed: false, message: String(error) }; }
result.checks.oracleIsolation = { passed: false, status: 'not-configured' };
result.checks.fullCalibration = { passed: false, status: 'not-complete' };
const sha = value => createHash('sha256').update(value).digest('hex');
try {
  const readiness = JSON.parse(await readFile(new URL('./results/readiness.json', import.meta.url), 'utf8'));
  for (const [path, expected] of Object.entries(readiness.evidenceHashes)) {
    if (sha(await readFile(new URL(path, import.meta.url))) !== expected) throw new Error(`Changed readiness evidence: ${path}`);
  }
  if (!readiness.readyForModelRuns || !Object.values(readiness.checks).every(Boolean)) throw new Error('Readiness review is incomplete');
  result.checks.oracleIsolation = { passed: true, status: 'verified-in-real-command-mcp-browser-sessions' };
  result.checks.fullCalibration = { passed: true, status: 'automated-browser-and-independent-semantic-review-verified' };
} catch (error) { result.readinessError = String(error); }
try {
  const frozen = JSON.parse(await readFile(new URL('./frozen.json', import.meta.url), 'utf8'));
  const bytes = await readFile(resolve(frozen.output, 'manifest.json'));
  if (sha(bytes) !== frozen.manifestSha256) throw new Error('Manifest hash mismatch');
  const manifest = JSON.parse(bytes);
  for (const [path, expected] of Object.entries(manifest.files)) {
    if (sha(await readFile(new URL('../' + path, import.meta.url))) !== expected) throw new Error(`Changed evaluator: ${path}`);
  }
  for (const [path, expected] of Object.entries(manifest.fsSnapshot.files)) {
    if (sha(await readFile(new URL('../../../../' + path, import.meta.url))) !== expected) throw new Error(`Changed FS snapshot: ${path}`);
  }
  result.frozenManifest = frozen;
  result.checks.frozenManifest = { passed: true, status: 'hashes-verified' };
} catch (error) { result.checks.frozenManifest = { passed: false, status: 'not-frozen-or-changed', error: String(error) }; }
result.readyForModelRuns = Object.values(result.checks).every(check => check.passed);
await writeFile(resolve(output, 'preflight.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ output, readyForModelRuns: result.readyForModelRuns, checks: Object.fromEntries(Object.entries(result.checks).map(([key, value]) => [key, value.passed])) }));
process.exitCode = result.readyForModelRuns ? 0 : 2;
