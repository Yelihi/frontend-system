import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm, mkdir, cp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { git } from '../src/application/git-state.js';
import { inspectCode } from '../src/application/knowledge/code-triggers.js';
import { discoverKnowledgeTriggers } from '../src/application/knowledge/trigger-review.js';
import { routeKnowledge } from '../src/application/knowledge/routing.js';
import { bindDesignEvidence, designEvidenceSchema, designContractFailures, evidenceFreshness, readProjectEvidence, validateProjectEvidence, validateCitation, projectEvidenceInputSchema } from '../src/application/design-evidence.js';
import { projectDocumentHash } from '../src/application/project-snapshot.js';
import { saveRevision, approveRevision, saveExecution, digest, readRevision, beginAttempt, workflowContext } from '../src/application/workflow-store.js';
import { FileSystemProjectDiscovery } from '../src/adapters/filesystem/project-discovery.js';
import { taskContext, summarizeTaskContext } from '../src/application/task-context.js';
import { recalledAnalysis } from '../src/application/analysis-receipts.js';
import { runProjectChecks } from '../src/application/run-capabilities.js';
import { fixtureEvidence, fixtureJudgments } from './design-evidence-fixture.js';
import type { VerificationPolicy } from '../src/application/policy.js';
import type { DesignEvidence } from '../src/application/design-evidence.js';
import { revisionInfluence, revisionReceipt, revisionWindow } from '../src/application/revision-response.js';
import { readReferenceIndex } from '../src/application/knowledge/reference-index.js';
import { startWork } from '../src/application/start-work.js';
import { completeWork } from '../src/application/complete-work.js';

const system = process.cwd();

test('main evidence defaults only the wire version, preserving explicit versions and reuse requirements', () => {
  const input = {coverage: [{path: 'source.mjs', status: 'inspected', reason: 'Read the source'}],
    statements: [{id: 'boundary', kind: 'fact', statement: 'Observed boundary',
      evidence: [{path: 'source.mjs', quote: 'boundary'}], reuseReason: 'No matching registered signal'}]};
  assert.equal(projectEvidenceInputSchema.parse(input).version, 1);
  assert.throws(() => projectEvidenceInputSchema.parse({...input, version: 2}));
  assert.throws(() => projectEvidenceInputSchema.parse({...input,
    statements: input.statements.map(item => ({...item, reuseReason: undefined}))}), /reuse/);
});

test('unique exact citations resolve line numbers without accepting ambiguous, stale or misplaced evidence', async () => {
  const root = await mkdtemp(join(tmpdir(), 'fs-citation-'));
  const content = 'first\r\nunique boundary\r\nrepeat\r\nrepeat\r\n';
  try {
    await writeFile(join(root, 'source.mjs'), content);
    const citation = {path: 'source.mjs', quote: 'unique boundary', hash: digest(content)};
    assert.deepEqual(await validateCitation(root, citation), {...citation, line: 2});
    assert.equal((await validateCitation(root, {...citation, quote: 'unique boundary\r\nrepeat'})).line, 2);
    await assert.rejects(validateCitation(root, {...citation, quote: 'repeat'}), /Ambiguous.*line\(s\): 3, 4/);
    assert.equal((await validateCitation(root, {...citation, quote: 'repeat', line: 4})).line, 4);
    await assert.rejects(validateCitation(root, {...citation, line: 4}), /Stale or invented/);
    await assert.rejects(validateCitation(root, {...citation, quote: 'absent'}), /Stale or invented/);
    await assert.rejects(validateCitation(root, {...citation, hash: '0'.repeat(64)}), /Stale or invented/);
    await assert.rejects(validateCitation(root, {path: citation.path, quote: citation.quote}), /current context/);
  } finally { await rm(root, {recursive: true, force: true}); }
});
const code = 'export function request(send, input) { return send(input); }\n';
const check = `import {request} from './request.mjs'; import assert from 'node:assert/strict';
assert.equal(await request(async () => 42, Object.freeze({id:1})), 42);`;
const issue = {id:'request', title:'Preserve request boundary', contract:'Delegate once and preserve input', files:['request.mjs'], dependsOn:[], requiredCheckIds:['behavior'], acceptance:['Delegate without mutating input']};
const policy: VerificationPolicy = {version:1, rules:[{id:'boundary',version:1,title:'Preserve input',statement:'Preserve caller input and return response',layer:'architecture',obligation:'required',conditions:[],exclusions:[],evidence:['User contract'],verification:'behavior-test',examples:[],validation:'proposed',limitations:[]}],checks:[{id:'behavior',script:'test',command:'node contract.mjs',ruleIds:['boundary'],guardPaths:['contract.mjs']}],reviews:[],guards:[{path:'contract.mjs',hash:digest(check)}],exceptions:[]};
async function fixture() {
  const root=await mkdtemp(join(tmpdir(),'fs-evidence-'));
  await writeFile(join(root,'package.json'),JSON.stringify({type:'module',scripts:{test:'node contract.mjs'}}));
  await writeFile(join(root,'request.mjs'),code); await writeFile(join(root,'contract.mjs'),check);
  return root;
}

test('model discretion cannot authorize a new mandatory domain outcome, while supplied contracts remain usable', async () => {
  const root = await fixture();
  try {
    const domainPolicy = structuredClone(policy);
    domainPolicy.rules[0]!.layer = 'domain';
    const evidence = await fixtureEvidence(root, domainPolicy, [issue]);
    const owner = evidence.decisions.find(item => item.ruleIds.includes('boundary'))!;
    const suppliedAuthority = owner.authority, suppliedConfirmation = owner.confirmation;
    owner.authority = 'model';
    owner.confirmation = '';
    let revision = await saveRevision(root, 'Domain outcome draft', null, domainPolicy, 'domain-authority', [issue], evidence);
    assert.ok(designContractFailures(revision.evidence, revision.policy, revision.issues).some(message => message.includes('domain authority: boundary')));
    await assert.rejects(approveRevision(root, revision.hash!, 'Approve draft', 'domain-authority'), /domain authority/);
    owner.authority = suppliedAuthority;
    owner.confirmation = suppliedConfirmation;
    revision = await saveRevision(root, 'Domain outcome grounded in the supplied contract', revision.hash!, domainPolicy, 'domain-authority', [issue], evidence);
    assert.deepEqual(designContractFailures(revision.evidence, revision.policy, revision.issues), []);
    await approveRevision(root, revision.hash!, 'Approve grounded outcome', 'domain-authority');
  } finally {await rm(root, {recursive: true, force: true});}
});

