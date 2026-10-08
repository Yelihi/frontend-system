import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { catalogKnowledgeDocument, knowledgeStatus, markKnowledgeSynced, readKnowledgeDocument, reviewKnowledgeSource } from "../src/application/knowledge/catalog.js";
import { approveFixtureSource, addActiveFixtureNote as addKnowledgeNote } from "./source-review-fixture.js";

test("source approval gates sync, binds evidence and invalidates on source/provenance/review changes", async () => {
  const root = await mkdtemp(join(tmpdir(), "fs-source-review-"));
  try {
    const { document } = await addKnowledgeNote(root, { title: "Scoped experience", content: "Separate policy from transport when multiple entry points share it." });
    const id = document.id;
    await mkdir(join(root, "references/learned"), { recursive: true });
    const index = { version: 3, entries: [], outcomes: [{ sourceId: id, sourceHash: document.contentHash, action: "omitted", reason: "Personal note retained; no general rule" }] };
    await writeFile(join(root, "references/learned/index.json"), JSON.stringify(index));
    assert.deepEqual((await knowledgeStatus(root)).sourceReviews["on-review"], [id]);
    await assert.rejects(markKnowledgeSynced(root, [id]), /Source review required/);
    const page = await readKnowledgeDocument(root, id, 0, 10);
    assert.equal(page.nextOffset, 10);
    await assert.rejects(readKnowledgeDocument(root, id, 10, 10), /hash missing/);
    assert.equal((await readKnowledgeDocument(root, id, 10, 10, page.sourceHash)).content.length, 10);
    const review = { status: "approved" as const, reviewer: "host" as const, summary: "Scoped observation", scope: "Multiple entry points",
      claims: [{ quote: "Separate policy", assessment: "Design preference with a condition", evidence: "User experience, not a universal correctness claim", verdict: "qualified" as const }],
      conditions: ["Shared policy"], exclusions: ["Single trivial caller"], unresolved: [] as string[] };
    const save = (input = review) => reviewKnowledgeSource(root, id, page.sourceHash, page.metadataHash, page.reviewHash, input);
    const before = await readFile(join(root, "knowledge/catalog.json"), "utf8");
    await assert.rejects(save({ ...review, unresolved: ["Which entry points?"] }), /Approval needs/);
    await assert.rejects(save({ ...review, claims: [{ ...review.claims[0]!, quote: "Invented source claim" }] }), /quotes must exist/);
    assert.equal(await readFile(join(root, "knowledge/catalog.json"), "utf8"), before);
    await save();
    await assert.rejects(save(), /review changed/);
    await markKnowledgeSynced(root, [id]);
    assert.deepEqual((await knowledgeStatus(root)).unpublished, []);
    const approved = await readKnowledgeDocument(root, id);
    await reviewKnowledgeSource(root, id, approved.sourceHash, approved.metadataHash, approved.reviewHash, { ...review, summary: "Revised reasoning" });
    assert.deepEqual((await knowledgeStatus(root)).unpublished, [id], "Changed review needs publication even with identical source text");
    await markKnowledgeSynced(root, [id]);
    const revised = await readKnowledgeDocument(root, id);
    await reviewKnowledgeSource(root, id, revised.sourceHash, revised.metadataHash, revised.reviewHash, { ...review, status: "changes-requested", unresolved: ["Need stronger evidence"] });
    await assert.rejects(markKnowledgeSynced(root, [id]), /Source review required/);
    await approveFixtureSource(root, id);
    await catalogKnowledgeDocument(root, { id, path: document.path, title: document.title, summary: document.summary, sourceType: "manual", facets: {}, sourceUrl: "https://example.org/new-source" });
    assert.deepEqual((await knowledgeStatus(root)).sourceReviews.stale, [id]);
    await assert.rejects(reviewKnowledgeSource(root, id, revised.sourceHash, revised.metadataHash, revised.reviewHash, review), /metadata changed/);
    await assert.rejects(markKnowledgeSynced(root, [id]), /Source review required/);
    await approveFixtureSource(root, id);
    await writeFile(join(root, document.path), "A corrected source");
    assert.equal((await readKnowledgeDocument(root, id)).reviewStatus, "stale");
    await assert.rejects(readKnowledgeDocument(root, id, 10, 10, page.sourceHash), /Source changed/);
    await assert.rejects(approveFixtureSource(root, id), /Source changed/);
    await catalogKnowledgeDocument(root, { id, path: document.path, title: document.title, summary: document.summary, sourceType: "manual", facets: {} });
    assert.equal((await readKnowledgeDocument(root, id)).reviewStatus, "stale");
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("legacy published sources remain explicitly unreviewed and need review on the next sync", async () => {
  const root = await mkdtemp(join(tmpdir(), "fs-legacy-review-"));
  try {
    const { document } = await addKnowledgeNote(root, { title: "Old source", content: "Historical note" });
    const path = join(root, "knowledge/catalog.json");
    const catalog = JSON.parse(await readFile(path, "utf8"));
    catalog.documents[document.id].publishedHash = document.contentHash;
    await writeFile(path, JSON.stringify(catalog));
    assert.equal((await readKnowledgeDocument(root, document.id)).reviewStatus, "legacy-unreviewed");
    await mkdir(join(root, "references/learned"), { recursive: true });
    await writeFile(join(root, "references/learned/index.json"), JSON.stringify({ version: 3, entries: [], outcomes: [{ sourceId: document.id, sourceHash: document.contentHash, action: "omitted", reason: "Historical source" }] }));
    await assert.rejects(markKnowledgeSynced(root, [document.id]), /Source review required/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
