import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import { execFile } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { parseArgs, promisify } from 'node:util';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const exec = promisify(execFile);
const { values } = parseArgs({ options: { 'output-dir': { type: 'string' } } });
const temp = await mkdtemp(join(tmpdir(), 'fs-package-'));
const client = new Client({ name: 'package-smoke', version: '1' });
try {
  const { stdout } = await exec('npm', ['pack', '--json', '--ignore-scripts', '--pack-destination', temp]);
  const [pack] = JSON.parse(stdout);
  assert.deepEqual(pack.files.map(file => file.path).filter(path => /^skills\/[^/]+\/SKILL.md$/.test(path)).sort(),
    ['fs-knowledge', 'fs-plan', 'fs-plan-visualize', 'fs-project', 'fs-review', 'fs-work'].map(name => `skills/${name}/SKILL.md`).sort());
  assert.ok(!pack.files.some(file => file.path.startsWith('knowledge/')));
  await exec('tar', ['-xzf', join(temp, pack.filename), '-C', temp]);
  const releaseManifest = JSON.parse(await readFile(join(temp, 'package/release-manifest.json'), 'utf8'));
  for (const [path, expectedHash] of Object.entries(releaseManifest.files)) {
    const actual = createHash('sha256').update(await readFile(join(temp, 'package', path))).digest('hex');
    assert.equal(actual, expectedHash, `Packaged release file differs: ${path}`);
  }
  // Every skill must resolve its guidance from the installed package, not checkout docs.
  for (const entry of pack.files.filter(file => /^skills\/[^/]+\/SKILL.md$/.test(file.path))) {
    const skill = join(temp, 'package', entry.path);
    const body = await readFile(skill, 'utf8');
    for (const [, target] of body.matchAll(/\]\((\.\.\/[^)#]+)(?:#[^)]*)?\)/g)) {
      assert.ok((await readFile(resolve(skill, '..', target), 'utf8')).length,
        `Missing packaged skill reference: ${entry.path} -> ${target}`);
    }
  }
  // The opt-in style CLI must also run from the packed artifact without checkout dependencies.
  const styleCli = join(temp, 'package/bundle/style-check.js');
  await writeFile(join(temp, 'style-policy.json'), JSON.stringify({version: 1, files: ['Style.jsx'], inlineStaticClasses: true}));
  await writeFile(join(temp, 'Style.jsx'), 'export default () => <div className="p-4"/>;');
  const {stdout: styleOutput} = await exec(process.execPath, [styleCli, temp, 'style-policy.json'], {cwd: temp});
  assert.equal(JSON.parse(styleOutput).status, 'passed');
  const {stdout: styleSchemaOutput} = await exec(process.execPath, [styleCli, '--schema'], {cwd: temp});
  assert.deepEqual(JSON.parse(styleSchemaOutput).properties.variants.items.properties.defaults.enum, ['per-axis', 'none']);
  await writeFile(join(temp, 'Style.jsx'), 'const styles={root:"p-4"};export default ()=><div className={styles.root}/>;');
  await assert.rejects(exec(process.execPath, [styleCli, temp, 'style-policy.json'], {cwd: temp}),
    error => error.code === 1 && JSON.parse(error.stdout).diagnostics.some(item => item.rule === 'inline-static-classes'));
  // Bundled MCP must start independently of the source checkout and its node_modules.
  await client.connect(new StdioClientTransport({ command: process.execPath, args: [join(temp, 'package/bundle/mcp.js')], cwd: temp,
    env: {...process.env, HOME: temp, FRONTEND_SYSTEM_REPO: ''} }));
  const definitions = (await client.listTools()).tools;
  assert.equal(client.getServerVersion().version, releaseManifest.pluginVersion, 'MCP handshake must use the same package version');
  const tools = definitions.map(tool => tool.name);
  const identity = await client.callTool({name: 'get_fs_release', arguments: {}});
  assert.equal(JSON.parse(identity.content[0].text).pluginVersion, releaseManifest.pluginVersion);
  const unconfigured = await client.callTool({name: 'add_knowledge_note', arguments: {title: 'No source checkout', content: 'Must not write the plugin cache'}});
  assert.equal(unconfigured.isError, true);
  const draft = await client.callTool({name: 'prepare_knowledge_contribution', arguments: {title: 'Package contribution', content: 'A pending fixture; never submit to GitHub.'}});
  assert.ok(!draft.isError, JSON.stringify(draft));
  assert.equal(JSON.parse(draft.content[0].text).repository, 'Yelihi/frontend-system');
  assert.ok(JSON.parse(draft.content[0].text).localDraft.startsWith(temp));
  const exported = JSON.parse(await readFile(join(temp, 'package/bundle/tool-schemas.json'), 'utf8'));
  assert.deepEqual(exported.tools, definitions, 'Packaged help must match the actual bundled MCP input schemas');
  const helper = join(temp, 'package/bundle/tool-help.mjs');
  const {stdout: helpOutput} = await exec(process.execPath, [helper, 'save_execution', 'save_semantic_review', 'check_pr_readiness'], {cwd: temp});
  const help = JSON.parse(helpOutput);
  assert.deepEqual(help.map(({name}) => name), ['save_execution', 'save_semantic_review', 'check_pr_readiness']);
  for (const entry of help) assert.deepEqual(entry.inputSchema, definitions.find(({name}) => name === entry.name).inputSchema);
  const {stdout: revisionHelp} = await exec(process.execPath, [helper, 'save_revision'], {cwd: temp});
  const payloadSchema = JSON.parse(revisionHelp)[0].payloadSchema;
  const resolveSchema = (node) => {
    if (!node.$ref) return node;
    assert.ok(node.$ref.startsWith('#/'), 'Help schemas use self-contained references');
    const target = node.$ref.slice(2).split('/').reduce((value, key) => value?.[key.replace(/~1/g, '/').replace(/~0/g, '~')], payloadSchema);
    assert.ok(target, `Missing schema definition: ${node.$ref}`);
    return {...resolveSchema(target), ...Object.fromEntries(Object.entries(node).filter(([key]) => key !== '$ref'))};
  };
  const inspectRefs = node => {
    if (!node || typeof node !== 'object') return;
    if (node.$ref) resolveSchema(node);
    for (const value of Object.values(node)) inspectRefs(value);
  };
  inspectRefs(payloadSchema);
  assert.equal(payloadSchema.additionalProperties, false);
  const evidenceSchema = resolveSchema(payloadSchema.properties.evidence);
  const decisionSchema = resolveSchema(resolveSchema(evidenceSchema.properties.decisions).items);
  assert.ok(decisionSchema.required.includes('reconsiderWhen'));
  const routesSchema = resolveSchema(resolveSchema(evidenceSchema.properties.routes).items);
  for (const variant of routesSchema.anyOf) {
    const judgmentSchema = resolveSchema(resolveSchema(resolveSchema(variant).properties.judgments).items);
    const investigationSchema = resolveSchema(judgmentSchema.properties.investigation);
    assert.ok(investigationSchema.required.includes('findings'));
  }
  assert.equal(definitions.find(({name}) => name === 'save_revision').inputSchema.properties.evidence.type, undefined);
  await assert.rejects(exec(process.execPath, [helper, 'not-a-tool'], {cwd: temp}), error => error.code === 2);
  for (const name of ['save_project_analysis', 'get_project_analysis', 'render_project_flow', 'list_plans', 'get_project_snapshot', 'read_project_source', 'get_project_document', 'record_project_refresh', 'save_revision', 'run_project_checks', 'begin_work_attempt', 'start_work', 'complete_work', 'save_semantic_review', 'save_rule_proposal', 'check_knowledge_sources', 'read_source_change', 'inspect_code_knowledge', 'save_knowledge_review', 'add_knowledge_note', 'discover_knowledge_triggers', 'read_source_knowledge', 'save_source_review']) assert.ok(tools.includes(name), name);
  const note = await client.callTool({ name: 'add_knowledge_note', arguments: { repositoryRoot: temp, title: 'Package note', content: 'A short note; not yet reviewed knowledge.' } });
  assert.ok(!note.isError, JSON.stringify(note));
  const sourceId = JSON.parse(note.content[0].text).document.id;
  const sourceRead = await client.callTool({ name: 'read_source_knowledge', arguments: { repositoryRoot: temp, id: sourceId } });
  assert.ok(!sourceRead.isError, JSON.stringify(sourceRead));
  let source = JSON.parse(sourceRead.content[0].text);
  assert.equal(source.state, 'pending');
  assert.equal(source.reviewStatus, 'on-review');
  assert.ok(tools.includes('prepare_active_knowledge'));
  const collected = await client.callTool({name: 'prepare_active_knowledge', arguments: {repositoryRoot: temp}});
  assert.deepEqual(JSON.parse(collected.content[0].text).prepared, []);
  await writeFile(join(temp, source.document.path), source.content.replace('state: pending', 'state: active'));
  const prepared = await client.callTool({name: 'prepare_active_knowledge', arguments: {repositoryRoot: temp}});
  assert.ok(!prepared.isError, JSON.stringify(prepared));
  assert.equal(JSON.parse(prepared.content[0].text).prepared[0].id, sourceId);
  const activeRead = await client.callTool({name: 'read_source_knowledge', arguments: {repositoryRoot: temp, id: sourceId}});
  source = JSON.parse(activeRead.content[0].text);
  assert.equal(source.state, 'active');
  const sourceReview = await client.callTool({ name: 'save_source_review', arguments: {
    repositoryRoot: temp, id: sourceId, expectedSourceHash: source.sourceHash, expectedMetadataHash: source.metadataHash, expectedReviewHash: source.reviewHash,
    review: { status: 'changes-requested', reviewer: 'host', summary: 'Package fixture needs evidence', scope: 'Package smoke', claims: [], conditions: [], exclusions: [], unresolved: ['Not a factual source review'] },
  } });
  assert.ok(!sourceReview.isError, JSON.stringify(sourceReview));
  assert.equal(JSON.parse(sourceReview.content[0].text).status, 'changes-requested');
  const discovered = await client.callTool({ name: 'discover_knowledge_triggers', arguments: { domains: ['css'], limit: 2 } });
  assert.ok(!discovered.isError, JSON.stringify(discovered));
  const descriptions = JSON.parse(discovered.content[0].text);
  assert.equal(descriptions.entries.length, 2);
  assert.ok(descriptions.entries.every(entry => entry.triggers.every(trigger => trigger.description)));
  assert.equal(descriptions.nextOffset, 2);
  const context = await client.callTool({ name: 'inspect_project', arguments: { projectPath: temp } });
  assert.ok(!context.isError);
  await writeFile(join(temp, 'view.tsx'), 'import {useEffect as effect} from "react";\neffect(() => {});\n');
  const routed = await client.callTool({ name: 'inspect_code_knowledge', arguments: { projectPath: temp, files: ['view.tsx'], technologies: ['React'] } });
  assert.ok(!routed.isError, JSON.stringify(routed));
  const inspection = JSON.parse(routed.content[0].text);
  assert.ok(inspection.candidates.some(item => item.id === 'react-derived-state-and-effects'));
  assert.ok(inspection.checklist.length > 0);
  const repeated = await client.callTool({ name: 'inspect_code_knowledge', arguments: { projectPath: temp, files: ['view.tsx'], technologies: ['React'] } });
  assert.ok(!repeated.isError, JSON.stringify(repeated));
  const warm = JSON.parse(repeated.content[0].text);
  assert.equal(warm.inspectionHash, inspection.inspectionHash);
  console.log(JSON.stringify({ triggerSmoke: { files: 1, coldMs: inspection.elapsedMs, warmMs: warm.elapsedMs,
    responseCharacters: routed.content[0].text.length, note: 'Synthetic one-file package smoke, not model-token or production performance evidence' } }));
  const reviewed = await client.callTool({ name: 'save_knowledge_review', arguments: {
    projectPath: temp, input: inspection.request, inspectionHash: inspection.inspectionHash, id: 'smoke-review', expectedHash: null,
    judgments: inspection.checklist.map(item => ({ itemId: item.itemId, decision: 'needs-context', evidence: 'effect(() => {});',
      rationale: 'Package smoke only; host semantics not assessed', verification: { kind: 'test', reason: 'Inspect intended behavior before implementing a test' } })),
  } });
  assert.ok(!reviewed.isError, JSON.stringify(reviewed));
  assert.equal(JSON.parse(reviewed.content[0].text).status, 'pending');
  if (values['output-dir']) {
    const destination = resolve(values['output-dir']);
    await mkdir(destination, { recursive: true });
    await copyFile(join(temp, pack.filename), join(destination, pack.filename));
    console.log(`Verified package saved: ${join(destination, pack.filename)}`);
  }
  console.log('Package smoke passed: six skills, no raw knowledge, standalone MCP tools.');
} finally { await client.close(); await rm(temp, { recursive: true, force: true }); }