test('combined start retains approval, issue, baseline, freshness and attempt-budget guards', async () => {
  const root = await fixture();
  const planId = 'combined-start';
  try {
    const dependent = {...issue, id: 'dependent', dependsOn: [issue.id]};
    const evidence = await fixtureEvidence(root, policy, [issue, dependent]);
    const revision = await saveRevision(root, 'Preserve request ownership', null, policy, planId, [issue, dependent], evidence);
    const options = {planId, revisionHash: revision.hash!, stepId: issue.id, kind: 'implement' as const};
    await assert.rejects(startWork(root, options), /approved revision/);
    assert.equal((await workflowContext(root, planId)).execution, null);
    await approveRevision(root, revision.hash!, 'User approved this exact request contract', planId);
    await assert.rejects(startWork(root, {...options, revisionHash: '0'.repeat(64)}), /approved revision/);
    await assert.rejects(startWork(root, {...options, stepId: 'invented'}), /approved issue/);
    await assert.rejects(startWork(root, {...options, stepId: 'dependent'}), /incomplete dependencies/);
    await writeFile(join(root, 'request.mjs'), code + '// stale\n');
    await assert.rejects(startWork(root, options), /source changed|baseline changed|evidence changed/i);
    assert.equal((await workflowContext(root, planId)).execution, null);
    await writeFile(join(root, 'request.mjs'), code);
    const started = await startWork(root, options);
    assert.equal(started.status, 'started');
    assert.ok(started.status === 'started');
    assert.equal(started.attempt.number, 1);
    assert.equal(started.baseline.purpose, 'baseline');
    assert.equal(started.baseline.planId, planId);
    assert.equal(started.baseline.attemptId, started.attempt.id);
    assert.equal(started.baseline.results[0]!.status, 'passed');
    assert.equal(await readFile(join(root, 'request.mjs'), 'utf8'), code);
    const state = await workflowContext(root, planId);
    assert.equal(state.execution!.steps[0]!.status, 'pending');
    assert.deepEqual(state.execution!.steps[0]!.requiredCheckIds, issue.requiredCheckIds);
    await assert.rejects(startWork(root, options), /already exists/);
    assert.equal((await beginAttempt(root, issue.id, started.executionHash, planId)).number, 2);
    assert.equal((await beginAttempt(root, issue.id, started.executionHash, planId)).number, 3);
    await assert.rejects(beginAttempt(root, issue.id, started.executionHash, planId), /budget exhausted/);
  } finally {await rm(root, {recursive: true, force: true});}
});

test('combined start reports a failing baseline without claiming completion or hiding its logs', async () => {
  const root = await fixture();
  const planId = 'failing-baseline';
  try {
    await writeFile(join(root, 'request.mjs'), 'export function request() { return 0; }\n');
    const evidence = await fixtureEvidence(root, policy, [issue]);
    const revision = await saveRevision(root, 'Repair the approved request contract', null, policy, planId, [issue], evidence);
    await approveRevision(root, revision.hash!, 'User approves repair', planId);
    const started = await startWork(root, {planId, revisionHash: revision.hash!, stepId: issue.id, kind: 'implement'});
    assert.ok(started.status === 'started');
    assert.equal(started.baseline.results[0]!.status, 'failed');
    assert.match(started.baseline.results[0]!.output, /AssertionError/);
    assert.equal((await workflowContext(root, planId)).execution!.status, 'in-progress');
  } finally {await rm(root, {recursive: true, force: true});}
});

test('combined completion requires every host review, current checks and the exact execution', async () => {
  const root = await fixture();
  const planId = 'combined-finish';
  try {
    const reviewed = {...policy, reviews: [{id: 'boundary-review', ruleIds: ['boundary'], description: 'Review input ownership and caller behavior'}]};
    const evidence = await fixtureEvidence(root, reviewed, [issue]);
    const revision = await saveRevision(root, 'Preserve the approved boundary', null, reviewed, planId, [issue], evidence);
    await approveRevision(root, revision.hash!, 'User approves implementation', planId);
    const started = await startWork(root, {planId, revisionHash: revision.hash!, stepId: issue.id, kind: 'implement'});
    assert.ok(started.status === 'started');
    const review = {stepId: issue.id, reviewId: 'boundary-review', attemptId: started.attempt.id,
      status: 'passed' as const, findings: [{ruleId: 'boundary', files: ['request.mjs'], evidence: 'The function delegates input to send without writing to input.', conclusion: 'Caller input ownership is preserved.'}], remaining: [], resolvedExceptions: []};
    const input = {planId, expectedHash: started.executionHash, attemptId: started.attempt.id, baselineCheckId: started.baseline.id, reviews: [review]};
    await assert.rejects(completeWork(root, {...input, expectedHash: 'stale'}), /current approved execution/);
    await assert.rejects(completeWork(root, {...input, reviews: []}), /every approved semantic review/);
    await assert.rejects(completeWork(root, {...input, reviews: [{...review, remaining: ['not reviewed']}]}), /no remaining work/);
    const incomplete = await completeWork(root, {...input, reviews: [{...review, findings: []}]});
    assert.equal(incomplete.status, 'incomplete');
    assert.equal((await workflowContext(root, planId)).execution!.status, 'in-progress');
    assert.equal(incomplete.check.coverage!.allRequiredPassed, true, 'Passing checks alone never complete work');
    const completed = await completeWork(root, input);
    assert.ok(completed.status === 'complete');
    assert.equal(completed.reviewIds.length, 1);
    const state = await workflowContext(root, planId);
    assert.equal(state.execution!.status, 'complete');
    assert.equal(state.execution!.finalCheckId, completed.check.id);
    assert.deepEqual(state.execution!.steps[0]!.reviewIds, completed.reviewIds);
    await assert.rejects(completeWork(root, {...input, expectedHash: completed.executionHash}), /unfinished issue/);
  } finally {await rm(root, {recursive: true, force: true});}
});

