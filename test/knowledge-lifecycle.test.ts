import assert from "node:assert/strict";
import {mkdir, mkdtemp, readFile, rm, symlink, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {dirname, join} from "node:path";
import test from "node:test";
import {Client} from "@modelcontextprotocol/sdk/client/index.js";
import {StdioClientTransport} from "@modelcontextprotocol/sdk/client/stdio.js";
import {addKnowledgeNote, catalogKnowledgeDocument, knowledgeStatus, markKnowledgeSynced,
  prepareActiveKnowledge, readKnowledgeDocument, reviewKnowledgeSource, selectMergedKnowledge} from "../src/application/knowledge/catalog.js";
import {sourceSelection} from "../src/application/knowledge/source-state.js";
import {approveFixtureSource} from "./source-review-fixture.js";

test("author selection → prepare → review → merged-only sync, with stale and pending exclusion", async () => {
  const root = await mkdtemp(join(tmpdir(), "fs-lifecycle-"));
  try {
    const added = await addKnowledgeNote(root, {title: "Reference ownership", content: "Preserve caller-owned data unless mutation is agreed."});
    const id = added.document.id;
    assert.deepEqual((await knowledgeStatus(root)).lifecycle.pending, [id]);
    assert.deepEqual(await selectMergedKnowledge(root), []);
    await assert.rejects(approveFixtureSource(root, id), /Pending knowledge/);
    assert.deepEqual((await prepareActiveKnowledge(root)).prepared, []);
    const original = await readFile(join(root, added.document.path), "utf8");
    const selected = original.replace("state: pending", "state: active");
    await writeFile(join(root, added.document.path), selected); // author action
    const moved = await prepareActiveKnowledge(root);
    assert.equal(moved.errors.length, 0);
    assert.equal(moved.prepared[0]?.id, id);
    const path = moved.prepared[0]!.path;
    assert.match(path, /^knowledge\/source\/active\/manual\//);
    assert.equal(await readFile(join(root, path), "utf8"), selected);
    await assert.rejects(readFile(join(root, added.document.path)), /ENOENT/);
    assert.equal((await prepareActiveKnowledge(root)).prepared[0]?.moved, false);
    assert.deepEqual(await selectMergedKnowledge(root), []);
    await assert.rejects(selectMergedKnowledge(root, [id]), /must be merged/);
    await approveFixtureSource(root, id);
    assert.equal((await readKnowledgeDocument(root, id)).state, "merged");
    assert.deepEqual(await selectMergedKnowledge(root), [id]);
    assert.equal((await prepareActiveKnowledge(root)).prepared.length, 0);
    assert.equal((await addKnowledgeNote(root, {title: "Duplicate", content: selected})).duplicateOf, id);
    assert.equal((await readKnowledgeDocument(root, id)).state, "merged", "Add must not demote an existing note");

    const document = (await readKnowledgeDocument(root, id)).document;
    await mkdir(join(root, "references/learned"), {recursive: true});
    await writeFile(join(root, "references/learned/index.json"), JSON.stringify({version: 3, entries: [], outcomes: [
      {sourceId: id, sourceHash: document.contentHash, action: "omitted", reason: "Reviewed personal experience; retained without general advice"},
    ]}));
    await markKnowledgeSynced(root, await selectMergedKnowledge(root), true);
    assert.deepEqual(await selectMergedKnowledge(root), []);
    assert.deepEqual((await knowledgeStatus(root)).lifecycle.merged, [id]);
    await writeFile(join(root, path), `${selected}\nNew unreviewed claim.\n`);
    assert.deepEqual((await knowledgeStatus(root)).lifecycle.active, [id]);
    assert.deepEqual(await selectMergedKnowledge(root), []);
    await assert.rejects(selectMergedKnowledge(root, [id]), /must be merged/);
    await writeFile(join(root, path), original);
    assert.deepEqual((await knowledgeStatus(root)).lifecycle.pending, [id]);
    // A manually written merged label cannot bypass review.
    await writeFile(join(root, path), original.replace("pending", "merged"));
    assert.deepEqual((await knowledgeStatus(root)).lifecycle.invalid, [id]);
    assert.deepEqual(await selectMergedKnowledge(root), []);
  } finally { await rm(root, {recursive: true, force: true}); }
});

test("active collection handles uncataloged notes, conflicts and symlinks without losing originals", async () => {
  const root = await mkdtemp(join(tmpdir(), "fs-active-files-"));
  const outside = await mkdtemp(join(tmpdir(), "fs-active-outside-"));
  try {
    const path = "knowledge/source/manual/topic.md";
    const body = "---\nstate: active\n---\n# Selected note\n\nUnverified idea.";
    await mkdir(join(root, dirname(path)), {recursive: true});
    await writeFile(join(root, path), body);
    const target = "knowledge/source/active/manual/topic.md";
    await mkdir(join(root, dirname(target)), {recursive: true});
    await writeFile(join(root, target), "Do not overwrite me");
    let result = await prepareActiveKnowledge(root);
    assert.equal(result.errors.length, 1);
    assert.equal(await readFile(join(root, path), "utf8"), body);
    assert.equal(await readFile(join(root, target), "utf8"), "Do not overwrite me");
    await rm(join(root, "knowledge/source/active"), {recursive: true});
    await symlink(outside, join(root, "knowledge/source/active"));
    result = await prepareActiveKnowledge(root);
    assert.match(result.errors[0]!.message, /symlinks/);
    assert.equal(await readFile(join(root, path), "utf8"), body);
    await rm(join(root, "knowledge/source/active"));
    result = await prepareActiveKnowledge(root);
    assert.equal(result.errors.length, 0);
    const id = result.prepared[0]!.id;
    const source = await readKnowledgeDocument(root, id);
    assert.equal(source.state, "active");
    // Provenance-only edits invalidate an otherwise approved source.
    await approveFixtureSource(root, id);
    const d = (await readKnowledgeDocument(root, id)).document;
    await catalogKnowledgeDocument(root, {...d, sourceUrl: "https://example.com/corrected"});
    assert.equal((await readKnowledgeDocument(root, id)).state, "active");
    const review = source.document.sourceReview;
    assert.equal(review, undefined);
    const current = await readKnowledgeDocument(root, id);
    await reviewKnowledgeSource(root, id, current.sourceHash, current.metadataHash, current.reviewHash, {
      status: "changes-requested", reviewer: "host", summary: "Evidence missing", scope: "Whole note",
      claims: [], conditions: [], exclusions: [], unresolved: ["Need an applicable example"],
    });
    assert.deepEqual(await selectMergedKnowledge(root), []);
  } finally {
    await rm(root, {recursive: true, force: true});
    await rm(outside, {recursive: true, force: true});
  }
});

test("state parser treats note bodies as data and refuses invalid or duplicate selection", () => {
  assert.equal(sourceSelection('# Note\n```yaml\nstate: active\n```'), undefined);
  assert.equal(sourceSelection('---\r\nstate: "active" # author selected\r\n---\r\nText'), "active");
  assert.throws(() => sourceSelection('---\nstate: active\nstate: pending\n---\n'), /Duplicate/);
  assert.throws(() => sourceSelection('---\nstate: merged\n---\n'), /derived/);
  assert.throws(() => sourceSelection('---\nstate: active\n'), /Unclosed/);
});

test("MCP sync without IDs publishes only merged sources and rejects explicit pending selection", async () => {
  const root = await mkdtemp(join(tmpdir(), "fs-lifecycle-mcp-"));
  const client = new Client({name: "lifecycle-test", version: "1"});
  try {
    await client.connect(new StdioClientTransport({command: process.execPath, args: [join(process.cwd(), "bundle/mcp.js")]}));
    const pending = await addKnowledgeNote(root, {title: "Personal note", content: "Unreviewed memory."});
    const selected = await addKnowledgeNote(root, {title: "Scoped note", content: "Keep uncertainty explicit."});
    const path = join(root, selected.document.path);
    await writeFile(path, (await readFile(path, "utf8")).replace("state: pending", "state: active"));
    const prepared = await client.callTool({name: "prepare_active_knowledge", arguments: {repositoryRoot: root}});
    assert.ok(!prepared.isError);
    const source = await readKnowledgeDocument(root, selected.document.id);
    const approved = await client.callTool({name: "save_source_review", arguments: {
      repositoryRoot: root, id: source.document.id, expectedSourceHash: source.sourceHash,
      expectedMetadataHash: source.metadataHash, expectedReviewHash: source.reviewHash,
      review: {status: "approved", reviewer: "host", summary: "Scoped fixture", scope: "Fixture only",
        claims: [{quote: "Keep uncertainty explicit.", verdict: "qualified", assessment: "Scoped preference", evidence: "Authored test case"}],
        conditions: ["Test scope"], exclusions: ["Unrelated claims"], unresolved: []},
    }});
    assert.ok(!approved.isError);
    await mkdir(join(root, "references/learned"), {recursive: true});
    await writeFile(join(root, "references/learned/index.json"), JSON.stringify({version: 3, entries: [], outcomes: [
      {sourceId: source.document.id, sourceHash: source.sourceHash, action: "omitted", reason: "Personal preference, no general advice"},
    ]}));
    assert.equal((await client.callTool({name: "mark_knowledge_synced", arguments: {repositoryRoot: root, ids: [pending.document.id]}})).isError, true);
    const sync = await client.callTool({name: "mark_knowledge_synced", arguments: {repositoryRoot: root}});
    assert.ok(!sync.isError);
    assert.equal((await readKnowledgeDocument(root, source.document.id)).document.publishedHash, source.sourceHash);
    assert.equal((await readKnowledgeDocument(root, pending.document.id)).document.publishedHash, undefined);
    assert.deepEqual(await selectMergedKnowledge(root), []);
    assert.ok(!(await client.callTool({name: "mark_knowledge_synced", arguments: {repositoryRoot: root}})).isError, "Repeated empty sync is harmless");
  } finally {
    await client.close();
    await rm(root, {recursive: true, force: true});
  }
});
