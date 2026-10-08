// Development regression comparison, NOT a model/product-quality experiment.
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspectCode } from '../../../../dist/src/application/knowledge/code-triggers.js';
import { contentHash, matchKnowledgeTriggers, readReferenceIndex } from '../../../../dist/src/application/knowledge/reference-index.js';

const directory = dirname(fileURLToPath(import.meta.url));
const repository = resolve(directory, '../../../..');
const baseline = JSON.parse(await readFile(join(directory, 'routing-baseline.json'), 'utf8'));
const current = await readReferenceIndex(join(repository, 'references/learned'));
// Expected topics are explicit development judgments, not independent labels.
const cases = [
  { id: 'aliased-effect', code: 'import {useEffect as sync} from "react"; sync(() => subscribe(), []);', expected: 'react-derived-state-and-effects', technologies: ['React'] },
  { id: 'state-lifetime', code: 'const view = <Editor key={user.id} />;', expected: 'react-identity-and-state', technologies: ['React'], signal: 'react.state-lifetime', interpretation: 'Changing user identity changes the editor state lifetime.' },
  { id: 'dependency-boundary', path: 'src/domain/order.ts', code: 'import {save} from "../adapters/db"; export const order = save;', expected: 'code-quality-change-boundaries' },
  { id: 'interaction-latency', code: 'element.style.width = nextWidth; const width = element.offsetWidth;', expected: 'web-performance-interaction-diagnosis', signal: 'runtime.interaction-latency', interpretation: 'Reported slow interaction contains a style write followed by a geometry read; measurement required.' },
  { id: 'icon-name', code: 'const view = <button onClick={remove}>×</button>;', expected: 'accessibility-names-and-alternatives' },
  { id: 'modal-lifecycle', code: 'const view = <dialog ref={modal}>Confirm</dialog>;', expected: 'accessibility-modal-focus' },
  { id: 'form-submit', code: 'const view = <form onSubmit={save}><input /><button>Save</button></form>;', expected: 'accessibility-native-controls-and-forms' },
  { id: 'input-hint', code: 'const view = <input inputMode="numeric" />;', expected: 'html-editing-and-localization' },
  { id: 'query-freshness', code: 'import {useQuery as query} from "@tanstack/react-query"; query({queryKey:["items"], staleTime:0});', expected: 'tanstack-query-freshness-and-retention', technologies: ['React'] },
  { id: 'compound-boundary', code: 'import {cloneElement} from "react"; const child = cloneElement(children, {selected});', expected: 'react-compound-component-boundaries', technologies: ['React'] },
  { id: 'server-boundary', code: 'import "server-only"; export const value = loadSecret();', expected: 'nextjs-server-client-boundary', technologies: ['Next.js'] },
  { id: 'cascade-context', path: 'theme.css', code: '@layer theme { .button { color: red; } }\n.button { color: blue; }', expected: 'css-cascade-and-value-resolution', signal: 'css-cascade-and-value-resolution', interpretation: 'Competing layered and unlayered declarations require cascade reasoning.' },
  { id: 'shadowed-hook', code: 'function run(useEffect) { useEffect(); }', forbidden: 'react-derived-state-and-effects', technologies: ['React'] },
  { id: 'wrapper-is-not-dom', code: 'const view = <Modal aria-modal={true} />;', forbidden: 'accessibility-modal-focus' },
  { id: 'wrong-framework', code: 'import {useEffect} from "react"; useEffect(() => {});', forbidden: 'react-derived-state-and-effects', technologies: ['Vue'] },
  { id: 'unrelated-code', code: 'export const sum = (a, b) => a + b;', empty: true },
];
const temp = await mkdtemp(join(tmpdir(), 'fs-routing-paired-'));
try {
  const rows = [];
  for (const scenario of cases) {
    const root = join(temp, scenario.id);
    const path = scenario.path ?? 'view.tsx';
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), scenario.code);
    const analysis = await inspectCode(root, [path]);
    const signals = [...analysis.signals, ...(scenario.signal ? [{kind: 'semantic', value: scenario.signal}] : [])];
    const evaluate = (index) => {
      const ids = matchKnowledgeTriggers(index, signals, scenario.technologies ?? []).map(({entry}) => entry.id);
      return { ids, passed: (!scenario.expected || ids.includes(scenario.expected)) &&
        (!scenario.forbidden || !ids.includes(scenario.forbidden)) && (!scenario.empty || !ids.length) };
    };
    rows.push({ ...scenario, evidence: { path, sourceHash: contentHash(scenario.code),
      semanticOrigin: scenario.signal ? 'fixed host interpretation; model selection not measured' : null },
      before: evaluate(baseline), after: evaluate(current) });
  }
  assert.ok(rows.every(({after}) => after.passed));
  const count = (arm, positive) => rows.filter((row) => !!row.expected === positive && row[arm].passed).length;
  const report = { date: new Date().toISOString(), kind: 'paired development routing regression',
    baselineIndexHash: baseline.originalIndexHash,
    currentIndexHash: contentHash(await readFile(join(repository, 'references/learned/index.json'), 'utf8')),
    casesHash: contentHash(JSON.stringify(cases)),
    summary: { requiredTopicCases: 12, negativeCases: 4, before: { requiredTopics: count('before', true), negatives: count('before', false) },
      after: { requiredTopics: count('after', true), negatives: count('after', false) } },
    limits: ['Same cases, fresh file roots, same deterministic extractor; baseline vs current metadata.',
      'Known development cases, not held-out semantic accuracy. Fixed host signals do not test model interpretation.',
      'No generated product, browser run or token usage measured; cannot compare with v2 model-quality scores.'], rows };
  const output = process.argv[2];
  if (output) await writeFile(resolve(output), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report.summary));
} finally { await rm(temp, { recursive: true, force: true }); }
