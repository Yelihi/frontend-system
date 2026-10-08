import { fixtureJudgments } from './design-evidence-fixture.js';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, writeFile, readFile, rm, mkdir, cp } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { FileSystemProjectDiscovery } from '../src/adapters/filesystem/project-discovery.js';
import { writeProjectArtifacts } from '../src/application/project-store.js';
import { readProjectEvidence, validateProjectEvidence, type ProjectEvidence } from '../src/application/design-evidence.js';
import { taskContext, summarizeTaskContext } from '../src/application/task-context.js';
import { contentHash } from '../src/application/knowledge/reference-index.js';
import { routeKnowledge } from '../src/application/knowledge/routing.js';
import { retrieveProjectFacts } from '../src/application/project-facts.js';
import { git } from '../src/application/git-state.js';
import { projectDocumentHash, projectSnapshot } from '../src/application/project-snapshot.js';

const system = process.cwd();
const discovery = new FileSystemProjectDiscovery();
const view = 'import {request} from "./request.mjs";\nexport const load = () => request();\n';
const request = {raw: 'xyzunique', mode: 'prepare' as const, constraints: [], files: ['view.mjs']};
const interpretation = {path: 'view.mjs', line: 2, evidence: 'request()', signal: 'network.request-policy-boundary', interpretation: 'The host traced load through the shared request boundary'};
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'fs-facts-'));
  await writeFile(join(root, 'package.json'), '{"type":"module"}');
  await writeFile(join(root, 'view.mjs'), view);
  await writeFile(join(root, 'request.mjs'), 'export const request = () => 42;\n');
  await writeFile(join(root, 'unrelated.mjs'), 'export const unrelated = 1;\n');
  return root;
}
async function evidence(root: string): Promise<ProjectEvidence> {
  const paths = (await discovery.listFiles(root)).map(path => relative(root, path)).filter(path => !path.startsWith('.frontend-system/'));
  return {version: 1, coverage: paths.map(path => ({path, status: 'inspected', reason: 'Test fixture inspected'})),
    statements: [{id: 'request-boundary', kind: 'interpretation', statement: 'load delegates to the existing request interface',
      evidence: [{path: 'view.mjs', line: 2, quote: 'request()', hash: contentHash(view)}],
      limitations: ['Runtime response handling remains unmeasured'], reuse: {dependencies: ['view.mjs', 'request.mjs'], interpretations: [{...interpretation}]}}]};
}
async function save(root: string, input = evidence(root)) {
  const snapshot = await projectSnapshot(root);
  await writeProjectArtifacts(await discovery.discover(await discovery.createRef(root)), {
    summary: 'Scoped request analysis', observed: [], architecture: [], conventions: [], decisions: [], qualityGates: [], assumptions: [], questions: [], evidence: await input,
  }, {expectedCommit: snapshot.commit, expectedHash: await projectDocumentHash(root)});
}

test('saved project facts route implicit boundaries across processes and invalidate dependencies, not unrelated edits', async () => {
  const root = await fixture();
  try {
    await save(root);
    const first = await taskContext(discovery, system, root, request);
    assert.equal(first.projectFacts.facts[0]?.reusedTriggers, 1);
    assert.ok('candidates' in first.routing && first.routing.candidates.some(item => item.id === 'request-policy-boundaries'));
    const summary = summarizeTaskContext(first);
    assert.equal(summary.planPrerequisites.projectAnalysis, 'recorded');
    assert.doesNotMatch(summary.next, /Before save_revision/);
    assert.ok(!JSON.stringify(summary.projectFacts).includes('export const load'), 'Summary must not resend source bodies');
    const child = await promisify(execFile)(process.execPath, ['--input-type=module', '-e', `
      import {taskContext} from ${JSON.stringify(new URL('../src/application/task-context.js', import.meta.url).href)};
      import {FileSystemProjectDiscovery} from ${JSON.stringify(new URL('../src/adapters/filesystem/project-discovery.js', import.meta.url).href)};
      const result = await taskContext(new FileSystemProjectDiscovery(), process.argv[1], process.argv[2], ${JSON.stringify(request)});
      process.stdout.write(JSON.stringify(result.projectFacts.facts));`, system, root]);
    assert.equal(JSON.parse(child.stdout)[0].reusedTriggers, 1, 'Reuse must not depend on the receipt map or previous model session');
    await writeFile(join(root, 'unrelated.mjs'), 'export const unrelated = 2;\n');
    assert.equal((await taskContext(discovery, system, root, request)).projectFacts.facts[0]?.reusedTriggers, 1);
    await writeFile(join(root, 'request.mjs'), 'export const request = () => 500;\n');
    const stale = await taskContext(discovery, system, root, request);
    assert.equal(stale.projectFacts.facts[0]?.reusedTriggers, 0);
    assert.ok(stale.projectFacts.facts[0]?.reasons.some(reason => reason.includes('request.mjs')));
    assert.ok('request' in first.routing);
    await assert.rejects(routeKnowledge(root, system, first.routing.request), /Fact dependency changed/);
    assert.ok('candidates' in stale.routing && !stale.routing.candidates.some(item => item.id === 'request-policy-boundaries'));
  } finally { await rm(root, {recursive: true, force: true}); }
});

