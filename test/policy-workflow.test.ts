import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import test from "node:test";
import { FileSystemProjectDiscovery } from "../src/adapters/filesystem/project-discovery.js";
import { policySchema, type VerificationPolicy } from "../src/application/policy.js";
import { runProjectChecks } from "../src/application/run-capabilities.js";
import { approveRevision, beginAttempt, digest, readRevision, saveExecution, saveReview, saveRevision, workflowContext } from "../src/application/workflow-store.js";

const discovery = new FileSystemProjectDiscovery();
const profile = async (root: string) => discovery.discover(await discovery.createRef(root));
export const examplePolicy = (): VerificationPolicy => ({
  version: 1,
  rules: [{ id: "order", version: 1, title: "Orders", statement: "Preserve retries", layer: "domain", obligation: "required", conditions: ["Order feature"], exclusions: [], evidence: ["Product agreement"], verification: "behavior-test", examples: [], validation: "proposed", limitations: [] }],
  checks: [{ id: "order-test", script: "test:unit", command: "node --test order.test.cjs", ruleIds: ["order"] }, { id: "boundary", script: "check:boundary", command: "node boundary.cjs", ruleIds: ["order"] }],
  reviews: [{ id: "order-review", ruleIds: ["order"], description: "Review order behavior and tests" }], guards: [], exceptions: [],
});

async function setup() {
  const root = await mkdtemp(join(tmpdir(), "fs-policy-"));
  const scripts = { "test:unit": "node --test order.test.cjs", "check:boundary": "node boundary.cjs" };
  await writeFile(join(root, "package.json"), JSON.stringify({ scripts }));
  await writeFile(join(root, "order.test.cjs"), "require('node:test')('order',()=>require('node:assert/strict').equal(1,1))");
  await writeFile(join(root, "boundary.cjs"), "process.exit(0)");
  const policy = examplePolicy();
  policy.guards = [{ path: "boundary.cjs", hash: digest("process.exit(0)") }];
  const revision = await saveRevision(root, "# Target\nPreserve orders.", null, policy);
  await approveRevision(root, revision.hash!, "User approved orders and checks");
  const execution = { revisionHash: revision.hash!, status: "in-progress" as const, kind: "implement" as const, steps: [{ id: "order", title: "Order", status: "pending" as const, files: ["order.test.cjs"], checkIds: [] as string[], remaining: ["Implement"] }], note: "Order contract" };
  const saved = await saveExecution(root, execution, null);
  return { root, revision, policy, execution, saved, scripts };
}

test("policy binds approval; deleted, changed and protected checks cannot pass CLI", async () => {
  const f = await setup();
  try {
    assert.ok((await profile(f.root)).capabilities.some((item) => item.name === "check:boundary"));
    const passing = await runProjectChecks(await profile(f.root), { required: true });
    assert.ok(passing.results.every((item) => item.status === "passed"));
    await writeFile(join(f.root, "package.json"), JSON.stringify({ scripts: { "test:unit": f.scripts["test:unit"] } }));
    const missing = await runProjectChecks(await profile(f.root), { required: true });
    assert.match(missing.results[0]!.reason!, /Missing or changed/);
    await assert.rejects(promisify(execFile)(process.execPath, [join(process.cwd(), "dist/src/cli.js"), "checks", f.root, "--required"]), (error: unknown) => (error as { code: number }).code === 1);
    await writeFile(join(f.root, "package.json"), JSON.stringify({ scripts: f.scripts }));
    await writeFile(join(f.root, "boundary.cjs"), "// disabled");
    assert.match((await runProjectChecks(await profile(f.root), { required: true })).results[0]!.reason!, /Protected/);
    const raw = JSON.parse(await readFile(join(f.root, ".frontend-system/revision.json"), "utf8"));
    raw.policy.checks.pop();
    await writeFile(join(f.root, ".frontend-system/revision.json"), JSON.stringify(raw));
    assert.equal((await readRevision(f.root)).approved, false);
    await assert.rejects(runProjectChecks(await profile(f.root), { required: true }), /approved/);
  } finally { await rm(f.root, { recursive: true, force: true }); }
});

test("policy completion needs attempts, complete checks and current semantic evidence", async () => {
  const f = await setup();
  try {
    const attempt = await beginAttempt(f.root, "order", f.saved.hash);
    const checks = await runProjectChecks(await profile(f.root), { required: true, attemptId: attempt.id });
    const step = { ...f.execution.steps[0]!, status: "complete" as const, remaining: [], checkIds: [checks.id], attemptId: attempt.id, reviewIds: [] as string[] };
    const done = { ...f.execution, status: "complete" as const, finalCheckId: checks.id, steps: [step] };
    await assert.rejects(saveExecution(f.root, done, f.saved.hash), /semantic/);
    const review = await saveReview(f.root, { stepId: "order", reviewId: "order-review", attemptId: attempt.id, status: "passed", findings: [{ ruleId: "order", files: ["order.test.cjs"], evidence: "Reviewed test assertions and order requirement", conclusion: "Requirement covered" }], remaining: [], resolvedExceptions: [] });
    step.reviewIds = [review.id];
    const saved = await saveExecution(f.root, done, f.saved.hash);
    assert.match(await readFile(join(f.root, ".frontend-system/refactoring.md"), "utf8"), /\[x\] order/);
    await writeFile(join(f.root, "new.js"), "// changed");
    const fresh = await runProjectChecks(await profile(f.root), { required: true, attemptId: attempt.id });
    await assert.rejects(saveExecution(f.root, { ...done, finalCheckId: fresh.id, steps: [{ ...step, checkIds: [fresh.id] }] }, saved.hash), /semantic/);
    assert.equal((await workflowContext(f.root)).needsRevalidation, true);
  } finally { await rm(f.root, { recursive: true, force: true }); }
});

