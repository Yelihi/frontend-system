import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { FileSystemProjectDiscovery } from "../src/adapters/filesystem/project-discovery.js";
import { projectDocumentStatus, projectSnapshot, readProjectSource, readProjectSources, recordProjectRefresh } from "../src/application/project-snapshot.js";
import { readProjectDocument, writeProjectArtifacts } from "../src/application/project-store.js";
import { runProjectChecks } from "../src/application/run-capabilities.js";
import { approveRevision, beginAttempt, digest, listPlans, readCheckRecord, readRevision, saveExecution, saveRevision, workflowContext } from "../src/application/workflow-store.js";
import { ruleId, ruleSchema, type VerificationPolicy } from "../src/application/policy.js";
import { fixtureEvidence } from './design-evidence-fixture.js';

const run = promisify(execFile);
const discovery = new FileSystemProjectDiscovery();
const profile = async (root: string) => discovery.discover(await discovery.createRef(root));
const analysis = { summary: "Main context", observed: ["package.json"], architecture: [], conventions: [], decisions: [], qualityGates: [], assumptions: [], questions: [] };
const issue = { id: "first", title: "Preserve behavior", contract: "One equals one", files: ["case.cjs"], dependsOn: [] as string[], requiredCheckIds: ["unit"], acceptance: ["The actual test passes"] };
const testCode = "require('node:test')('contract', () => require('node:assert/strict').equal(1, 1));";
function policy(): VerificationPolicy {
  return { version: 1, rules: [{ id: "contract", version: 1, title: "Contract", statement: "One equals one", layer: "domain", obligation: "required", conditions: [], exclusions: [], evidence: ["User requirement"], verification: "behavior-test", examples: [], validation: "proposed", limitations: [] }],
    checks: [{ id: "unit", script: "test:unit", command: "node --test case.cjs", ruleIds: ["contract"], guardPaths: ["case.cjs"] }],
    reviews: [], exceptions: [], guards: [{ path: "case.cjs", hash: digest(testCode) }] };
}
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "fs-plans-"));
  await writeFile(join(root, "package.json"), JSON.stringify({ scripts: { "test:unit": "node --test case.cjs", test: 'node -e "process.exit(1)"', check: 'node -e "process.exit(1)"', lint: "node -e \"process.exit(0)\"", build: "node -e \"process.exit(1)\"" } }));
  await writeFile(join(root, "case.cjs"), testCode);
  return root;
}