test('fact reuse respects configuration additions, knowledge sync, absence claims, explicit interpretations and legacy records', async () => {
  const root = await fixture();
  const copy = await mkdtemp(join(tmpdir(), 'fs-fact-knowledge-'));
  try {
    const input = await evidence(root);
    input.statements.push({...input.statements[0]!, id: 'absence', absence: true, scope: ['view.mjs', 'request.mjs'], limitations: ['Only the inspected inventory; no external packages']});
    await save(root, Promise.resolve(input));
    const record = (await readProjectEvidence(root)).record;
    const reuse = () => retrieveProjectFacts(root, system, record, ['view.mjs']);
    const conflicting = structuredClone(record);
    conflicting.statements[1]!.reuse!.interpretations[0]!.interpretation = 'A conflicting saved interpretation';
    const conflict = await retrieveProjectFacts(root, system, conflicting, ['view.mjs']);
    assert.equal(conflict.interpretations.length, 0);
    assert.ok(conflict.facts.every(item => item.status === 'needs-review'));
    const overflow = structuredClone(record);
    overflow.statements = Array.from({length: 21}, (_, i) => ({...structuredClone(record.statements[0]!), id: `copy-${i}`}));
    overflow.factBindings = Object.fromEntries(overflow.statements.map(item => [item.id, record.factBindings['request-boundary']!]));
    const bounded = await retrieveProjectFacts(root, system, overflow, ['view.mjs']);
    assert.equal(bounded.omitted, 1); assert.equal(bounded.interpretations.length, 1, 'Identical saved signals must be deduplicated');
    const explicit = {...interpretation, interpretation: 'New host observation'};
    const override = await retrieveProjectFacts(root, system, record, ['view.mjs'], [explicit]);
    assert.deepEqual(override.interpretations, [explicit]);
    assert.equal(override.guards.length, 0);
    await writeFile(join(root, 'added.mjs'), 'export const added = 1;');
    const added = await reuse();
    assert.equal(added.facts[0]?.status, 'current');
    assert.ok(added.facts[1]?.reasons.includes('Absence scope inventory changed'));
    await writeFile(join(root, 'tsconfig.json'), '{}');
    assert.ok((await reuse()).facts[0]?.reasons.includes('Configuration inventory changed'));
    await rm(join(root, 'tsconfig.json'));
    await writeFile(join(root, 'package.json'), '{"type":"module","imports":{"#request":"./request.mjs"}}');
    assert.ok((await reuse()).facts[0]?.reasons.some(reason => reason.includes('package.json')));
    await writeFile(join(root, 'package.json'), '{"type":"module"}');
    await mkdir(join(copy, 'references'), {recursive: true});
    await cp(join(system, 'references/learned'), join(copy, 'references/learned'), {recursive: true});
    const path = join(copy, 'references/learned/index.json');
    const index = JSON.parse(await readFile(path, 'utf8'));
    index.entries[0].title += ' updated';
    await writeFile(path, JSON.stringify(index));
    assert.equal((await retrieveProjectFacts(root, copy, record, ['view.mjs'])).facts[0]?.status, 'current', 'Unrelated knowledge metadata must not invalidate semantic facts');
    index.entries.find((entry: {id: string}) => entry.id === 'request-policy-boundaries').triggers.find((value: {kind: string; value: string}) => value.kind === 'semantic' && value.value === interpretation.signal).description += ' changed meaning';
    await writeFile(path, JSON.stringify(index));
    assert.ok((await retrieveProjectFacts(root, copy, record, ['view.mjs'])).facts[0]?.reasons.some(reason => reason.includes('Knowledge trigger changed')));
    delete input.statements[0]!.reuse;
    input.statements.splice(1);
    await save(root, Promise.resolve(input).then(async value => ({...value, coverage: (await evidence(root)).coverage})));
    const legacy = await taskContext(discovery, system, root, request);
    assert.equal(legacy.projectFacts.facts[0]?.status, 'needs-review');
    assert.equal(legacy.projectFacts.guards.length, 0);
  } finally { await rm(root, {recursive: true, force: true}); await rm(copy, {recursive: true, force: true}); }
});