test('combined completion preserves check failures and never records a successful execution', async () => {
  const root = await fixture();
  const planId = 'failed-finish';
  try {
    await writeFile(join(root, 'request.mjs'), 'export function request() { return 0; }\n');
    const evidence = await fixtureEvidence(root, policy, [issue]);
    const revision = await saveRevision(root, 'Fix request result', null, policy, planId, [issue], evidence);
    await approveRevision(root, revision.hash!, 'User approves repair', planId);
    const started = await startWork(root, {planId, revisionHash: revision.hash!, stepId: issue.id, kind: 'implement'});
    assert.ok(started.status === 'started');
    const completed = await completeWork(root, {planId, expectedHash: started.executionHash, attemptId: started.attempt.id, reviews: []});
    assert.equal(completed.status, 'checks-failed');
    assert.equal(completed.check.results[0]!.status, 'failed');
    assert.deepEqual(completed.reviewIds, []);
    assert.equal((await workflowContext(root, planId)).execution!.status, 'in-progress');
  } finally {await rm(root, {recursive: true, force: true});}
});

test('declared check assets are pinned once without duplicated guard input and remain protected', async () => {
  const root = await fixture();
  const planId = 'derived-guards';
  try {
    const evidence = await fixtureEvidence(root, policy, [issue]);
    const {guards: _guards, ...input} = policy;
    void _guards;
    const revision = await saveRevision(root, 'Protect the declared checker', null, input, planId, [issue], evidence);
    assert.deepEqual(revision.policy!.guards, [{path: 'contract.mjs', hash: digest(check)}]);
    await approveRevision(root, revision.hash!, 'User approves guarded checker', planId);
    await writeFile(join(root, 'contract.mjs'), '// weakened checker\n');
    const discovery = new FileSystemProjectDiscovery();
    const result = await runProjectChecks(await discovery.discover(await discovery.createRef(root)), {planId, stage: 'delivery'});
    assert.equal(result.results[0]!.status, 'not-run');
    assert.match(result.results[0]!.reason!, /Protected/);
    const before = await readRevision(root, planId);
    await assert.rejects(saveRevision(root, undefined, before.hash, {...input, checks: input.checks.map(item => ({...item, guardPaths: ['missing.mjs']}))}, planId), /Missing verification asset/);
    assert.equal((await readRevision(root, planId)).hash, before.hash);
  } finally {await rm(root, {recursive: true, force: true});}
});

test('decision ID updates preserve untouched records and cannot reuse old user consent or stale routing', async () => {
  const root = await fixture();
  try {
    const evidence = await fixtureEvidence(root, policy, [issue]);
    evidence.decisions[0]!.options.push({id: 'alternative', description: 'Alternative supplied by user', cost: 'Update the contract before execution'});
    evidence.decisions.push({...evidence.decisions[0]!, id: 'untouched'});
    const first = await saveRevision(root, 'Existing plan', null, policy, 'patch', [issue], evidence);
    await approveRevision(root, first.hash!, 'User approved original', 'patch');
    const patch = (changes: Parameters<typeof saveRevision>[7]) => saveRevision(root, undefined, first.hash, undefined, 'patch', undefined, undefined, changes);
    await assert.rejects(patch([{id: 'missing', changes: {rationale: 'Update'}}]), /existing IDs/);
    await assert.rejects(patch([{id: 'fixture', changes: {selected: 'alternative'}}]), /new supplied answer/);
    await assert.rejects(patch([{id: 'fixture', changes: {selected: 'invalid', confirmation: 'User answer'}}]), /existing decision option/);
    assert.equal((await readRevision(root, 'patch')).approved, true, 'Failed patches must leave the approved revision intact');
    const next = await patch([{id: 'fixture', changes: {selected: 'alternative', confirmation: 'User selected alternative', rationale: 'Current supplied tradeoff'}}]);
    assert.equal(next.approved, false);
    assert.equal(next.version, first.version + 1);
    assert.deepEqual(next.evidence!.decisions[1], first.evidence!.decisions[1]);
    assert.deepEqual(next.evidence!.routes, first.evidence!.routes);
    assert.deepEqual(next.evidence!.decisions[0]!.options, first.evidence!.decisions[0]!.options);
    assert.deepEqual(next.issues, first.issues); assert.deepEqual(next.policy, first.policy);
    assert.ok(next.content.includes('Choice: alternative'));
    await assert.rejects(patch([{id: 'fixture', changes: {rationale: 'Stale write'}}]), /Revision changed/);
    await writeFile(join(root, 'request.mjs'), code + '// changed');
    await assert.rejects(saveRevision(root, undefined, next.hash, undefined, 'patch', undefined, undefined, [{id: 'fixture', changes: {rationale: 'Ignore stale code'}}]), /Routing evidence changed/);
    assert.equal((await readRevision(root, 'patch')).hash, next.hash);
  } finally { await rm(root, {recursive: true, force: true}); }
});