test("named plans isolate approvals, attempts and evidence while preserving legacy records", async () => {
  const root = await fixture();
  try {
    const legacy = await saveRevision(root, "Legacy design", null);
    const evidence = await fixtureEvidence(root, policy(), [issue]);
    const a = await saveRevision(root, "Design", null, policy(), "alpha", [issue], evidence);
    const b = await saveRevision(root, "Design", null, policy(), "beta", [issue], evidence);
    assert.notEqual(a.hash, b.hash);
    assert.equal((await readRevision(root)).hash, legacy.hash);
    assert.deepEqual((await listPlans(root)).map(({ id }) => id), ["alpha", "beta"]);
    await approveRevision(root, a.hash!, "Implement the discussed plan", "alpha");
    assert.equal((await readRevision(root, "beta")).approved, false);
    const execution = { revisionHash: a.hash!, status: "in-progress" as const, kind: "implement" as const,
      steps: [{ id: issue.id, title: issue.title, files: issue.files, dependsOn: [], requiredCheckIds: issue.requiredCheckIds, status: "pending" as const, checkIds: [] as string[], remaining: [] as string[] }], note: "Contract" };
    await assert.rejects(saveExecution(root, { ...execution, steps: [{ ...execution.steps[0]!, files: [] }] }, null, "alpha"), /approved issue/);
    const saved = await saveExecution(root, execution, null, "alpha");
    const attempt = await beginAttempt(root, "first", saved.hash, "alpha");
    const check = await runProjectChecks(await profile(root), { planId: "alpha", stage: "issue", attemptId: attempt.id });
    assert.deepEqual(check.results.map(({ capability }) => capability), ["test:unit"]);
    assert.ok(check.results.every(({ passed }) => passed));
    await assert.rejects(readCheckRecord(root, check.id, "beta"), /ENOENT/);
    await assert.rejects(runProjectChecks(await profile(root), { planId: "beta", attemptId: attempt.id }));
    const delivery = await runProjectChecks(await profile(root), { planId: "alpha", stage: "delivery", attemptId: attempt.id });
    const done = { ...execution, status: "complete" as const, finalCheckId: delivery.id, steps: [{ ...execution.steps[0]!, status: "complete" as const, attemptId: attempt.id, checkIds: [check.id] }] };
    await saveExecution(root, done, saved.hash, "alpha");
    assert.equal((await workflowContext(root, "alpha")).verification.status, "verified");
    assert.equal((await workflowContext(root, "beta")).execution, null);
    await writeFile(join(root, ".frontend-system/plans/alpha/plan.md"), "Manual change");
    assert.equal((await readRevision(root, "alpha")).approved, false);
    assert.equal((await workflowContext(root, "alpha")).needsRevalidation, true);
    await assert.rejects(runProjectChecks(await profile(root), { planId: "alpha", stage: "delivery" }), /approved/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("plan contracts reject unknown checks, cycles and unsafe paths before writing", async () => {
  const root = await fixture();
  const outside = await mkdtemp(join(tmpdir(), "fs-outside-"));
  try {
    await assert.rejects(saveRevision(root, "Design", null, policy(), "cycle", [{ ...issue, dependsOn: ["first"] }]), /Cyclic/);
    await assert.rejects(saveRevision(root, "Design", null, policy(), "missing", [{ ...issue, dependsOn: ["absent"] }]), /Unknown dependency/);
    await assert.rejects(saveRevision(root, "Design", null, policy(), "checks", [{ ...issue, requiredCheckIds: ["absent"] }]), /Unknown issue check/);
    await assert.rejects(saveRevision(root, "Design", null, policy(), "../escape", [issue]));
    await mkdir(join(root, ".frontend-system/plans"));
    await symlink(outside, join(root, ".frontend-system/plans/escape"));
    await assert.rejects(saveRevision(root, "Design", null, policy(), "escape", [issue]), /symbolic links/);
    await assert.rejects(readFile(join(outside, "plan.md")), /ENOENT/);
  } finally { await rm(root, { recursive: true, force: true }); await rm(outside, { recursive: true, force: true }); }
});

test("baseline excludes build and delivery cannot be narrowed to an issue", async () => {
  const root = await fixture();
  try {
    const baseline = await runProjectChecks(await profile(root), { stage: "baseline" });
    assert.equal(baseline.purpose, "baseline");
    assert.deepEqual(baseline.results.map(({ capability }) => capability), ["lint", "test:unit"]);
    assert.ok(baseline.results.every(({ passed }) => passed));
    const revision = await saveRevision(root, "Design", null, policy(), "alpha", [issue], await fixtureEvidence(root, policy(), [issue]));
    await approveRevision(root, revision.hash!, "Approved", "alpha");
    const partial = await runProjectChecks(await profile(root), { planId: "alpha", capabilities: ["lint"] });
    assert.ok(partial.results.every(({ passed }) => passed));
    assert.deepEqual(partial.coverage, { requiredScripts: ["test:unit"], missingOrFailedScripts: ["test:unit"], allRequiredPassed: false },
      "A passing subset must not claim policy coverage");
    await writeFile(join(root, "case.cjs"), testCode + "\n// Changed guard");
    const invalid = await runProjectChecks(await profile(root), { planId: "alpha", stage: "delivery" });
    assert.equal(invalid.coverage?.allRequiredPassed, false);
    assert.equal(invalid.results[0]!.status, "not-run");
    await assert.rejects(runProjectChecks(await profile(root), { planId: "alpha", stage: "issue", required: true, stepId: "first" }), /narrowed/);
    await assert.rejects(runProjectChecks(await profile(root), { planId: "alpha", stage: "issue", stepId: "missing" }), /approved issue/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("project context uses main objects, detects drift and preserves prior documents on stale saves", async () => {
  const root = await fixture();
  const git = (...args: string[]) => run("git", ["-C", root, ...args]);
  try {
    await git("init", "-b", "main"); await git("config", "user.email", "fixture@example.invalid"); await git("config", "user.name", "Fixture");
    await git("add", "."); await git("commit", "-m", "Initial");
    const main = await projectSnapshot(root);
    await git("checkout", "-b", "feature");
    await writeFile(join(root, "case.cjs"), "Feature branch only");
    const dirty = await projectSnapshot(root);
    assert.equal(dirty.sourceHash, main.sourceHash);
    assert.deepEqual(dirty.workingChanges, ["case.cjs"]);
    assert.equal((await readProjectSource(root, "case.cjs", main.commit!)).content, testCode);
    await assert.rejects(readProjectSource(root, "../outside", main.commit!), /Select a file/);
    await writeProjectArtifacts(await profile(root), analysis, { expectedCommit: main.commit, expectedHash: null });
    const document = await readProjectDocument(root);
    await recordProjectRefresh(root, "main", main.commit, "pending", "Inspecting main");
    assert.equal((await projectDocumentStatus(root)).status, "pending");
    await recordProjectRefresh(root, "main", main.commit, "failed", "Runner evidence unavailable");
    assert.equal((await projectDocumentStatus(root)).status, "failed");
    assert.equal(await readProjectDocument(root), document);
    await writeProjectArtifacts(await profile(root), analysis, { expectedCommit: main.commit, expectedHash: digest(document) });
    const refreshedDocument = await readProjectDocument(root);
    assert.equal((await projectDocumentStatus(root)).status, "current");
    await assert.rejects(writeProjectArtifacts(await profile(root), analysis, { expectedCommit: main.commit, expectedHash: null }), /document changed/);
    await git("restore", "case.cjs"); await git("checkout", "main");
    await git("add", ".frontend-system/project.md", ".frontend-system/.gitignore"); await git("commit", "-m", "Document only");
    assert.equal((await projectDocumentStatus(root)).status, "current", "Generated documents must not cause refresh loops");
    await writeFile(join(root, "case.cjs"), `${testCode}\n// Changed main`); await git("add", "case.cjs"); await git("commit", "-m", "Main change");
    assert.equal((await projectDocumentStatus(root)).status, "stale");
    await assert.rejects(writeProjectArtifacts(await profile(root), analysis, { expectedCommit: main.commit, expectedHash: digest(refreshedDocument) }), /main/);
    assert.equal(await readProjectDocument(root), refreshedDocument);
    const next = await projectSnapshot(root);
    await writeProjectArtifacts(await profile(root), { ...analysis, summary: "Updated context" }, { expectedCommit: next.commit, expectedHash: digest(refreshedDocument) });
    assert.equal(await readFile(join(root, `.frontend-system/project-history/${digest(document)}.md`), "utf8"), document);
    assert.equal((await projectDocumentStatus(root)).status, "current");
    await git("branch", "-m", "other");
    await assert.rejects(projectSnapshot(root), /revision|ambiguous|Needed/);
  } finally { await rm(root, { recursive: true, force: true }); }
});


test("batched main source reads bound output, preserve hashes and pagination, and reject stale or untracked scope", async () => {
  const root = await fixture();
  const git = (...args: string[]) => run("git", ["-C", root, ...args]);
  try {
    const paths = ['a.mjs', 'b.mjs', 'c.mjs'];
    for (const path of paths) await writeFile(join(root, path), path.repeat(4000));
    await git('init', '-b', 'main'); await git('config', 'user.email', 'fixture@example.invalid'); await git('config', 'user.name', 'Fixture');
    await git('add', '.'); await git('commit', '-m', 'Initial');
    const snapshot = await projectSnapshot(root);
    await writeFile(join(root, 'a.mjs'), 'Dirty working content must not leak');
    const batch = await readProjectSources(root, paths, snapshot.commit!, 'main', 0, 12000);
    assert.equal(batch.files.reduce((sum, file) => sum + file.content.length, 0), 24000);
    for (const file of batch.files) {
      const expected = file.path.repeat(4000);
      assert.equal(file.hash, digest(expected));
      assert.equal(file.totalCharacters, expected.length);
      const next = await readProjectSource(root, file.path, snapshot.commit!, 'main', file.nextOffset!);
      assert.equal(file.content + next.content, expected);
      assert.equal(next.nextOffset, null);
    }
    await assert.rejects(readProjectSources(root, ['a.mjs', '../outside'], snapshot.commit!), /Select a file/);
    await assert.rejects(readProjectSources(root, ['a.mjs', 'a.mjs'], snapshot.commit!), /distinct/);
    await git('add', 'a.mjs'); await git('commit', '-m', 'Change main');
    await assert.rejects(readProjectSources(root, paths, snapshot.commit!), /Main changed/);
  } finally { await rm(root, {recursive: true, force: true}); }
});

test('large source requests page unread paths without raising the per-page read budget', async () => {
  const root = await fixture();
  const git = (...args: string[]) => run('git', ['-C', root, ...args]);
  const paths = Array.from({length: 43}, (_, index) => `file-${index}.mjs`);
  try {
    for (const path of paths) await writeFile(join(root, path), path.repeat(200));
    await git('init', '-b', 'main'); await git('config', 'user.email', 'fixture@example.invalid'); await git('config', 'user.name', 'Fixture');
    await git('add', '.'); await git('commit', '-m', 'Large scope');
    const snapshot = await projectSnapshot(root);
    const first = await readProjectSources(root, paths, snapshot.commit!, 'main', 0, 12000);
    assert.equal(first.files.length, 40);
    assert.equal(first.files.reduce((sum, file) => sum + file.content.length, 0), 24000);
    assert.deepEqual(first.nextPaths, paths.slice(40));
    const client = new Client({name: 'source-page-test', version: '1'});
    try {
      await client.connect(new StdioClientTransport({command: process.execPath, args: [join(process.cwd(), 'bundle/mcp.js')]}));
      const response = await client.callTool({name: 'read_project_source', arguments: {projectPath: root, path: paths, expectedCommit: snapshot.commit, limit: 12000}});
      assert.ok(!response.isError, JSON.stringify(response));
      const page = JSON.parse((response.content as Array<{text: string}>)[0]!.text);
      assert.deepEqual(page, first);
    } finally {await client.close();}

    assert.ok(first.files.every(file => !first.nextPaths.includes(file.path)));
    const second = await readProjectSources(root, first.nextPaths, snapshot.commit!);
    assert.deepEqual(second.files.map(file => file.path), paths.slice(40));
    assert.deepEqual(second.nextPaths, []);
    for (const file of second.files) assert.equal(file.hash, digest(file.path.repeat(200)));
    await assert.rejects(readProjectSources(root, [...paths, '../outside'], snapshot.commit!), /Select a file/);
    await assert.rejects(readProjectSources(root, [...paths, paths[0]!], snapshot.commit!), /distinct/);
    await assert.rejects(readProjectSources(root, Array.from({length:101}, (_,i)=>`file-${i}`), snapshot.commit!), /1–100/);
    await writeFile(join(root, paths[42]!), 'changed'); await git('add', '.'); await git('commit', '-m', 'Changed');
    await assert.rejects(readProjectSources(root, first.nextPaths, snapshot.commit!), /Main changed/);
  } finally {await rm(root, {recursive: true, force: true});}
});

test('mixed-size main sources use the aggregate budget before requesting another page', async () => {
  const root = await fixture();
  const git = (...args: string[]) => run('git', ['-C', root, ...args]);
  try {
    const contents = {'short.mjs': 'a'.repeat(3000), 'long.mjs': 'b'.repeat(9000), 'other.mjs': 'c'.repeat(9000)};
    for (const [path, content] of Object.entries(contents)) await writeFile(join(root, path), content);
    await git('init', '-b', 'main'); await git('config', 'user.email', 'fixture@example.invalid'); await git('config', 'user.name', 'Fixture');
    await git('add', '.'); await git('commit', '-m', 'Mixed sizes');
    const snapshot = await projectSnapshot(root);
    const batch = await readProjectSources(root, Object.keys(contents), snapshot.commit!, 'main', 0, 12000);
    for (const file of batch.files) {
      const expected = contents[file.path as keyof typeof contents];
      assert.equal(file.content, expected); assert.equal(file.hash, digest(expected));
      assert.equal(file.nextOffset, null);
    }
  } finally { await rm(root, {recursive: true, force: true}); }
});

test("MCP and CLI expose named workflows and migrate init.md with canonical document hashes", async () => {
  const root = await fixture();
  const client = new Client({ name: "plan-integration", version: "1" });
  try {
    await mkdir(join(root, ".frontend-system"));
    await writeFile(join(root, ".frontend-system/init.md"), "Keep existing decisions");
    await client.connect(new StdioClientTransport({ command: process.execPath, args: [join(process.cwd(), "bundle/mcp.js")] }));
    const call = async (name: string, args: Record<string, unknown> = {}) => {
      const response = await client.callTool({ name, arguments: { projectPath: root, ...args } });
      assert.ok(!response.isError, JSON.stringify(response));
      return JSON.parse((response.content as Array<{ text: string }>)[0]!.text) as Record<string, unknown>;
    };
    const snapshot = await call("get_project_snapshot");
    assert.equal(snapshot.documentHash, null, "Legacy fallback is not the new document's CAS hash");
    const wrongGuard = await client.callTool({name: 'save_project_context', arguments: {
      projectPath: root, analysis, expectedCommit: null, expectedHash: snapshot.sourceHash,
    }});
    assert.equal(wrongGuard.isError, true, 'Source hashes never replace the document CAS guard');
    await assert.rejects(readFile(join(root, '.frontend-system/project.md')), /ENOENT/);
    await call("save_project_context", { analysis, expectedCommit: null, expectedHash: snapshot.documentHash });
    assert.equal(await readFile(join(root, ".frontend-system/init.md"), "utf8"), "Keep existing decisions");
    const window = await call("get_project_document", { limit: 20 });
    assert.equal(window.nextOffset, 20);
    const compactPolicy = { ...policy(), checks: [{ id: "unit", script: "test:unit", ruleIds: ["contract"], guardPaths: ["case.cjs"] }],
      guards: [{ path: "case.cjs" }] };
    const evidence = await fixtureEvidence(root, policy(), [issue]);
    const a = await call("save_revision", { planId: "alpha", content: "First design", policy: compactPolicy, issues: [issue], expectedHash: null, evidence });
    assert.equal(a.content, undefined, "Default save response is a receipt, not another copy of the plan");
    const contract = await call("get_revision", {planId: "alpha", expectedHash: a.hash});
    await call("approve_revision", { planId: "alpha", expectedHash: a.hash, approval: "Proceed with this plan" });
    assert.equal((await call("get_workflow_context", { planId: "alpha" })).enforcement, "policy");
    assert.match(await readFile(join(root, ".frontend-system/plans/alpha/plan.md"), "utf8"), /One equals one/);
    assert.deepEqual((contract.policy as VerificationPolicy), policy(), "The server pins actual script bodies and guard hashes");
    const execution = { revisionHash: a.hash, status: "in-progress", steps: [{ id: issue.id, status: "pending", checkIds: [], remaining: [] }], note: "Implement" };
    const saved = await call("save_execution", { planId: "alpha", execution, expectedHash: null });
    const attempt = await call("begin_work_attempt", { planId: "alpha", stepId: "first", expectedHash: saved.hash });
    const checks = await call("run_project_checks", { planId: "alpha", stage: "delivery", attemptId: attempt.id });
    const record = await call("get_check_record", { planId: "alpha", id: checks.id });
    assert.equal(record.stage, "delivery");
    assert.equal(record.full, false, "Legacy flag remains backward compatible");
    assert.deepEqual(record.coverage, { requiredScripts: ["test:unit"], missingOrFailedScripts: [], allRequiredPassed: true });
    await call("save_execution", { planId: "alpha", expectedHash: saved.hash,
      execution: { ...execution, status: "complete", finalCheckId: checks.id,
        steps: [{ id: issue.id, status: "complete", checkIds: [checks.id], attemptId: attempt.id, remaining: [] }] } });
    assert.equal(((await call("get_workflow_context", { planId: "alpha" })).verification as { status: string }).status, "verified");
    assert.equal(record.planId, "alpha");
    const cli = await run(process.execPath, [join(process.cwd(), "dist/src/cli.js"), "checks", root, "--plan", "alpha", "--stage", "delivery", "--attempt", String(attempt.id)]);
    assert.equal(JSON.parse(cli.stdout).planId, "alpha");
    const revised = await call("save_revision", { planId: "alpha", content: contract.content, expectedHash: a.hash, detail: "full" });
    assert.ok(revised.content && revised.evidence, "Explicit full response remains available");
    assert.notEqual(revised.hash, a.hash, "Named approval binds the revision version even if text repeats");
    assert.equal(revised.approved, false);
    const stale = await client.callTool({ name: "run_project_checks", arguments: { projectPath: root, planId: "alpha", stage: "delivery", attemptId: attempt.id } });
    assert.equal(stale.isError, true);
  } finally { await client.close(); await rm(root, { recursive: true, force: true }); }
});


test("an approved aggregate behavior checker can complete without inventing child executions", async () => {
  const root = await fixture();
  try {
    await writeFile(join(root, "package.json"), JSON.stringify({ scripts: { check: "node --test case.cjs" } }));
    const aggregate = policy();
    aggregate.checks[0]!.script = "check";
    const revision = await saveRevision(root, "Use the existing aggregate", null, aggregate, "aggregate", [issue], await fixtureEvidence(root, aggregate, [issue]));
    await approveRevision(root, revision.hash!, "Approved", "aggregate");
    const execution = { revisionHash: revision.hash!, status: "in-progress" as const,
      steps: [{ id: issue.id, title: issue.title, files: issue.files, dependsOn: [], requiredCheckIds: issue.requiredCheckIds, status: "pending" as const, checkIds: [] as string[], remaining: [] as string[] }], note: "Existing runner" };
    const saved = await saveExecution(root, execution, null, "aggregate");
    const attempt = await beginAttempt(root, "first", saved.hash, "aggregate");
    const check = await runProjectChecks(await profile(root), { planId: "aggregate", stage: "delivery", attemptId: attempt.id });
    assert.deepEqual(check.results.map(({ capability }) => capability), ["check"]);
    await saveExecution(root, { ...execution, status: "complete", finalCheckId: check.id,
      steps: [{ ...execution.steps[0]!, status: "complete", checkIds: [check.id], attemptId: attempt.id }] }, saved.hash, "aggregate");
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("approval validates pinned commands and files without silently refreshing a revision", async () => {
  const root = await fixture();
  try {
    const wrong = policy();
    wrong.checks[0]!.command = "npm run test:unit";
    const draft = await saveRevision(root, "Draft with launcher instead of script body", null, wrong);
    await assert.rejects(approveRevision(root, draft.hash!, "Approved"), /Missing or changed required script/);
    assert.equal((await readRevision(root)).approved, false);
    const input = { ...policy(), guards: [{ path: "case.cjs" }],
      checks: [{ id: "unit", script: "test:unit", ruleIds: ["contract"], guardPaths: ["case.cjs"] }] };
    const pinned = await saveRevision(root, "Pinned draft", draft.hash, input);
    await writeFile(join(root, "case.cjs"), testCode + "\n// Changed after saving");
    const preserved = await saveRevision(root, "Text-only revision", pinned.hash);
    assert.deepEqual(preserved.policy, pinned.policy, "Omitting policy must preserve its original pins");
    await assert.rejects(approveRevision(root, preserved.hash!, "Approved"), /Protected verification asset changed/);
    await writeFile(join(root, "case.cjs"), testCode);
    await writeFile(join(root, "package.json"), JSON.stringify({ scripts: { "test:unit": "node --test other.cjs" } }));
    await assert.rejects(approveRevision(root, preserved.hash!, "Approved"), /Missing or changed required script/);
    assert.equal((await readRevision(root)).hash, preserved.hash);
    await assert.rejects(saveRevision(root, "Unknown script", preserved.hash, { ...input,
      checks: [{ ...input.checks[0]!, script: "absent" }] }), /Missing required script: absent/);
    await assert.rejects(saveRevision(root, "Unknown asset", preserved.hash, { ...input,
      guards: [{ path: "missing.cjs" }] }), /Missing verification asset: missing.cjs/);
    assert.equal((await readRevision(root)).hash, preserved.hash, "Invalid inputs must not mutate the draft");
    await assert.rejects(saveExecution(root, { revisionHash: preserved.hash!, status: "in-progress",
      steps: [{ id: "first", status: "pending", checkIds: [], remaining: [] }], note: "" }, null),
    /title|files/, "Legacy executions still require explicit contracts");
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("semantic policy keys accept requirement and resolver IDs without widening filesystem IDs", () => {
  for (const id of ["R1", "mandatory:common:clean-code", "user:중복-주문-금지"]) {
    assert.equal(ruleSchema.parse({ ...policy().rules[0]!, id }).id, id);
    assert.equal(ruleId.safeParse(id).success, false);
  }
  for (const id of ["../escape", "/absolute", "a/b"]) {
    assert.equal(ruleSchema.safeParse({ ...policy().rules[0]!, id }).success, false);
  }
});

test("Git configuration errors are not reported as an unversioned project", async () => {
  const root = await fixture();
  const original = process.env.GIT_CONFIG_GLOBAL;
  try {
    const config = join(root, "invalid.gitconfig");
    await writeFile(config, "[broken");
    process.env.GIT_CONFIG_GLOBAL = config;
    await assert.rejects(projectSnapshot(root), /bad config|invalid config/i);
  } finally {
    if (original === undefined) delete process.env.GIT_CONFIG_GLOBAL;
    else process.env.GIT_CONFIG_GLOBAL = original;
    await rm(root, { recursive: true, force: true });
  }
});