test('reusable facts require inspected dependency citations and stay pinned to main snapshots', async () => {
  const root = await fixture();
  try {
    const input = await evidence(root);
    input.statements[0]!.reuse!.interpretations[0]!.evidence = 'invented';
    await assert.rejects(validateProjectEvidence(root, input, 'main', null), /quote a declared/);
    input.statements[0]!.reuse!.interpretations = [{...interpretation}];
    input.coverage.find(item => item.path === 'request.mjs')!.status = 'pending';
    await assert.rejects(validateProjectEvidence(root, input, 'main', null), /Statement request-boundary:.*inspected coverage.*request.mjs/);
    input.coverage.find(item => item.path === 'request.mjs')!.status = 'inspected';
    input.statements[0]!.scope = ['src'];
    await assert.rejects(validateProjectEvidence(root, input, 'main', null), /Statement request-boundary:.*Missing or uninspected: src.*exact file paths/);
    input.statements[0]!.scope = [];
    input.statements[0]!.kind = 'unknown';
    await assert.rejects(validateProjectEvidence(root, input, 'main', null), /Only cited code facts/);
    await git(root, ['init', '-b', 'main']);
    await git(root, ['config', 'user.email', 'fixture@example.test']); await git(root, ['config', 'user.name', 'Fixture']);
    await git(root, ['add', '.']); await git(root, ['commit', '-m', 'fixture']);
    await save(root);
    const snapshot = await projectSnapshot(root);
    await writeFile(join(root, 'request.mjs'), 'export const request = () => 500;');
    assert.equal((await taskContext(discovery, system, root, request)).projectFacts.facts[0]?.reusedTriggers, 0);
    const pinned = await taskContext(discovery, system, root, {...request, snapshot: {baseRef: 'main', expectedCommit: snapshot.commit!}});
    assert.equal(pinned.projectFacts.facts[0]?.reusedTriggers, 1);
  } finally { await rm(root, {recursive: true, force: true}); }
});