test('decision view and partial revision saves preserve contracts, stale-write checks and approval gates', async () => {
  const root=await fixture();
  try {
    await assert.rejects(saveRevision(root,undefined,null,policy,'missing',[issue]),/supply content/);
    await writeFile(join(root,'neutral.mjs'),'export const value = 1;');
    const evidence=await fixtureEvidence(root,policy,[issue],'공통 요청 인증 오류 처리');
    const route=evidence.routes[0]!;
    const adopted=route.judgments.find(j=>!j.investigation)!;
    assert.ok(adopted);
    adopted.decision='apply';
    const first=await saveRevision(root,'Preserve the agreed design',null,policy,'compact-edit',[issue],evidence);
    assert.ok(revisionReceipt(first).contractDiagnostics.some(message=>message.includes('Adopted knowledge lacks a decision')));
    await assert.rejects(approveRevision(root,first.hash!,'User approval','compact-edit'),/Adopted knowledge lacks a decision/);
    const decisions=revisionWindow(first,0,200,'decisions');
    assert.ok('decisions' in decisions);
    assert.deepEqual(decisions.decisions,first.evidence!.decisions);
    assert.ok(!('evidence' in decisions) && !('content' in decisions) && !('policy' in decisions));
    const full=revisionWindow(first,0,200,'full');
    assert.ok('evidence' in full); assert.deepEqual(full.evidence,first.evidence);
    for (const detail of ['contract', 'decisions', 'full'] as const) {
      const view = revisionWindow(first,0,200,detail);
      assert.deepEqual('contractDiagnostics' in view ? view.contractDiagnostics : undefined, revisionReceipt(first).contractDiagnostics,
        'Every read representation must expose the same unresolved contract links');
    }
    const context=await taskContext(new FileSystemProjectDiscovery(),system,root,{raw:'xyzuniquenonsense',mode:'prepare',constraints:[],files:['neutral.mjs']},'compact-edit');
    const summary=summarizeTaskContext(context);
    assert.ok('candidateChanges' in summary.routing && summary.routing.candidateChanges);
    assert.deepEqual(summary.routing.candidateChanges.absentFromThisContext,first.evidence!.routes.flatMap(({judgments})=>judgments.map(({referenceId})=>referenceId)));
    assert.deepEqual((await readRevision(root,'compact-edit')).evidence,first.evidence,'Showing a scope delta must not mutate earlier judgments');
    evidence.decisions[0]!.knowledgeIds=[adopted.referenceId];
    const second=await saveRevision(root,undefined,first.hash,undefined,'compact-edit',undefined,evidence);
    assert.ok(second.content.startsWith('Preserve the agreed design\n'));
    assert.deepEqual(second.policy,first.policy); assert.deepEqual(second.issues,first.issues);
    assert.deepEqual(revisionReceipt(second).contractDiagnostics,[]);
    await approveRevision(root,second.hash!,'User approval','compact-edit');
    await assert.rejects(saveRevision(root,undefined,first.hash,undefined,'compact-edit'),/Revision changed/);
    const third=await saveRevision(root,undefined,second.hash,undefined,'compact-edit');
    assert.equal(third.approved,false); assert.equal(third.version,second.version+1);
    assert.deepEqual(third.evidence,second.evidence);
    assert.equal(third.content,second.content);
    await writeFile(join(root,'request.mjs'),code+'// new source');
    assert.deepEqual(revisionReceipt(third).contractDiagnostics,[],'Receipt is a link diagnostic, not a freshness approval');
    await assert.rejects(approveRevision(root,third.hash!,'Cannot approve stale facts','compact-edit'),/Analysis source changed|baseline changed/);
  } finally {await rm(root,{recursive:true,force:true});}
});

test('routing executes from work context, detects direct requests, and distinguishes shadows and indirect boundaries', async () => {
  const root=await fixture();
  try {
    await writeFile(join(root,'view.tsx'), 'import axios from "axios";\nfetch("/x"); axios.get("/x"); axios("/y");\nfunction local(fetch: Function) { fetch("shadow"); }');
    const context=await taskContext(new FileSystemProjectDiscovery(),system,root,{raw:'공통 요청 인증 오류 처리',mode:'prepare',constraints:[],files:['view.tsx']});
    assert.equal(context.routing.status,'candidates');
    assert.ok('candidates' in context.routing && context.routing.candidates.some(({id})=>id==='request-policy-boundaries'));
    const facts=await inspectCode(root,['view.tsx']);
    assert.deepEqual(facts.signals.filter(({kind})=>kind==='call').map(({value})=>value),['global#fetch','axios#get','axios#default']);
    await writeFile(join(root,'view.tsx'),'import {request} from "./request.mjs"; export const load = () => request();');
    const indirect=await routeKnowledge(root,system,{files:['view.tsx'],query:'共通 xyzunique'});
    assert.ok(!indirect.inspection.analysis.signals.some(({value})=>value==='global#fetch'));
    assert.equal(indirect.inspection.analysis.imports[0]?.resolvedPath,'request.mjs');
    const semantic=await routeKnowledge(root,system,{files:['view.tsx'],query:'認証 xyzunique',interpretations:[{path:'view.tsx',line:1,evidence:'request()',signal:'network.request-policy-boundary',interpretation:'Host traced the existing request interface; assess whether to retain it'}]});
    assert.ok(semantic.candidates.some(({id})=>id==='request-policy-boundaries'));
    await assert.rejects(discoverKnowledgeTriggers(system,{domains:['made-up-domain']}),/Unknown domains/);
    const nameHint=await routeKnowledge(root,system,{files:['request.mjs'],query:'xyzuniquenonsense'});
    assert.ok(nameHint.candidates.find(({id})=>id==='request-policy-boundaries')?.reasons.includes('scope-search'));
    assert.ok(!nameHint.inspection.analysis.signals.some(({kind})=>kind==='semantic'), 'A suggestive name is not a host interpretation');
    await writeFile(join(root,'neutral.mjs'),'export const value = 1;');
    const none=await routeKnowledge(root,system,{files:['neutral.mjs'],query:'xyzuniquenonsense'});
    assert.equal(none.status,'no-matches');
    const notRun=await taskContext(new FileSystemProjectDiscovery(),system,root,{raw:'xyzuniquenonsense',mode:'prepare',constraints:[],files:[]});
    assert.equal(notRun.routing.status,'not-run');
  } finally {await rm(root,{recursive:true,force:true});}
});

test('abstract plan requests retrieve scope hints without adopting them and report missing project prerequisites', async () => {
  const root=await fixture();
  try {
    await mkdir(join(root,'adapters'),{recursive:true});
    await writeFile(join(root,'adapters/httpClient.mjs'),'export const makeClient = transport => ({send: options => transport(options)});');
    const input={raw:'Implement exactly the provided plan and user decisions.',mode:'prepare' as const,constraints:[],files:['adapters/httpClient.mjs']};
    const state=await taskContext(new FileSystemProjectDiscovery(),system,root,input);
    assert.ok('candidates' in state.routing);
    const candidate=state.routing.candidates.find(({id})=>id==='request-policy-boundaries');
    assert.ok(candidate?.reasons.includes('scope-search'));
    assert.ok(!candidate?.reasons.includes('code-trigger'));
    assert.ok(!state.routing.inspection.analysis.signals.some(({kind})=>kind==='semantic'));
    assert.ok(state.routing.discovery.entries.some(({id})=>id==='request-policy-boundaries'));
    assert.equal(state.projectFacts.facts.length,0,'Retrieval does not manufacture reusable facts');
    const summary=summarizeTaskContext(state);
    assert.equal(summary.planPrerequisites.projectAnalysis,'required');
    assert.match(summary.workflow.next,/Before product\/test edits/);
    assert.match(summary.workflow.next,/not an approved MCP revision/);
    assert.match(summary.next,/Before save_revision/); assert.match(summary.next,/snapshot.documentHash/);
    assert.ok('semanticDiscovery' in summary.routing && summary.routing.semanticDiscovery);
    const discoveryEntry = summary.routing.semanticDiscovery.entries.find(({id})=>id==='request-policy-boundaries');
    assert.ok(discoveryEntry && (discoveryEntry.conditions?.length || discoveryEntry.applicabilityFrom));
    assert.match(summary.routing.semanticDiscovery.coverage,/not exhaustive/);
    assert.ok(summary.routing.semanticDiscovery.domains.includes('networking'));
  } finally {await rm(root,{recursive:true,force:true});}
});

