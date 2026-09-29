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
import { projectDocumentStatus, projectSnapshot, readProjectSource, recordProjectRefresh } from "../src/application/project-snapshot.js";
import { readProjectDocument, writeProjectArtifacts } from "../src/application/project-store.js";
import { runProjectChecks } from "../src/application/run-capabilities.js";
import { approveRevision, beginAttempt, digest, listPlans, readCheckRecord, readRevision, saveExecution, saveRevision, workflowContext } from "../src/application/workflow-store.js";
import type { VerificationPolicy } from "../src/application/policy.js";

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
    const a = await saveRevision(root, "Design", null, policy(), "alpha", [issue]);
    const b = await saveRevision(root, "Design", null, policy(), "beta", [issue]);
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
    const revision = await saveRevision(root, "Design", null, policy(), "alpha", [issue]);
    await approveRevision(root, revision.hash!, "Approved", "alpha");
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
    await call("save_project_context", { analysis, expectedCommit: null, expectedHash: snapshot.documentHash });
    assert.equal(await readFile(join(root, ".frontend-system/init.md"), "utf8"), "Keep existing decisions");
    const window = await call("get_project_document", { limit: 20 });
    assert.equal(window.nextOffset, 20);
    const a = await call("save_revision", { planId: "alpha", content: "First design", policy: policy(), issues: [issue], expectedHash: null });
    await call("approve_revision", { planId: "alpha", expectedHash: a.hash, approval: "Proceed with this plan" });
    assert.equal((await call("get_workflow_context", { planId: "alpha" })).enforcement, "policy");
    assert.match(await readFile(join(root, ".frontend-system/plans/alpha/plan.md"), "utf8"), /One equals one/);
    const execution = { revisionHash: a.hash, status: "in-progress", steps: [{ id: issue.id, title: issue.title, files: issue.files, dependsOn: [], requiredCheckIds: issue.requiredCheckIds, status: "pending", checkIds: [], remaining: [] }], note: "Implement" };
    const saved = await call("save_execution", { planId: "alpha", execution, expectedHash: null });
    const attempt = await call("begin_work_attempt", { planId: "alpha", stepId: "first", expectedHash: saved.hash });
    const checks = await call("run_project_checks", { planId: "alpha", stage: "issue", attemptId: attempt.id });
    const record = await call("get_check_record", { planId: "alpha", id: checks.id });
    assert.equal(record.stage, "issue");
    assert.equal(record.planId, "alpha");
    const cli = await run(process.execPath, [join(process.cwd(), "dist/src/cli.js"), "checks", root, "--plan", "alpha", "--stage", "delivery", "--attempt", String(attempt.id)]);
    assert.equal(JSON.parse(cli.stdout).planId, "alpha");
    const revised = await call("save_revision", { planId: "alpha", content: a.content, expectedHash: a.hash });
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
    const revision = await saveRevision(root, "Use the existing aggregate", null, aggregate, "aggregate", [issue]);
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
