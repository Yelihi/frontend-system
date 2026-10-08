// Read-only, post-hoc diagnosis. No model calls, sync publication or quality score.
import {readFile, writeFile} from 'node:fs/promises';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {knowledgeStatus, validateKnowledgeSync} from '../../../../../dist/src/application/knowledge/catalog.js';
import {contentHash, readReferenceIndex} from '../../../../../dist/src/application/knowledge/reference-index.js';
import {discoverKnowledgeTriggers, inspectCodeKnowledge} from '../../../../../dist/src/application/knowledge/trigger-review.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../../../../..');
const results = resolve(process.argv[2] ?? join(here, 'results/2026-10-02T131547'));
const output = resolve(process.argv[3] ?? join(here, 'knowledge-audit.json'));
const manifest = JSON.parse(await readFile(join(results, 'manifest.json'), 'utf8'));
const indexBody = await readFile(join(root, 'references/learned/index.json'), 'utf8');
const index = await readReferenceIndex(join(root, 'references/learned'));
const status = await knowledgeStatus(root);
const integrity = await validateKnowledgeSync(root, []); // Checks hashes/mapping, not source-review approval.
const stages = [];
for (const stage of ['initial', 'policy-change', 'transport-change']) {
  const log = `gpt-6-sol-0-fs/${stage}/0/model/events.jsonl`;
  const events = (await readFile(join(results, log), 'utf8')).trim().split('\n').map(line => JSON.parse(line));
  const calls = events.filter(event => event.type === 'item.completed' && event.item?.type === 'mcp_tool_call').map(event => event.item);
  stages.push({stage, log, judgmentSaves: calls.filter(call => call.tool === 'save_knowledge_review').length,
    routing: calls.filter(call => ['discover_knowledge_triggers', 'inspect_code_knowledge'].includes(call.tool)).map(call => {
      const text = (call.result?.content ?? []).filter(item => item.type === 'text').map(item => item.text).join('\n');
      try {
        const result = JSON.parse(text);
        return {tool: call.tool, input: call.arguments, ids: (result.entries ?? result.candidates ?? []).map(entry => entry.id),
          checklistCount: result.checklist?.length ?? null};
      } catch { return {tool: call.tool, input: call.arguments, error: text}; }
    })});
}
const probes = [];
for (const input of [{query: 'shared domain policy injected load send'},
  {query: '응집도 결합도 중복 변경 경계', domains: ['architecture']},
  {domains: ['code-quality']}, {domains: ['architecture']}]) {
  const result = await discoverKnowledgeTriggers(root, input);
  probes.push({input, ids: result.entries.map(entry => entry.id)});
}
const project = join(results, 'gpt-6-sol-0-fs/policy-change/0/snapshot');
const code = await readFile(join(project, 'checkout.mjs'), 'utf8');
const evidence = 'const totalCents = quote(await load());';
const line = code.split('\n').findIndex(value => value.includes(evidence)) + 1;
if (!line) throw new Error('Diagnostic evidence no longer exists');
const inspection = {files: ['checkout.mjs', 'policy.mjs']};
const plain = await inspectCodeKnowledge(project, root, inspection);
const interpreted = await inspectCodeKnowledge(project, root, {...inspection, interpretations: [{
  path: 'checkout.mjs', line, evidence, signal: 'architecture.dependency-boundary',
  interpretation: 'Inspect the boundary between injected load/send and shared quote policy used by preview and submit.',
}]});
const sampleSource = 'frontend-fundamentals-code-quality-coupling-allow-duplication';
let sourceGate;
try { await validateKnowledgeSync(root, [sampleSource]); sourceGate = 'approved'; }
catch (error) { sourceGate = error.message; }
const report = {
  kind: 'Post-hoc local integrity/routing diagnosis; not a held-out model evaluation', date: new Date().toISOString(),
  modelCalls: 0, experimentManifestHash: manifest.hash,
  currentIndexMatchesExperiment: contentHash(indexBody) === manifest.runtime.references['learned/index.json'],
  integrity: {sourceCount: status.outcomes.length, referenceCount: integrity.referenceCount,
    changed: status.changed, deleted: status.deleted, uncataloged: status.uncataloged,
    affectedReferences: status.affectedReferences, unpublishedCount: status.unpublished.length,
    sourceReviewCounts: Object.fromEntries(Object.entries(status.sourceReviews).map(([key, ids]) => [key, ids.length])),
    retrievalChecks: {passed: integrity.retrievalChecks.filter(check => check.passed).length, total: integrity.retrievalChecks.length},
    triggerChecks: {passed: integrity.triggerChecks.filter(check => check.passed).length, total: integrity.triggerChecks.length},
    sampleSourceReviewGate: {id: sampleSource, result: sourceGate}},
  routing: {directCount: status.routing.direct.length,
    semanticOnlyCount: index.entries.filter(entry => entry.routing?.mode === 'direct' && entry.triggers.every(trigger => trigger.kind === 'semantic')).length,
    localDiscoveryProbes: probes, diagnosticInspection: {
      source: 'FS policy-change completed snapshot; explicit host interpretation added for diagnosis only',
      staticOnlyIds: plain.candidates.map(entry => entry.id), withHostInterpretationIds: interpreted.candidates.map(entry => entry.id)}},
  observedModelRouting: stages,
  limits: ['Hash and mapping checks do not establish faithful preservation of every original claim.',
    'legacy-unreviewed means no new structured source-review record; older prose review notes may exist.',
    'Known development checks and post-hoc probes do not measure held-out retrieval accuracy.',
    'Missing dedicated judgment records do not prove knowledge was ignored: direct shell reads and plan notes also occurred.',
    'The original experiment provided fixed requirements and no user answer loop; tradeoff elicitation was not tested.'],
};
await writeFile(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({output, modelCalls: 0, currentIndexMatchesExperiment: report.currentIndexMatchesExperiment, integrity: report.integrity, routing: report.routing}));