test('long work requests keep discovery within its budget while full request and scope retrieval survive', async () => {
  const root=await fixture();
  try {
    const file='httpClient.mjs';await writeFile(join(root,file),'export const request = transport => transport();');
    const query='Preserve the supplied implementation plan. '.repeat(35)+' tailwind cva theme style-policy';
    assert.ok(query.length>600 && query.length<=2000);
    const routed=await routeKnowledge(root,system,{files:[file],query,technologies:['Tailwind CSS']});
    assert.equal(routed.request.query,query,'do not truncate the authoritative request');
    assert.ok(routed.candidates.some(item=>item.id==='tailwind-team-authorship'&&item.reasons.includes('request-search')));
    assert.ok(routed.candidates.some(item=>item.id==='request-policy-boundaries'&&item.reasons.includes('scope-search')));
  } finally {await rm(root,{recursive:true,force:true});}
});

test('main inspection and interpretations never read working tree code or alias configuration', async () => {
  const root=await fixture();
  try {
    await mkdir(join(root,'src')); await writeFile(join(root,'src/client.ts'),'export const request = () => fetch("/main");');
    await writeFile(join(root,'view.ts'),'import {request} from "@/client"; request();');
    await writeFile(join(root,'tsconfig.json'),JSON.stringify({compilerOptions:{baseUrl:'.',paths:{'@/*':['src/*']}}}));
    await git(root,['init','-b','main']); await git(root,['add','.']); await git(root,['-c','user.name=Test','-c','user.email=test@local','commit','-m','baseline']);
    const expectedCommit=(await git(root,['rev-parse','HEAD'])).trim();
    await writeFile(join(root,'src/client.ts'),'export const request = () => "working";');
    await writeFile(join(root,'tsconfig.json'),JSON.stringify({compilerOptions:{paths:{'@/*':['wrong/*']}}}));
    const pinned=await inspectCode(root,['view.ts','src/client.ts'],{baseRef:'main',expectedCommit});
    assert.equal(pinned.imports[0]?.resolvedPath,'src/client.ts');
    assert.ok(pinned.signals.some(({value})=>value==='global#fetch'));
    assert.ok(!(await inspectCode(root,['src/client.ts'])).signals.some(({value})=>value==='global#fetch'));
    const result=await routeKnowledge(root,system,{files:['src/client.ts'],query:'request',snapshot:{baseRef:'main',expectedCommit},interpretations:[{path:'src/client.ts',line:1,evidence:'fetch("/main")',signal:'network.request-policy-boundary',interpretation:'Request at main'}]});
    assert.ok(result.candidates.length);
  } finally {await rm(root,{recursive:true,force:true});}
});