test('bundled MCP resolves a new user answer through atomic route/decision patches without losing evidence gates', async () => {
  const root = await fixture();
  const client = new Client({name: 'project-fact-test', version: '1'});
  try {
    await client.connect(new StdioClientTransport({command: process.execPath, args: [join(system, 'bundle/mcp.js')]}));
    const call = async (name: string, args: Record<string, unknown>) => {
      const response = await client.callTool({name, arguments: {projectPath: root, ...args}});
      assert.ok(!response.isError, JSON.stringify(response));
      return JSON.parse((response.content as Array<{text: string}>)[0]!.text);
    };
    await git(root, ['init', '-b', 'main']);
    await git(root, ['config', 'user.email', 'fixture@example.test']); await git(root, ['config', 'user.name', 'Fixture']);
    await git(root, ['add', '.']); await git(root, ['commit', '-m', 'fixture']);
    const commit = (await projectSnapshot(root)).commit;
    const sources = await call('read_project_source', {path: ['view.mjs', 'request.mjs'], expectedCommit: commit, limit: 5});
    assert.equal(sources.files.length, 2);
    for (const file of sources.files) {
      const rest = await call('read_project_source', {path: file.path, expectedCommit: commit, offset: file.nextOffset});
      assert.equal(file.content + rest.content, await readFile(join(root, file.path), 'utf8'));
      assert.equal(rest.hash, file.hash);
    }
    const index = JSON.parse(await readFile(join(system, 'references/learned/index.json'), 'utf8'));
    const ids = index.entries.slice(0, 2).map((entry: {id: string}) => entry.id);
    const references = await call('read_learned_knowledge', {id: ids, limit: 5});
    assert.equal(references.references.length, 2);
    for (const reference of references.references) {
      const full = await call('read_learned_knowledge', {id: reference.entry.id});
      assert.deepEqual(reference.entry, full.entry);
      assert.equal(reference.content, full.content.slice(0, 5));
      assert.equal(reference.nextOffset, 5);
    }
    assert.equal((await client.callTool({name: 'read_project_source', arguments: {projectPath: root, path: [], expectedCommit: commit}})).isError, true);
    assert.equal((await client.callTool({name: 'read_learned_knowledge', arguments: {id: [ids[0], 'missing-reference']}})).isError, true);
    const incomplete = await evidence(root);
    delete incomplete.statements[0]!.reuse;
    const missingReuse = await client.callTool({name: 'save_project_context', arguments: {projectPath: root, expectedCommit: commit, expectedHash: null, analysis: {summary: 'Missing reuse decision', evidence: incomplete}}});
    assert.equal(missingReuse.isError, true);
    await assert.rejects(readFile(join(root, '.frontend-system/project.md')), /ENOENT/);
    const contextDraft='.frontend-system/drafts/project.json';
    await mkdir(join(root,'.frontend-system/drafts'),{recursive:true});
    await writeFile(join(root,contextDraft),JSON.stringify({analysis:{summary:'Inspected boundary',evidence:await evidence(root)}}));
    const ambiguous=await client.callTool({name:'save_project_context',arguments:{projectPath:root,expectedCommit:commit,expectedHash:null,draftFile:contextDraft,analysis:{summary:'Ambiguous'}}});
    assert.equal(ambiguous.isError,true);
    const saved = await call('save_project_context', {expectedCommit: commit, expectedHash: null, draftFile:contextDraft});
    assert.deepEqual(saved.reuse.bound, ['request-boundary']);
    const invalidPayload = await client.callTool({name: 'save_revision', arguments: {projectPath: root, planId: 'boundary', expectedHash: null, content: 'Invalid', evidence: {decisions: 'invented'}}});
    assert.equal(invalidPayload.isError, true, 'Compact discovery must still validate inline nested payloads');
    assert.match(JSON.stringify(invalidPayload), /decisions/);
    const context = await call('get_work_context', {request: request.raw, mode: request.mode, files: request.files});
    assert.equal(context.projectFacts.facts[0].reusedTriggers, 1);
    const first = await call('save_revision', {planId: 'boundary', expectedHash: null, content: 'Keep the request boundary',
      policy: {version: 1, rules: [], checks: [], reviews: [], guards: [], exceptions: []},
      issues: [{id: 'boundary', title: 'Boundary', contract: 'Preserve request delegation', files: ['view.mjs'], dependsOn: [], requiredCheckIds: [], acceptance: ['Preserve delegation']}],
      evidence: {routes: [{contextId: context.contextId, judgments: await fixtureJudgments(root,context.routing.candidates,['request.mjs'])}],
        decisions: [{id: 'boundary', question: 'Preserve delegation?', evidence: [{path: 'view.mjs', line: 2, quote: 'request()'}], knowledgeIds: [], options: [{id: 'preserve', description: 'Preserve', cost: 'Review'}], status: 'open', authority: 'user', confirmation: '', rationale: 'Await user choice', reconsiderWhen: 'Contract changes', ruleIds: [], issueIds: ['boundary']}]}});
    await writeFile(join(root, 'USER_DECISIONS.md'), 'Preserve the request boundary.');
    const updates = [{id: 'boundary', changes: {status: 'resolved', selected: 'preserve', confirmation: 'User answered preserve', rationale: 'Supplied answer',
      evidence: [{path: 'USER_DECISIONS.md', quote: 'Preserve the request boundary.'}], ruleIds: ['delegation'], issueIds: ['boundary']}}];
    const policy = {rules: [{id: 'delegation', title: 'Preserve delegation', statement: 'Preserve the request boundary', layer: 'architecture', obligation: 'required', verification: 'review'}],
      checks: [], reviews: [{id: 'delegation-review', ruleIds: ['delegation'], description: 'Check the actual caller and boundary'}], guards: []};
    const patchArgs = {projectPath: root, planId: 'boundary', expectedHash: first.hash, policy, decisionUpdates: updates};
    const unbound = await client.callTool({name: 'save_revision', arguments: patchArgs});
    assert.equal(unbound.isError, true, 'A new answer cannot silently bind to the old route');
    assert.match(JSON.stringify(unbound), /evidenceRoutes/);
    const fresh = await call('get_work_context', {request: request.raw, mode: request.mode, files: request.files, requirements: ['USER_DECISIONS.md']});
    assert.equal((await client.callTool({name: 'save_revision', arguments: patchArgs})).isError, true, 'Reading a new context alone must not silently replace routes');
    const route = {contextId: fresh.contextId, judgments: await fixtureJudgments(root,fresh.routing.candidates,['request.mjs'])};
    const invalid = await client.callTool({name: 'save_revision', arguments: {...patchArgs, evidenceRoutes: [{...route, judgments: [...route.judgments, {referenceId: 'invented', decision: 'apply', rationale: 'Must fail'}]}]}});
    assert.equal(invalid.isError, true);
    assert.equal((await call('get_revision', {planId: 'boundary', detail: 'decisions'})).hash, first.hash, 'Failed patches must be atomic');
    const draftFile = '.frontend-system/drafts/boundary.json';
    await mkdir(join(root, '.frontend-system/drafts'), {recursive: true});
    await writeFile(join(root, draftFile), JSON.stringify({policy, decisionUpdates: updates}));
    const draftArgs = {projectPath: root, planId: 'boundary', expectedHash: first.hash, draftFile};
    assert.equal((await client.callTool({name: 'save_revision', arguments: draftArgs})).isError, true, 'File input cannot bypass the missing answer route');
    assert.equal((await call('get_revision', {planId: 'boundary'})).hash, first.hash);
    await writeFile(join(root, draftFile), JSON.stringify({policy, decisionUpdates: updates, evidenceRoutes: [route], approval: 'Invented approval'}));
    assert.equal((await client.callTool({name: 'save_revision', arguments: draftArgs})).isError, true, 'Draft cannot smuggle approval or unsupported fields');
    await writeFile(join(root, draftFile), JSON.stringify({policy, decisionUpdates: updates, evidenceRoutes: [route]}));
    assert.equal((await client.callTool({name: 'save_revision', arguments: {...draftArgs, content: 'Conflicting inline payload'}})).isError, true);
    const next = await call('save_revision', draftArgs);
    assert.equal(next.draftSource.hash, contentHash(await readFile(join(root, draftFile), 'utf8')));
    assert.equal((await client.callTool({name: 'save_revision', arguments: draftArgs})).isError, true, 'File transport still rejects a stale revision hash');
    assert.equal(next.approved, false);
    assert.deepEqual(next.contractDiagnostics, []);
    const choices = await call('get_revision', {planId: 'boundary', detail: 'decisions', expectedHash: next.hash});
    assert.equal(choices.decisions[0].selected, 'preserve');
    assert.equal(choices.decisions[0].question, 'Preserve delegation?');
    assert.equal(choices.decisions[0].evidence[0].line, 1, 'The stored evidence retains the resolved source position');
    assert.deepEqual(choices.decisions[0].ruleIds, ['delegation']);
    assert.deepEqual(choices.decisions[0].issueIds, ['boundary']);
    await call('approve_revision', {planId: 'boundary', expectedHash: next.hash, approval: 'User approved the resolved boundary'});
    await writeFile(join(root, 'USER_DECISIONS.md'), 'Changed answer');
    const changedAnswer = await client.callTool({name: 'approve_revision', arguments: {projectPath: root, planId: 'boundary', expectedHash: next.hash, approval: 'Cannot approve stale answer'}});
    assert.equal(changedAnswer.isError, true);
    assert.match(JSON.stringify(changedAnswer), /USER_DECISIONS.md/);
    await writeFile(join(root, 'USER_DECISIONS.md'), 'Preserve the request boundary.');
    await writeFile(join(root, 'request.mjs'), 'export const request = () => 500;');
    const rejected = await client.callTool({name: 'approve_revision', arguments: {projectPath: root, planId: 'boundary', expectedHash: next.hash, approval: 'User approved'}});
    assert.equal(rejected.isError, true, 'Dependency guard must survive receipt binding and block approval');
  } finally { await client.close(); await rm(root, {recursive: true, force: true}); }
});
