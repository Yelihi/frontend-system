import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rename, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

import { FileSystemProjectDiscovery } from "../src/adapters/filesystem/project-discovery.js";
import { readProjectDocument, writeProjectArtifacts } from "../src/application/project-store.js";
import { RuleResolver } from "../src/application/rules/rule-resolver.js";
import { runCapabilities, runProjectChecks } from "../src/application/run-capabilities.js";
import { taskContext } from "../src/application/task-context.js";
import { approveRevision, digest, readProjectRecord, readRevision, saveExecution, saveProjectRecord, saveRevision, workflowContext } from "../src/application/workflow-store.js";

async function fixture(files: Record<string, string>) {
  const root = await mkdtemp(join(tmpdir(), "fs-workflow-"));
  for (const [path, content] of Object.entries(files)) {
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), content);
  }
  return root;
}
const discovery = new FileSystemProjectDiscovery();
const profile = async (root: string) => discovery.discover(await discovery.createRef(root));

test("whole inventory includes deep and large areas and reports exclusions", async () => {
  const deep = "apps/web/src/features/board/columns/cards/editor/internal/Card.vue";
  const root = await fixture({
    "package.json": "{}", [deep]: "<template><button>Move</button></template>",
    "apps/web/.storybook/main.ts": "export default {}", "node_modules/generated/index.js": "", "bulk/.keep": "",
  });
  try {
    for (let offset = 0; offset < 20100; offset += 100) {
      await Promise.all(Array.from({ length: 100 }, (_, index) => writeFile(join(root, `bulk/${offset + index}.txt`), "")));
    }
    await symlink(join(root, "apps"), join(root, "linked-apps"));
    const inventory = await discovery.inventory(root);
    assert.ok(inventory.files.length > 20000);
    assert.ok(inventory.files.includes(join(root, deep)));
    assert.ok(inventory.excluded.includes("node_modules"));
    assert.match(inventory.warnings.join("\n"), /linked-apps/);
    assert.ok((await profile(root)).design.systems.includes("Storybook"));
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("legacy facts migrate without losing decisions or changing the target", async () => {
  const root = await fixture({
    "package.json": "{}", "src/a.ts": "export const a = 1;",
    ".frontend-system/project.md": "# Legacy\nKeep server contracts stable.",
    ".frontend-system/.gitignore": "custom-cache/\n",
  });
  try {
    assert.match(await readProjectDocument(root), /Keep server/);
    const revision = await saveRevision(root, "# Target\nExplicit state ownership.", null);
    await approveRevision(root, revision.hash!, "User approved this design");
    await writeProjectArtifacts(await profile(root), {
      summary: "Observed app", observed: ["See evidence/architecture.md"], architecture: [], conventions: [],
      decisions: ["Keep server contracts stable."], qualityGates: [], assumptions: [], questions: [],
    });
    assert.match(await readProjectDocument(root), /Observed app/);
    assert.equal(await readFile(join(root, ".frontend-system/project.md"), "utf8"), "# Legacy\nKeep server contracts stable.");
    assert.match(await readFile(join(root, ".frontend-system/.gitignore"), "utf8"), /custom-cache/);
    assert.equal((await readRevision(root)).approved, true);
    await writeFile(join(root, "src/a.ts"), "export const a = 2;");
    const context = await taskContext(discovery, process.cwd(), root, { raw: "Review a", mode: "review", constraints: [] });
    assert.deepEqual(context.inspection.changedFiles, ["src/a.ts"]);
    assert.equal(context.workflow.revision.hash, revision.hash);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("revision approvals bind exact content and scoped records reject lost updates", async () => {
  const root = await fixture({ "package.json": "{}" });
  try {
    const initial = await saveRevision(root, "# Target A", null);
    await assert.rejects(approveRevision(root, "stale", "Approved"));
    await approveRevision(root, initial.hash!, "Approved A");
    await writeFile(join(root, ".frontend-system/revision.md"), "# Manual changes");
    assert.equal((await readRevision(root)).approved, false);
    assert.equal((await readRevision(root)).drifted, true);
    await assert.rejects(saveRevision(root, "# Overwrite", initial.hash));
    const next = await saveRevision(root, "# Target B", (await readRevision(root)).hash);
    assert.equal(next.version, 2);
    assert.equal(next.approved, false);
    assert.equal(await readFile(join(root, `.frontend-system/revisions/${digest("# Target A")}.md`), "utf8"), "# Target A");
    const record = await saveProjectRecord(root, "decisions", "state-owner", "# Scope\nKeep store for this release.\nOutcome unmeasured.", null);
    await assert.rejects(saveProjectRecord(root, "decisions", "state-owner", "overwrite", null));
    assert.equal((await readProjectRecord(root, "decisions", "state-owner", 0, 1)).nextOffset, 1);
    await saveProjectRecord(root, "decisions", "state-owner", "# Scope\nSuperseded with evidence", record.hash);
    await assert.rejects(saveProjectRecord(root, "evidence", "../escape", "bad", null));
    const context = await workflowContext(root);
    assert.equal(context.records.length, 1);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("workflow writes reject symbolic-link escapes before creating children", async () => {
  const root = await fixture({ "package.json": "{}" });
  const outside = await fixture({});
  try {
    await symlink(outside, join(root, ".frontend-system"));
    await assert.rejects(saveProjectRecord(root, "evidence", "scope", "bad", null), /symbolic links/);
    await assert.rejects(readFile(join(outside, "evidence/scope.md")));
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  }
});

test("test relocation and contract rewriting preserve guarantees; resume rejects stale proof", async () => {
  const originalTest = "const assert = require('node:assert/strict'); const test = require('node:test'); const move = require('../src/card.cjs'); test('denied move leaves card unchanged', () => assert.equal(move(false), 'unchanged'));";
  const root = await fixture({
    "package.json": JSON.stringify({ scripts: { test: "node --test tests/card.test.cjs" } }),
    "src/card.cjs": "module.exports = allowed => allowed ? 'moved' : 'unchanged';",
    "tests/card.test.cjs": originalTest,
  });
  try {
    const revision = await saveRevision(root, "# Target\nPreserve denied moves; migrate to move({allowed}).", null);
    const baseExecution = {
      revisionHash: revision.hash!, status: "in-progress" as const,
      steps: [{ id: "card", title: "Migrate card API", status: "pending" as const, files: ["src/card.cjs"], checkIds: [] as string[], remaining: ["API and test migration"] }], note: "Preserve permission behavior",
    };
    await assert.rejects(saveExecution(root, baseExecution, null), /approved/);
    await approveRevision(root, revision.hash!, "Approved target and migration");
    const baseline = await runProjectChecks(await profile(root), { purpose: "baseline" });
    assert.ok(baseline.results.every((result) => result.status === "passed"));
    const initial = await saveExecution(root, { ...baseExecution, baselineCheckId: baseline.id }, null);
    await mkdir(join(root, "__test__"));
    await rename(join(root, "tests/card.test.cjs"), join(root, "__test__/card.test.cjs"));
    await writeFile(join(root, "package.json"), JSON.stringify({ scripts: { test: "node --test __test__/card.test.cjs" } }));
    const moved = await runProjectChecks(await profile(root), { baselineCheckId: baseline.id });
    assert.ok(moved.results.every((result) => result.status === "passed"));
    // The old API-specific test fails during transition, but its guarantee remains recorded.
    await writeFile(join(root, "src/card.cjs"), "module.exports = ({allowed}) => { if (allowed === undefined) throw new Error('Use explicit permission'); return allowed ? 'moved' : 'unchanged'; };");
    const transition = await runProjectChecks(await profile(root), { baselineCheckId: baseline.id });
    assert.equal(transition.results[0]?.status, "failed", transition.results[0]?.output);
    await writeFile(join(root, "__test__/card.test.cjs"), originalTest.replace("move(false)", "move({allowed: false})"));
    const current = await runProjectChecks(await profile(root), { baselineCheckId: baseline.id });
    assert.equal(current.results[0]?.status, "passed");
    assert.equal(current.stable, true);
    const complete = {
      ...baseExecution, status: "complete" as const, baselineCheckId: baseline.id, finalCheckId: current.id,
      steps: [{ ...baseExecution.steps[0]!, status: "complete" as const, checkIds: [current.id], remaining: [] }],
    };
    await assert.rejects(saveExecution(root, { ...complete, finalCheckId: baseline.id }, initial.hash), /current source/);
    const saved = await saveExecution(root, complete, initial.hash);
    await assert.rejects(saveExecution(root, complete, initial.hash), /changed/);
    assert.equal((await workflowContext(root)).needsRevalidation, false);
    await writeFile(join(root, "src/user-edit.ts"), "export const userEdit = true;");
    const changed = await workflowContext(root);
    assert.deepEqual(changed.changedSinceCheckpoint, ["src/user-edit.ts"]);
    assert.equal(changed.needsRevalidation, true);
    await assert.rejects(saveExecution(root, complete, saved.hash), /current source/);
    assert.equal(await readFile(join(root, "src/user-edit.ts"), "utf8"), "export const userEdit = true;");
    const newRevision = await saveRevision(root, "# New target", revision.hash);
    await assert.rejects(saveExecution(root, { ...baseExecution, revisionHash: newRevision.hash! }, saved.hash), /approved/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("empty and selected checks distinguish missing verification and new failures", async () => {
  const root = await fixture({ "package.json": "{}" });
  try {
    const empty = await runProjectChecks(await profile(root));
    assert.equal(empty.results[0]?.status, "not-run");
    await writeFile(join(root, "package.json"), JSON.stringify({ scripts: {
      "test:unit": "node -e \"process.exit(0)\"", lint: "node -e \"process.exit(1)\"",
      "test:contracts": "node -e \"process.exit(0)\"", "test:watch": "node --watch app.js",
    } }));
    const baseline = await runProjectChecks(await profile(root), { purpose: "baseline" });
    assert.ok(baseline.results.some((entry) => entry.capability === "test:contracts"));
    assert.ok(!baseline.results.some((entry) => entry.capability === "test:watch"));
    const selected = await runProjectChecks(await profile(root), { capabilities: ["test:unit"], baselineCheckId: baseline.id });
    assert.equal(selected.full, false);
    assert.equal(selected.results.length, 1);
    const full = await runProjectChecks(await profile(root), { baselineCheckId: baseline.id });
    assert.equal(full.comparison.find((entry) => entry.capability === "lint")?.previouslyFailing, true);
    assert.equal(full.comparison.find((entry) => entry.capability === "lint")?.needsFailureReview, true);
    await assert.rejects(runCapabilities(await profile(root), ["missing"]));
    await writeFile(join(root, "package.json"), JSON.stringify({ scripts: { test: "node --watch src/a.js" } }));
    assert.equal((await runCapabilities(await profile(root)))[0]?.status, "not-run");
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("project constraints and conflicting knowledge remain distinct evidence", async () => {
  const root = await fixture({ "package.json": "{}" });
  try {
    const facts = await profile(root);
    facts.constraints = [{ id: "release", description: "Keep store this release", evidence: ["team.md"] }];
    facts.conventions = [{ id: "store", description: "Keep store this release", evidence: ["src/store.ts"] }];
    const rules = await new RuleResolver(join(process.cwd(), "mandatory-rules")).resolve(facts,
      { raw: "Review store", mode: "review", constraints: [] },
      [{ id: "experience", title: "Keep store this release", summary: "A conditional experience, not a rule", path: "notes.md", domains: ["state"] }], []);
    assert.equal(rules.filter((rule) => rule.title === "Keep store this release").length, 3);
    assert.equal(rules.find((rule) => rule.id === "experience")?.mandatory, false);
    assert.ok(rules.findIndex((rule) => rule.id === "project-rule:release") < rules.findIndex((rule) => rule.id === "experience"));
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("MCP exposes inventory, approval, bounded records and both new context modes", async () => {
  const root = await fixture({ "package.json": "{}", "src/a.ts": "export {};" });
  const client = new Client({ name: "workflow-test", version: "1" });
  try {
    await client.connect(new StdioClientTransport({ command: process.execPath, args: [join(process.cwd(), "bundle/mcp.js")] }));
    const call = async (name: string, args: Record<string, unknown> = {}) => {
      const response = await client.callTool({ name, arguments: { projectPath: root, ...args } });
      assert.ok(!response.isError, JSON.stringify(response));
      return JSON.parse((response.content as Array<{ text: string }>)[0]!.text) as Record<string, unknown>;
    };
    const page = await call("list_project_files", { limit: 1 });
    assert.equal(page.nextOffset, 1);
    const next = await call("list_project_files", { limit: 1, offset: page.nextOffset, expectedHash: page.hash });
    assert.equal(next.nextOffset, null);
    const revision = await call("save_revision", { content: "# Target", expectedHash: null });
    await call("approve_revision", { expectedHash: revision.hash, approval: "User approved target" });
    const record = await call("save_project_record", { kind: "evidence", id: "architecture", content: "# Architecture\nNo unresolved static edges", expectedHash: null });
    assert.equal(relative(root, record.path as string), ".frontend-system/evidence/architecture.md");
    assert.equal((await call("get_project_record", { kind: "evidence", id: "architecture", limit: 1 })).nextOffset, 1);
    for (const mode of ["review", "refactor"]) {
      const context = await call("get_work_context", { mode, request: "Review source" });
      assert.ok(context.workflow);
      const rules = (context.context as { applicableRules: Array<{ id: string }> }).applicableRules;
      assert.ok(rules.some((rule) => rule.id.startsWith("mandatory:common:")), "Bundled MCP must resolve its own references");
      const cli = await promisify(execFile)(process.execPath, [join(process.cwd(), "dist/src/cli.js"), "work-context", root, "Review source", "--mode", mode]);
      assert.equal(JSON.parse(cli.stdout).workflow.revision.approved, true);
    }
    const check = await call("run_project_checks", { purpose: "baseline" });
    assert.equal((await call("get_check_record", { id: check.id })).purpose, "baseline");
  } finally {
    await client.close();
    await rm(root, { recursive: true, force: true });
  }
});
