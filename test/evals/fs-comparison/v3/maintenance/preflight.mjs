import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

let input = '';
for await (const chunk of process.stdin) input += chunk;
const config = JSON.parse(input);
const value = key => JSON.parse(config.find(line => line.startsWith(key + '=')).slice(key.length + 1));
const client = new Client({name: 'maintenance-preflight', version: '1'});
try {
  await client.connect(new StdioClientTransport({
    command: value('mcp_servers.frontend-system.command'), args: value('mcp_servers.frontend-system.args'),
    cwd: process.argv[2], env: {...process.env},
  }));
  const snapshot = await client.callTool({name:'get_project_snapshot',arguments:{projectPath:process.argv[2]}});
  assert.ok(!snapshot.isError, JSON.stringify(snapshot));
  const parsed = JSON.parse(snapshot.content[0].text);
  assert.equal(parsed.status, 'versioned');
  assert.equal(parsed.baseRef, 'main');
  assert.ok(parsed.commit);
  const names = new Set((await client.listTools()).tools.map(({name}) => name));
  for (const name of ['get_work_context', 'inspect_code_knowledge', 'discover_knowledge_triggers', 'save_project_context', 'save_revision', 'approve_revision', 'save_execution']) assert.ok(names.has(name), `Missing ${name}`);
  const call = async (name, args) => {
    const response = await client.callTool({name, arguments: {projectPath: process.argv[2], ...args}});
    assert.ok(!response.isError, JSON.stringify(response));
    return JSON.parse(response.content[0].text);
  };
  const files = [...parsed.files];
  let offset = parsed.nextOffset;
  while (offset !== null) {
    const page = await call('get_project_snapshot', {offset, expectedCommit: parsed.commit});
    files.push(...page.files); offset = page.nextOffset;
  }
  const path = files.find(file => /\.[cm]?[jt]sx?$/.test(file) && !file.startsWith('.frontend-system/'));
  assert.ok(path, 'Preflight needs a source file');
  const source = await call('read_project_source', {path, expectedCommit: parsed.commit, limit: 12000});
  assert.equal(source.nextOffset, null, 'Choose a bounded preflight source');
  const citation = {path, line: 1, quote: source.content.split('\n')[0], hash: createHash('sha256').update(source.content).digest('hex')};
  assert.equal(source.hash, citation.hash);
  delete citation.hash; // The pinned baseline determines the hash; no model-side copying needed.
  const analysis = await call('save_project_context', {expectedCommit: parsed.commit, expectedHash: parsed.documentHash,
    analysis: {summary: 'Synthetic preflight only',
      evidence: {version: 1, coverage: files.filter(file => !file.startsWith('.frontend-system/')).map(file => ({path: file, status: file === path ? 'inspected' : 'excluded', reason: 'Synthetic preflight scope, not a whole-project semantic review'})),
        statements: [{id: 'preflight', kind: 'fact', statement: 'Selected source was read', evidence: [citation],
          reuseReason: 'Protocol probe confirms a source read; it does not establish a semantic trigger.'}]}}});
  assert.deepEqual(analysis.reuse.bound, []);
  assert.deepEqual(analysis.reuse.excluded.map(({id}) => id), ['preflight']);
  const context = await call('get_work_context', {request: 'Synthetic protocol source-presence probe', files: [path], mode: 'prepare'});
  assert.ok(context.routing.hash && context.contextId, 'Routing must execute, not return an instruction');
  const issue = {id: 'probe', title: 'Probe only', contract: 'Do not change product files', files: [path], dependsOn: [], requiredCheckIds: [], acceptance: ['Evidence gates respond']};
  const policy = {version: 1, rules: [], checks: [], reviews: [], guards: [], exceptions: []};
  const draft = await call('save_revision', {planId: 'preflight-probe', content: 'Synthetic probe', expectedHash: null, issues: [issue], policy});
  const refused = await client.callTool({name: 'approve_revision', arguments: {projectPath: process.argv[2], planId: 'preflight-probe', expectedHash: draft.hash, approval: 'Synthetic preflight'}});
  assert.ok(refused.isError, 'Missing evidence must block approval');
  const evidence = {version: 1,
    routes: [{contextId: context.contextId, judgments: context.routing.candidates.map(({id}) => ({referenceId: id, decision: 'needs-context', rationale: 'Protocol probe has not performed the knowledge investigation; no applicability decision is claimed.'}))}],
    decisions: [{id: 'probe', question: 'Keep fixture unchanged?', evidence: [citation], knowledgeIds: [], options: [{id: 'keep', description: 'Retain fixture', cost: 'No product work'}], selected: 'keep', status: 'resolved', authority: 'user', confirmation: 'Synthetic preflight authorization', rationale: 'Protocol probe', reconsiderWhen: 'Real product task', ruleIds: [], issueIds: ['probe']}]};
  const revision = await call('save_revision', {planId: 'preflight-probe', content: 'Synthetic probe', expectedHash: draft.hash, evidence});
  assert.equal(revision.evidenceStatus, 'recorded');
  assert.equal(revision.evidence, undefined, 'Receipt must not echo routing snapshots');
  const contract = await call('get_revision', {planId: 'preflight-probe', expectedHash: revision.hash});
  const full = await call('get_revision', {planId: 'preflight-probe', detail: 'full', expectedHash: revision.hash});
  assert.equal(contract.content, full.content);
  assert.deepEqual(contract.policy, full.policy);
  assert.deepEqual(contract.issues, full.issues);
  assert.ok(full.evidence.routes.length);
  assert.equal(contract.evidence, undefined);
  const staleRead = await client.callTool({name: 'get_revision', arguments: {projectPath: process.argv[2], planId: 'preflight-probe', expectedHash: 'stale'}});
  assert.ok(staleRead.isError, 'Changed revision must reject pagination');
  const approval = await client.callTool({name: 'approve_revision', arguments: {projectPath: process.argv[2], planId: 'preflight-probe', expectedHash: revision.hash, approval: 'Synthetic preflight authorization'}});
  if (context.routing.candidates.length) {
    assert.ok(approval.isError, 'Uninvestigated knowledge must block approval');
    assert.match(JSON.stringify(approval), /Resolve pending knowledge judgments/);
  } else {
    assert.ok(!approval.isError, JSON.stringify(approval));
    const approved = JSON.parse(approval.content[0].text);
    assert.equal(approved.hash, revision.hash);
    assert.equal(approved.approved, true);
    assert.ok(JSON.stringify(approved).length < JSON.stringify(full).length);
  }
  const completed = await client.callTool({name: 'save_execution', arguments: {projectPath: process.argv[2], planId: 'preflight-probe', expectedHash: null,
    execution: {revisionHash: revision.hash, status: 'complete', steps: [{id: 'probe', status: 'complete', checkIds: [], remaining: []}], note: 'No checks'}}});
  assert.ok(completed.isError, 'Missing checks or approval must block completion');
  console.log('FS MCP snapshot, routing, evidence, approval and completion gates passed');
} finally { await client.close(); }
