import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { FileSystemProjectDiscovery } from "../src/adapters/filesystem/project-discovery.js";
import { type VerificationPolicy } from "../src/application/policy.js";
import { runProjectChecks } from "../src/application/run-capabilities.js";
import { approveRevision, beginAttempt, digest, readRevision, saveExecution, saveRevision, workflowContext } from "../src/application/workflow-store.js";

const contracts = [
  { id: "pending", statement: "Reject duplicate submissions while pending", before: "if (pending) return false;", after: "if (pending) return true;" },
  { id: "quantity", statement: "Reject nonpositive or fractional quantities before sending", before: "throw new Error('Quantity must be a positive integer');", after: "return false;" },
  { id: "retry", statement: "Release pending state after failure so a retry can succeed", before: "finally {\n      pending = false;", after: "finally {\n      pending = true;" },
];
const discovery = new FileSystemProjectDiscovery();
const profile = async (root: string) => discovery.discover(await discovery.createRef(root));

// Three fresh runs of each failure condition. Repetition checks workflow repeatability,
// not model independence or a statistical probability of defect-free production code.
for (let round = 1; round <= 3; round++) {
  for (const contract of contracts) {
    test(`reliability eval ${round}/3: ${contract.id}, stale progress, weakened oracle, repair`, async (t) => {
      const root = await mkdtemp(join(tmpdir(), "fs-reliability-"));
      try {
        const fixture = join(process.cwd(), "test/fixtures/frontend");
        const source = await readFile(join(fixture, "src/domain/orders.js"), "utf8");
        const oracle = await readFile(join(fixture, "tests/order.test.mjs"), "utf8");
        for (const folder of ["src/domain", "tests"]) await mkdir(join(root, folder), { recursive: true });
        const sourcePath = join(root, "src/domain/orders.js");
        const testPath = join(root, "tests/order.test.mjs");
        const command = "node --test --test-timeout=10000 tests/order.test.mjs";
        await writeFile(join(root, "package.json"), JSON.stringify({ type: "module", scripts: { "test:unit": command } }));
        await writeFile(sourcePath, source);
        await writeFile(testPath, oracle);
        const policy: VerificationPolicy = {
          version: 1,
          rules: contracts.map(({ id, statement }) => ({ id, version: 1, title: id, statement, layer: "domain", obligation: "required",
            conditions: ["Local order submitter"], exclusions: ["Server persistence and idempotency"], evidence: ["test/fixtures/frontend/tests/order.test.mjs"],
            verification: "behavior-test", examples: [], validation: "proposed", limitations: ["Synthetic lifecycle using the Next.js fixture's domain code"] })),
          checks: [{ id: "orders", script: "test:unit", command, ruleIds: contracts.map(({ id }) => id), guardPaths: ["tests/order.test.mjs"] }],
          guards: [{ path: "tests/order.test.mjs", hash: digest(oracle) }], reviews: [], exceptions: [],
        };
        const revision = await saveRevision(root, "# Local order guarantees", null, policy);
        await approveRevision(root, revision.hash!, "Synthetic fixture approval of these exact three guarantees");
        const execution = { revisionHash: revision.hash!, status: "in-progress" as const,
          steps: [{ id: "orders", title: "Verify order guarantees", status: "pending" as const, files: ["src/domain/orders.js"], checkIds: [] as string[], remaining: ["Verify"] }], note: "Synthetic eval" };
        const initial = await saveExecution(root, execution, null);
        assert.equal((await workflowContext(root)).verification.status, "unverified");
        const attempt = await beginAttempt(root, "orders", initial.hash);
        const baseline = await runProjectChecks(await profile(root), { required: true, attemptId: attempt.id });
        assert.equal(baseline.results[0]!.status, "passed", baseline.results[0]!.output);
        const completedStep = { ...execution.steps[0]!, status: "complete" as const, checkIds: [baseline.id], remaining: [], attemptId: attempt.id };
        const checkpoint = { ...execution, steps: [completedStep] };
        let saved = await saveExecution(root, checkpoint, initial.hash);
        const invalid = source.replace(contract.before, contract.after);
        assert.notEqual(invalid, source, "Mutation must alter product behavior");
        await writeFile(sourcePath, invalid);
        assert.equal((await workflowContext(root)).needsRevalidation, true);
        // Repeated saves used to launder stale evidence by updating only fileHashes.
        for (const status of ["blocked", "in-progress"] as const) {
          saved = await saveExecution(root, { ...checkpoint, status }, saved.hash);
          const context = await workflowContext(root);
          assert.deepEqual(context.changedSinceCheckpoint, []);
          assert.equal(context.needsRevalidation, true);
          assert.equal(context.verification.status, "stale");
        }
        const failed = await runProjectChecks(await profile(root), { required: true, attemptId: attempt.id });
        assert.equal(failed.results[0]!.status, "failed");
        assert.match(failed.results[0]!.output, /ERR_ASSERTION/, "Infrastructure errors are not mutation detection");
        await assert.rejects(saveExecution(root, { ...checkpoint, status: "complete", finalCheckId: failed.id }, saved.hash), /does not verify/);
        await assert.rejects(saveExecution(root, { ...checkpoint, status: "complete", finalCheckId: baseline.id }, saved.hash), /does not verify/);
        // Same command, but assertions replaced with a vacuous green test.
        await writeFile(testPath, "import test from 'node:test'; test('order', () => {});\n");
        const weakened = await runProjectChecks(await profile(root), { required: true, attemptId: attempt.id });
        assert.equal(weakened.results[0]!.status, "not-run");
        assert.match(weakened.results[0]!.reason!, /Protected verification asset changed/);
        await assert.rejects(saveExecution(root, { ...checkpoint, status: "complete", finalCheckId: weakened.id }, saved.hash), /does not verify/);
        await writeFile(testPath, oracle);
        await writeFile(sourcePath, source);
        saved = await saveExecution(root, execution, saved.hash);
        const repair = await beginAttempt(root, "orders", saved.hash);
        assert.equal(repair.number, 2);
        const passed = await runProjectChecks(await profile(root), { required: true, attemptId: repair.id });
        assert.equal(passed.results[0]!.status, "passed", passed.results[0]!.output);
        await saveExecution(root, { ...checkpoint, status: "complete", finalCheckId: passed.id,
          steps: [{ ...completedStep, checkIds: [passed.id], attemptId: repair.id }] }, saved.hash);
        const final = await workflowContext(root);
        assert.equal(final.needsRevalidation, false);
        assert.equal(final.verification.status, "verified");
        assert.equal(final.verification.sourceHash, passed.sourceHash);
        assert.equal(final.verification.finalCheckId, passed.id);
        assert.deepEqual(final.verification.requiredRuleIds, contracts.map(({ id }) => id));
        t.diagnostic(JSON.stringify({ round, contract: contract.id, revisionHash: revision.hash, sourceHash: passed.sourceHash,
          rejected: ["invalid product", "stale check", "weakened oracle"], repaired: true }));
      } finally { await rm(root, { recursive: true, force: true }); }
    });
  }
}