test('project evidence rejects missing coverage, invented citations, and unscoped absence claims', async () => {
  const root=await fixture();
  try {
    await fixtureEvidence(root,policy,[issue]);
    const {record}=await readProjectEvidence(root);
    await assert.rejects(validateProjectEvidence(root,{...record,coverage:record.coverage.slice(1)},'main',null),/whole baseline/);
    const statement=record.statements[0]!;
    await assert.rejects(validateProjectEvidence(root,{...record,statements:[{...statement,evidence:[{...statement.evidence[0]!,quote:'invented'}]}]},'main',null),/invented/);
    await assert.rejects(validateProjectEvidence(root,{...record,statements:[{...statement,absence:true}]},'main',null),/inspected scope/);
    const doc=await readFile(join(root,'.frontend-system/project.md'),'utf8');
    assert.match(doc,/Detailed statements and file coverage: \[evidence\]\(evidence\/project-/);
    assert.equal(record.statements[0]!.statement,'Fixture code exists');
    assert.equal(record.statements[0]!.evidence[0]!.path,'request.mjs');
  } finally {await rm(root,{recursive:true,force:true});}
});

test('new plans require decisions and evidence; mutation cannot complete; valid implementation can', async () => {
  const root=await fixture();
  try {
    const draft=await saveRevision(root,'Request plan',null,policy,'network',[issue]);
    await assert.rejects(approveRevision(root,draft.hash!,'Approved','network'),/Evidence-based plans/);
    const evidence=await fixtureEvidence(root,policy,[issue]);
    const bound=await bindDesignEvidence(root,evidence);
    assert.deepEqual(designContractFailures(bound,policy,[issue]),[]);
    assert.ok(designContractFailures({...bound,decisions:bound.decisions.map(item=>({...item,status:'open'}))},policy,[issue]).some(x=>x.includes('Unresolved')));
    assert.ok(designContractFailures({...bound,decisions:bound.decisions.map(item=>({...item,ruleIds:[]}))},policy,[issue]).some(x=>x.includes('lacks a decision')));
    const revision=await saveRevision(root,'Request plan',draft.hash,policy,'network',[issue],evidence);
    await approveRevision(root,revision.hash!,'Implement this exact contract','network');
    const execution={revisionHash:revision.hash!,status:'in-progress' as const,steps:[{id:'request',status:'pending' as const,checkIds:[],remaining:[]}],note:'Test execution'};
    const saved=await saveExecution(root,execution,null,'network');
    await writeFile(join(root,'request.mjs'),code+'// changed before implementation\n');
    await assert.rejects(beginAttempt(root,'request',saved.hash,'network'),/Analysis source changed|baseline changed/);
    await writeFile(join(root,'request.mjs'),code);
    const attempt=await beginAttempt(root,'request',saved.hash,'network');
    await writeFile(join(root,'request.mjs'),'export function request(send,input) { input.changed=true; return send(input); }');
    const discovery=new FileSystemProjectDiscovery();const profile=await discovery.discover(await discovery.createRef(root));
    const failed=await runProjectChecks(profile,{planId:'network',stage:'delivery',attemptId:attempt.id});
    assert.ok(failed.results.some(({passed})=>!passed));
    const complete=(checkId:string)=>({...execution,status:'complete' as const,finalCheckId:checkId,steps:[{id:'request',status:'complete' as const,checkIds:[checkId],attemptId:attempt.id,remaining:[]}]});
    await assert.rejects(saveExecution(root,complete(failed.id),saved.hash,'network'),/does not verify/);
    await writeFile(join(root,'request.mjs'),code+'// valid implementation change\n');
    const passed=await runProjectChecks(profile,{planId:'network',stage:'delivery',attemptId:attempt.id});
    await saveExecution(root,complete(passed.id),saved.hash,'network');
    assert.equal((await workflowContext(root,'network')).verification.status,'verified');
    await writeFile(join(root,'request.mjs'),code+'// later change\n');
    assert.equal((await workflowContext(root,'network')).verification.status,'stale');
    assert.equal((await readRevision(root,'network')).approved,true,'Expected product edits do not silently rewrite approval');
  } finally {await rm(root,{recursive:true,force:true});}
});

test('influence audit preserves decisions, paginates, and withholds changed or missing metadata', async () => {
  const root = await fixture();
  try {
    const evidence = await fixtureEvidence(root, policy, [issue], '공통 요청 인증 오류 처리');
    const revision = await saveRevision(root, 'Request plan', null, policy, 'influence', [issue], evidence);
    const index = (await readReferenceIndex(join(system, 'references/learned')))!;
    const original = JSON.stringify(revision);
    const view = revisionInfluence(revision, index, 0, 500);
    const request = view.knowledge.find(item => item.id === 'request-policy-boundaries')!;
    assert.equal(request.metadataStatus, 'matched');
    assert.ok(Object.keys(request.metadata!.sources).length);
    assert.equal(request.judgments[0]!.decision, 'not-applicable');
    assert.equal(request.decisions.length, 0, 'Retrieved and excluded knowledge is not claimed as adoption');
    assert.equal(view.decisionsWithoutKnowledge.length, revision.evidence!.decisions.length);
    const page = revisionInfluence(revision, index, 0, 1);
    assert.equal(page.knowledge.length, 1);
    assert.equal(page.nextOffset, view.total > 1 ? 1 : null);
    index.entries.find(item => item.id === request.id)!.conditions.push('Changed condition');
    const changed = revisionInfluence(revision, index, 0, 500).knowledge.find(item => item.id === request.id)!;
    assert.equal(changed.metadataStatus, 'changed');
    assert.equal(changed.metadata, null);
    assert.deepEqual(changed.judgments, request.judgments);
    assert.ok(revisionInfluence(revision, undefined, 0, 500).knowledge.every(item => item.metadataStatus === 'missing' && item.metadata === null));
    assert.equal(JSON.stringify(revision), original, 'Audit cannot change approval or evidence');
  } finally { await rm(root, {recursive: true, force: true}); }
});

test('linked knowledge metadata and source changes require review; unrelated index updates do not', async () => {
  const root=await fixture(), other=await mkdtemp(join(tmpdir(),'fs-reference-copy-'));
  try {
    const evidence=await fixtureEvidence(root,policy,[issue],'공통 요청 인증 오류 처리');
    const bound=await bindDesignEvidence(root,evidence);
    assert.ok(Object.keys(bound.referenceHashes).includes('request-policy-boundaries'));
    await cp(join(system,'references'),join(other,'references'),{recursive:true});
    const path=join(other,'references/learned/index.json'),index=JSON.parse(await readFile(path,'utf8'));
    const unrelated=index.entries.find((entry:{id:string})=>!bound.referenceHashes[entry.id]);
    unrelated.summary+=' unrelated update'; await writeFile(path,JSON.stringify(index));
    assert.deepEqual(await evidenceFreshness(root,bound,true,other),[]);
    index.entries.find((entry:{id:string})=>entry.id==='request-policy-boundaries').conditions.push('Changed condition');
    await writeFile(path,JSON.stringify(index));
    assert.ok((await evidenceFreshness(root,bound,true,other)).some(x=>x.includes('Linked knowledge changed')));
    await writeFile(join(root,'request.mjs'),code+'// change');
    await assert.rejects(bindDesignEvidence(root,evidence),/Routing evidence changed/);
    assert.ok((await evidenceFreshness(root,bound,true)).some(x=>x.includes('Analysis source changed')));
    assert.equal(evidence.projectHash,await projectDocumentHash(root));
  } finally {await rm(root,{recursive:true,force:true});await rm(other,{recursive:true,force:true});}
});

test('compact receipts pin separate requirements, preserve decision gates, and detect stale or foreign evidence', async () => {
  const root=await fixture(), other=await fixture();
  try {
    await writeFile(join(root,'CONTRACT.md'),'Preserve caller-owned input.\n');
    const original=await fixtureEvidence(root,policy,[issue],'request boundary');
    const context=await taskContext(new FileSystemProjectDiscovery(),system,root,{raw:'request boundary',mode:'prepare',constraints:[],files:['request.mjs'],requirements:['CONTRACT.md']});
    assert.ok(context.contextId && 'candidates' in context.routing);
    const evidence: DesignEvidence = {routes:[{contextId:context.contextId,judgments:await fixtureJudgments(root,context.routing.candidates,['request.mjs'])}],
      decisions:original.decisions.map((item)=>({...item,evidence:[{path:'request.mjs',line:1,quote:code.trim()},{path:'CONTRACT.md',line:1,quote:'Preserve caller-owned input.'}]}))};
    const bound=await bindDesignEvidence(root,evidence);
    assert.equal(bound.requirementHashes?.['CONTRACT.md'],digest('Preserve caller-owned input.\n'));
    assert.ok(!bound.sourceHashes['CONTRACT.md'],'Requirement is pinned without code routing');
    assert.deepEqual(designContractFailures(bound,policy,[issue]),[]);
    const compactPolicy={rules:policy.rules.map(({id,title,statement,layer,obligation,verification})=>({id,title,statement,layer,obligation,verification})),checks:policy.checks,guards:policy.guards};
    const revision=await saveRevision(root,'Compact plan',null,compactPolicy,'compact',[issue],evidence);
    assert.match(revision.policy!.rules[0]!.evidence[0]!,/Decision fixture/);
    await approveRevision(root,revision.hash!,'Supplied fixture authorization','compact');
    const pending={...evidence,decisions:evidence.decisions.map((item)=>({...item,status:'open' as const,selected:undefined,confirmation:''}))};
    const draft=await saveRevision(root,'Open decision',null,compactPolicy,'pending',[issue],pending);
    assert.equal(draft.evidence!.decisions[0]!.confirmation,'');
    assert.match(draft.content,/Confirmation: not supplied/);
    assert.doesNotMatch(draft.content,/host implementation choice/,'An unanswered user choice must not appear delegated to the model');
    assert.equal(draft.approved,false,'Recording provenance does not resolve a pending choice');
    assert.equal(draft.evidence!.decisions[0]!.selected,null);
    const decision=pending.decisions[0]!;
    for(const invalid of [
      {...decision,selected:''}, {...decision,selected:'invented'},
      {...decision,status:'resolved',selected:undefined}, {...decision,status:'resolved',selected:null},
      {...decision,status:'excluded',selected:'invented'}, {...decision,status:'unknown',selected:null},
    ]) assert.equal(designEvidenceSchema.safeParse({...pending,decisions:[invalid]}).success,false);
    assert.equal(designEvidenceSchema.parse({...pending,decisions:[{...decision,status:'excluded'}]}).decisions[0]!.selected,null);
    await assert.rejects(approveRevision(root,draft.hash!,'Cannot invent a choice','pending'),/Unresolved decision/);
    const execution={revisionHash:draft.hash!,status:'in-progress' as const,
      steps:[{id:issue.id,status:'pending' as const,checkIds:[],remaining:[]}],note:'Awaiting an actual user answer'};
    await assert.rejects(saveExecution(root,execution,null,'pending'),/current approved revision/);
    const answered=await saveRevision(root,'Confirmed answer',draft.hash!,compactPolicy,'pending',[issue],evidence);
    await approveRevision(root,answered.hash!,'Supplied fixture authorization for the answered scope','pending');
    await saveExecution(root,{...execution,revisionHash:answered.hash!,note:'Actual fixture answer recorded'},null,'pending');
    assert.equal((await workflowContext(root,'pending')).execution?.revisionHash,answered.hash);
    await assert.rejects(recalledAnalysis(other,context.contextId),/Unknown analysis context/);
    await assert.rejects(bindDesignEvidence(root,{...evidence,routes:[{contextId:'0'.repeat(64),judgments:[]}]}),/Unknown analysis context/);
    await assert.rejects(bindDesignEvidence(root,{...evidence,decisions:evidence.decisions.map((item)=>({...item,evidence:[{path:'contract.mjs',line:1,quote:check.split('\n')[0]!}]}))}),/contract.mjs.*requirements/);
    if(context.routing.candidates.length) await assert.rejects(bindDesignEvidence(root,{...evidence,routes:[{contextId:context.contextId,judgments:[]}]}),/Missing:/);
    const document=await readFile(join(root,'.frontend-system/project.md'),'utf8');
    await writeFile(join(root,'.frontend-system/project.md'),document+'Changed explanation');
    await assert.rejects(bindDesignEvidence(root,evidence),/Project document changed/);
    await writeFile(join(root,'.frontend-system/project.md'),document);
    await writeFile(join(root,'request.mjs'),code+'// changed\n');
    await assert.rejects(bindDesignEvidence(root,evidence),/Routing evidence changed/);
    await writeFile(join(root,'request.mjs'),code);
    await writeFile(join(root,'CONTRACT.md'),'A new requirement\n');
    await assert.rejects(bindDesignEvidence(root,evidence),/Routing evidence changed/);
    assert.ok((await evidenceFreshness(root,bound,false)).some((error)=>error.includes('CONTRACT.md')),'Requirements remain protected during implementation');
  } finally {await rm(root,{recursive:true,force:true});await rm(other,{recursive:true,force:true});}
});

test('known context suppresses only identical routing payload; changed evidence and policy remain visible', async () => {
  const root=await fixture();
  try {
    await writeFile(join(root,'CONTRACT.md'),'Preserve ownership');
    await writeFile(join(root,'view.tsx'),'import {request} from "./request.mjs"; export const load = () => fetch("/orders");');
    const request={raw:'request boundary',mode:'prepare' as const,constraints:[],files:['view.tsx'],requirements:['CONTRACT.md']};
    const discover=new FileSystemProjectDiscovery();
    const first=await taskContext(discover,system,root,request);
    const fresh=await taskContext(discover,system,root,request);
    const repeated=summarizeTaskContext(fresh,first.contextId!);
    assert.ok('reused' in repeated.routing && repeated.routing.reused);
    assert.ok(!('candidates' in repeated.routing));
    assert.deepEqual(repeated.context,summarizeTaskContext(fresh).context);
    assert.deepEqual(repeated.workflow,summarizeTaskContext(fresh).workflow);
    assert.ok(JSON.stringify(repeated).length<JSON.stringify(summarizeTaskContext(fresh)).length);
    for(const change of [
      async()=>writeFile(join(root,'CONTRACT.md'),'Changed requirement'),
      async()=>writeFile(join(root,'view.tsx'),'import {request} from "./request.mjs"; export const load = () => fetch("/new");'),
      async()=>writeFile(join(root,'tsconfig.json'),JSON.stringify({compilerOptions:{baseUrl:'.'}})),
      async()=>writeFile(join(root,'.frontend-system/project.md'),'Changed project explanation'),
    ]) {
      const before=await taskContext(discover,system,root,request);
      await mkdir(join(root,'.frontend-system'),{recursive:true}); await change();
      const after=await taskContext(discover,system,root,request);
      assert.notEqual(after.contextId,before.contextId);
      const summary=summarizeTaskContext(after,before.contextId!);
      assert.ok('candidates' in summary.routing && summary.routing.candidates);
    }
    const changedRequest=await taskContext(discover,system,root,{...request,raw:'different requirement'});
    assert.notEqual(changedRequest.contextId,first.contextId);
    assert.ok('candidates' in summarizeTaskContext(first,'0'.repeat(64)).routing);
  } finally {await rm(root,{recursive:true,force:true});}
});

test('summary removes repeated facts while retaining all candidates, required rules and uncertainty', async () => {
  const root=await fixture();
  try {
    await writeFile(join(root,'view.tsx'),'import React from "react"; export default () => <button onClick={() => fetch("/x")}>Load</button>;');
    const full=await taskContext(new FileSystemProjectDiscovery(),system,root,{raw:'공통 요청 인증 오류 처리',mode:'prepare',constraints:['Preserve user input'],files:['view.tsx']});
    assert.ok('candidates' in full.routing);
    const summary=summarizeTaskContext(full);
    assert.ok('candidates' in summary.routing);
    assert.deepEqual(summary.routing.candidates.map(({id})=>id),full.routing.candidates.map(({id})=>id));
    for (const rule of full.context.applicableRules.filter(({mandatory})=>mandatory)) assert.ok(summary.context.applicableRules.some(({id})=>id===rule.id));
    assert.deepEqual(summary.routing.warnings,full.routing.inspection.analysis.warnings);
    const routed = full.routing;
    for (const original of routed.discovery.entries) {
      const entry: {id: string; triggers: unknown; applicabilityFrom?: string; conditions?: string[]; exclusions?: string[]}
        = summary.routing.semanticDiscovery!.entries.find(item => item.id === original.id)!;
      assert.deepEqual('applicabilityFrom' in entry
        ? routed.candidates.find(item => item.id === entry.id)!.conditions : entry.conditions, original.conditions);
      assert.deepEqual('applicabilityFrom' in entry
        ? routed.candidates.find(item => item.id === entry.id)!.exclusions : entry.exclusions, original.exclusions);
      assert.deepEqual(entry.triggers, original.triggers);
    }
    const overlap = routed.discovery.entries.find(entry => routed.candidates.some(item => item.id === entry.id));
    assert.ok(overlap, 'Exercise overlapping retrieval channels');
    overlap.exclusions = [...overlap.exclusions, 'Additional discovery-only exclusion'];
    const changed = summarizeTaskContext(full).routing;
    assert.ok('semanticDiscovery' in changed);
    assert.deepEqual(changed.semanticDiscovery!.entries.find(entry => entry.id === overlap.id)?.exclusions, overlap.exclusions,
      'Different applicability must never be hidden behind the shared candidate');
    assert.ok(JSON.stringify(summary).length<JSON.stringify(full).length*0.65,'Duplicate payload removal should materially reduce this fixture response');
  } finally {await rm(root,{recursive:true,force:true});}
});

test('pinned main citations may omit hashes and lines; stale quotes and unversioned unpinned evidence still fail', async () => {
  const root=await fixture();
  try {
    await fixtureEvidence(root,policy,[issue]);
    const {record}=await readProjectEvidence(root);
    const evidence={...record,statements:record.statements.map((item)=>({...item,evidence:item.evidence.map(({path,quote})=>({path,quote}))}))};
    await assert.rejects(validateProjectEvidence(root,evidence,'main',null),/working citations need/);
    await git(root,['init','-b','main']);await git(root,['add','package.json','request.mjs','contract.mjs']);
    await git(root,['-c','user.name=Test','-c','user.email=test@local','commit','-m','Baseline']);
    const commit=(await git(root,['rev-parse','HEAD'])).trim();
    const pinned=await validateProjectEvidence(root,evidence,'main',commit);
    assert.equal(pinned.statements[0]!.evidence[0]!.hash,digest(code));
    assert.equal(pinned.statements[0]!.evidence[0]!.line,1);
    await assert.rejects(validateProjectEvidence(root,{...evidence,statements:evidence.statements.map((item)=>({...item,evidence:item.evidence.map((cite)=>({...cite,quote:'invented'}))}))},'main',commit),/invented/);
  } finally {await rm(root,{recursive:true,force:true});}
});

test('plan approval and work start pin the exact flow version; delivery can retain historical analysis', async()=>{
  const {saveProjectAnalysis}=await import('../src/application/project-flows.js');
  const {flowSchema}=await import('../src/application/flow-schema.js');
  const root=await fixture();
  try {
    const evidence=await fixtureEvidence(root,policy,[issue]);
    const data=flowSchema.parse({id:'request',title:'Request delegation',basis:'observed',summary:'Caller input is forwarded',
      scope:{files:['request.mjs'],discoveryRoots:['.']},evidence:{source:{path:'request.mjs',quote:code.trim()}},
      nodes:[{id:'request',kind:'module',label:'request',evidence:['source']}],
      edges:[{id:'delegate',from:'request',to:'request',kind:'call',label:'send(input)',evidence:['source']}],
      scenarios:[{id:'request',title:'Request',entry:'request',event:'call',steps:[{edge:'delegate',effect:'Return transport result'}],outcome:'Response returned'}],limitations:['Synthetic delegation, transport internals excluded']});
    const flow=await saveProjectAnalysis(root,system,{expectedHash:null,record:{kind:'flow',data}});
    evidence.analysisRefs=[{kind:'flow',id:flow.id,hash:flow.hash,issueIds:[issue.id]}];
    const revision=await saveRevision(root,'Preserve delegation',null,policy,'flow-bound',[issue],evidence);
    assert.deepEqual(revision.evidence!.analysisRefs,evidence.analysisRefs);
    await approveRevision(root,revision.hash!,'Exact scope approved','flow-bound');
    await saveProjectAnalysis(root,system,{expectedHash:flow.hash,record:{kind:'flow',data:{...data,title:'Reinterpreted scope'}}});
    await assert.rejects(approveRevision(root,revision.hash!,'Old evidence','flow-bound'),/Analysis version changed/);
    await assert.rejects(startWork(root,{planId:'flow-bound',revisionHash:revision.hash!,stepId:issue.id,kind:'implement'}),/Analysis version changed/);
    assert.deepEqual(await evidenceFreshness(root,revision.evidence!,false),[]);
    assert.equal((await workflowContext(root,'flow-bound')).execution,null);
  } finally {await rm(root,{recursive:true,force:true});}
});
