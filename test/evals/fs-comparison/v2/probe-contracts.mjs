// Historical reproduction: requires the pre-fix source hashes recorded in the result.
// Current regressions live in test/plans-project.test.ts; never replace historical model scores.
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { FileSystemProjectDiscovery } from '../../../../dist/src/adapters/filesystem/project-discovery.js';
import { ruleId } from '../../../../dist/src/application/policy.js';
import { RuleResolver } from '../../../../dist/src/application/rules/rule-resolver.js';
import { runProjectChecks } from '../../../../dist/src/application/run-capabilities.js';
import { approveRevision, beginAttempt, digest, saveExecution, saveRevision, workflowContext } from '../../../../dist/src/application/workflow-store.js';

const output = new URL('./results/contract-diagnosis-2026-10-01.json', import.meta.url);
const baseline = JSON.parse(await readFile(output, 'utf8'));
for (const [path, expected] of Object.entries(baseline.sourceHashes)) {
  assert.equal(digest(await readFile(path, 'utf8')), expected,
    `Historical diagnostic requires its recorded pre-fix source: ${path}. Run current regression tests with npm test instead.`);
}
const command = 'node --test submit.test.cjs';
const testSource = "const test=require('node:test'),assert=require('node:assert/strict');const {canSubmit}=require('./submit.cjs');test('initial submission',()=>assert.equal(canSubmit(false),true));\n";
const discovery = new FileSystemProjectDiscovery();
const evidence = { kind: 'synthetic-contract-diagnostics', modelCalls: 0, findings: {}, sourceHashes: {} };

function policy(checkCommand) {
  return {
    version: 1,
    rules: [{ id: 'pending', version: 1, title: 'Pending submissions', statement: 'Reject submission while pending', layer: 'domain', obligation: 'required', conditions: ['Submission'], exclusions: [], evidence: ['Synthetic diagnostic contract'], verification: 'behavior-test', examples: [], validation: 'proposed', limitations: [] }],
    checks: [{ id: 'submission-test', script: 'test:unit', command: checkCommand, ruleIds: ['pending'], guardPaths: ['submit.test.cjs'] }],
    reviews: [], guards: [{ path: 'submit.test.cjs', hash: digest(testSource) }], exceptions: [],
  };
}

for (const scenario of ['wrong-command', 'coverage-gap']) {
  const root = await mkdtemp(join(tmpdir(), 'fs-contract-probe-'));
  try {
    await writeFile(join(root, 'package.json'), JSON.stringify({ scripts: { 'test:unit': command } }));
    await writeFile(join(root, 'submit.cjs'), 'exports.canSubmit = () => true;\n');
    await writeFile(join(root, 'submit.test.cjs'), testSource);
    const revision = await saveRevision(root, 'Synthetic: reject submissions while pending', null, policy(scenario === 'wrong-command' ? 'npm run test:unit' : command));
    const approved = await approveRevision(root, revision.hash, 'Synthetic diagnostic fixture approval');
    assert.equal(approved.approved, true);
    const profile = await discovery.discover(await discovery.createRef(root));
    if (scenario === 'wrong-command') {
      const checks = await runProjectChecks(profile, { required: true });
      assert.equal(checks.results[0].status, 'not-run');
      assert.match(checks.results[0].reason, /Missing or changed required script/);
      evidence.findings.approvalBeforeCommandValidation = { approved: approved.approved, checkStatus: checks.results[0].status, reason: checks.results[0].reason, declaredCommand: 'npm run test:unit', actualScriptBody: command };
    } else {
      const execution = { revisionHash: revision.hash, status: 'in-progress', steps: [{ id: 'submit', title: 'Submission', status: 'pending', files: ['submit.cjs'], checkIds: [], remaining: ['Verify'] }], note: 'Synthetic incomplete behavioral coverage' };
      const saved = await saveExecution(root, execution, null);
      const attempt = await beginAttempt(root, 'submit', saved.hash);
      const checks = await runProjectChecks(profile, { stage: 'delivery', attemptId: attempt.id });
      assert.ok(checks.results.every(item => item.status === 'passed'));
      assert.equal(checks.full, false);
      await saveExecution(root, { ...execution, status: 'complete', finalCheckId: checks.id, steps: [{ ...execution.steps[0], status: 'complete', checkIds: [checks.id], attemptId: attempt.id, remaining: [] }] }, saved.hash);
      const state = await workflowContext(root);
      assert.equal(state.verification.status, 'verified');
      const { canSubmit } = await import(pathToFileURL(join(root, 'submit.cjs')));
      const actual = canSubmit(true);
      assert.equal(actual, true);
      evidence.findings.coverageGap = { verification: state.verification.status, checkStatus: checks.results[0].status, inputPending: true, expectedCanSubmit: false, actualCanSubmit: actual, protectedTest: true, testAssertion: 'Only initial submission is tested', interpretation: 'The declared checker passed and was not weakened. This proves evidence linkage, not adequate behavioral coverage. Not a security bypass.' };
      evidence.findings.deliveryFullFlag = { stage: checks.stage, full: checks.full, allPolicyChecksPassed: true, acceptedCompletion: state.execution.status };
    }
  } finally { await rm(root, { recursive: true, force: true }); }
}

const resolved = await new RuleResolver(join(process.cwd(), 'mandatory-rules')).resolve(
  { technologies: [], constraints: [], conventions: [] }, { constraints: [] }, [], [],
);
const mandatory = resolved.filter(item => item.mandatory);
assert.ok(mandatory.length);
const incompatible = mandatory.filter(item => !ruleId.safeParse(item.id).success);
assert.equal(incompatible.length, mandatory.length);
evidence.findings.resolverPolicyIdentity = { mandatoryCount: mandatory.length, incompatibleIds: incompatible.map(item => item.id), interpretation: 'Resolved reading-priority IDs cannot be used directly as pinned policy IDs. A translation/selection step is required; this alone is not proof of omitted rules in model runs.' };
for (const name of ['src/application/policy.ts', 'src/application/workflow-store.ts', 'src/application/run-capabilities.ts', 'src/application/rules/rule-resolver.ts', 'test/policy-workflow.test.ts', 'test/knowledge-index.test.ts']) {
  evidence.sourceHashes[name] = digest(await readFile(name, 'utf8'));
}
await writeFile(output, JSON.stringify(evidence, null, 2) + '\n');
console.log(JSON.stringify(evidence.findings, null, 2));