test("unguarded policies remain repairable but cannot be approved or reported as verified", async () => {
  const root = await mkdtemp(join(tmpdir(), "fs-policy-migration-"));
  try {
    const command = "node --test contract.cjs";
    await writeFile(join(root, "package.json"), JSON.stringify({ scripts: { test: command } }));
    await writeFile(join(root, "contract.cjs"), "require('node:test')('contract',()=>{})");
    const policy: VerificationPolicy = { version: 1,
      rules: [{ id: "contract", version: 1, title: "Contract", statement: "Preserve behavior", layer: "domain", obligation: "required", conditions: [], exclusions: [], evidence: ["Synthetic"], verification: "behavior-test", examples: [], validation: "proposed", limitations: [] }],
      checks: [{ id: "contract", script: "test", command, ruleIds: ["contract"] }], reviews: [], guards: [], exceptions: [] };
    // An unrelated guard cannot stand in for an explicit check-to-asset mapping.
    policy.guards = [{ path: "contract.cjs", hash: digest(await readFile(join(root, "contract.cjs"), "utf8")) }];
    const revision = await saveRevision(root, "# Historical policy", null, policy);
    await assert.rejects(approveRevision(root, revision.hash!, "Cannot approve an unprotected oracle"), /guardPaths or semantic review/);
    // Historical records produced before protection enforcement must stay readable.
    const metadata = join(root, ".frontend-system/revision.json");
    const historical = JSON.parse(await readFile(metadata, "utf8"));
    await writeFile(metadata, JSON.stringify({ ...historical, approved: true }));
    assert.equal((await readRevision(root)).approved, true);
    assert.equal((await workflowContext(root)).verification.status, "blocked");
    const checks = await runProjectChecks(await profile(root), { required: true });
    assert.equal(checks.results[0]!.status, "not-run");
    assert.match(checks.results[0]!.reason!, /guardPaths or semantic review/);
    const repaired = await saveRevision(root, "# Reviewed contract", revision.hash,
      { ...policy, reviews: [{ id: "contract-review", ruleIds: ["contract"], description: "Review contract and assertions" }] });
    await approveRevision(root, repaired.hash!, "Synthetic explicit review requirement");
    assert.equal((await workflowContext(root)).verification.status, "unverified");
    const duplicate = await saveRevision(root, "# Historical duplicate guards", repaired.hash,
      { ...policy, guards: [policy.guards[0]!, policy.guards[0]!], reviews: [{ id: "contract-review", ruleIds: ["contract"], description: "Review assertions" }] });
    assert.equal((await readRevision(root)).hash, duplicate.hash);
    await assert.rejects(approveRevision(root, duplicate.hash!, "Duplicate guards need repair"), /Duplicate guard/);
    const deduplicated = await saveRevision(root, "# Explicitly pinned oracle", duplicate.hash,
      { ...policy, checks: [{ ...policy.checks[0]!, guardPaths: ["contract.cjs"] }] });
    await approveRevision(root, deduplicated.hash!, "Synthetic deduplicated guard approval");
  } finally { await rm(root, { recursive: true, force: true }); }
});