test("attempt budgets survive checkpoints; cycles and unfinished dependencies fail", async () => {
  const f = await setup();
  try {
    for (let number = 1; number <= 3; number++) assert.equal((await beginAttempt(f.root, "order", f.saved.hash)).number, number);
    const resumed = await saveExecution(f.root, { ...f.execution, status: "blocked", note: "Resume after diagnosis" }, f.saved.hash);
    await assert.rejects(beginAttempt(f.root, "order", resumed.hash), /budget exhausted/);
    await assert.rejects(saveExecution(f.root, { ...f.execution, steps: [{ ...f.execution.steps[0]!, id: "renamed" }] }, resumed.hash), /Preserve existing step IDs/);
    await assert.rejects(saveExecution(f.root, { ...f.execution, steps: [{ ...f.execution.steps[0]!, dependsOn: ["order"] }] }, resumed.hash), /Cyclic/);
    await assert.rejects(saveExecution(f.root, { ...f.execution, steps: [{ ...f.execution.steps[0]!, status: "running", dependsOn: ["first"] }, { ...f.execution.steps[0]!, id: "first" }] }, resumed.hash), /Prerequisites/);
    const updated = await saveRevision(f.root, "# Adjusted target", f.revision.hash);
    assert.deepEqual(updated.policy, f.policy);
    assert.equal(updated.approved, false);
    await assert.rejects(beginAttempt(f.root, "order", resumed.hash), /approved/);
  } finally { await rm(f.root, { recursive: true, force: true }); }
});

test("migration exceptions require a resolution step, matching review and final checks", async () => {
  const f = await setup();
  try {
    const policy = { ...f.policy, exceptions: [{ id: "old-order", ruleId: "order", files: ["order.test.cjs"], reason: "Existing behavior", risk: "Duplicate requests", verification: "Order tests", resolveByStep: "order", reconsiderWhen: "Complete order migration" }] };
    const revision = await saveRevision(f.root, "# Migrate the existing violation", f.revision.hash, policy);
    await approveRevision(f.root, revision.hash!, "Approved scoped migration");
    const execution = { ...f.execution, revisionHash: revision.hash! };
    const saved = await saveExecution(f.root, execution, f.saved.hash);
    const attempt = await beginAttempt(f.root, "order", saved.hash);
    const checks = await runProjectChecks(await profile(f.root), { required: true, attemptId: attempt.id });
    const reviewInput = { stepId: "order", reviewId: "order-review", attemptId: attempt.id, status: "passed" as const, findings: [{ ruleId: "order", files: ["order.test.cjs"], evidence: "Checked migration cases", conclusion: "Order behavior preserved" }], remaining: [], resolvedExceptions: [] as string[] };
    const unresolved = await saveReview(f.root, reviewInput);
    const complete = { ...execution, status: "complete" as const, finalCheckId: checks.id, steps: [{ ...execution.steps[0]!, status: "complete" as const, remaining: [], attemptId: attempt.id, checkIds: [checks.id], reviewIds: [unresolved.id] }] };
    await assert.rejects(saveExecution(f.root, complete, saved.hash), /Unresolved migration/);
    const resolved = await saveReview(f.root, { ...reviewInput, resolvedExceptions: ["old-order"] });
    complete.steps[0]!.reviewIds = [resolved.id];
    await saveExecution(f.root, complete, saved.hash);
  } finally { await rm(f.root, { recursive: true, force: true }); }
});

test("policy validates contracts and legacy projects do not acquire enforcement silently", async () => {
  const policy = examplePolicy();
  assert.equal(policySchema.safeParse({ ...policy, checks: [], reviews: [] }).success, false);
  assert.equal(policySchema.safeParse({ ...policy, guards: [{ path: "../escape", hash: "a".repeat(64) }] }).success, false);
  const root = await mkdtemp(join(tmpdir(), "fs-legacy-"));
  try {
    await mkdir(join(root, "src"));
    await writeFile(join(root, "package.json"), "{}");
    const revision = await saveRevision(root, "legacy", null);
    assert.equal(revision.hash, digest("legacy"));
    await approveRevision(root, revision.hash!, "Existing approval");
    assert.equal((await workflowContext(root)).enforcement, "legacy");
    await assert.rejects(runProjectChecks(await profile(root), { required: true }), /policy/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
