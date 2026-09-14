import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { catalogKnowledgeDocument, knowledgeStatus, markKnowledgeSynced } from "../src/application/knowledge/catalog.js";
import { contentHash, readIndexedReference, readReferenceIndex, searchReferenceIndex, type ReferenceEntry, type ReferenceIndex } from "../src/application/knowledge/reference-index.js";
import { KnowledgeResolver } from "../src/application/knowledge/knowledge-resolver.js";
import { RuleResolver } from "../src/application/rules/rule-resolver.js";
import type { ProjectProfile, WorkRequest } from "../src/domain/types.js";

function entry(id: string, keywords: string[], technologies: string[] = []): ReferenceEntry {
  return { id, kind: "concept", title: id, summary: "근거와 적용 조건을 본문에서 확인", path: `${id}.md`, contentHash: contentHash("body"), keywords, domains: ["state"], technologies, excludedTechnologies: [], conditions: ["Check version and domain"], exclusions: [], evidenceKind: "public-contract", review: "reviewed", sources: { source: contentHash("source") }, related: [] };
}

test("knowledge retrieval evaluation: paraphrases, irrelevant technologies, CS and abstention", (t) => {
  const index: ReferenceIndex = { version: 1, entries: [
    entry("snapshot", ["이전 값", "상태", "snapshot", "state"], ["react"]),
    { ...entry("subscription", ["관계없는 변경", "구독", "subscription", "rerender"], ["react"]), kind: "decision", related: ["snapshot"] },
    entry("vue-derived", ["파생", "computed", "상태"], ["vue"]),
    entry("retry", ["재시도", "중복 요청", "retry", "idempotency"]),
    { ...entry("hypothesis", ["실험적 최적화"]), review: "uncertain" },
  ], outcomes: [] };
  const cases = [
    { query: "클릭 후 이전 값", tech: ["React"], expected: ["snapshot"], forbidden: ["vue-derived"] },
    { query: "관계없는 변경 구독", tech: ["react"], expected: ["subscription"], forbidden: ["vue-derived"] },
    { query: "subscription rerender", tech: ["React"], expected: ["subscription"], forbidden: ["vue-derived"] },
    { query: "파생 상태", tech: ["Vue"], expected: ["vue-derived"], forbidden: ["snapshot", "subscription"] },
    { query: "중복 요청 재시도", tech: ["Vue"], expected: ["retry"], forbidden: ["subscription"] },
    { query: "폰트 설치", tech: [], expected: [], forbidden: index.entries.map((item) => item.id) },
  ];
  let relevant = 0, returned = 0, expected = 0, characters = 0;
  for (const scenario of cases) {
    const results = searchReferenceIndex(index, scenario.query, scenario.tech, 5);
    const ids = results.map((item) => item.id);
    assert.deepEqual(ids, scenario.expected);
    assert.ok(!ids.some((id) => scenario.forbidden.includes(id)));
    relevant += ids.filter((id) => scenario.expected.includes(id)).length;
    returned += ids.length; expected += scenario.expected.length;
    characters += JSON.stringify(results).length;
    assert.ok(JSON.stringify(results).length < 5000);
  }
  t.diagnostic(JSON.stringify({ cases: cases.length, retrievedPrecisionAt5: relevant / returned, recallAt5: relevant / expected, forbiddenResults: 0, returnedCharacters: characters, synthetic: true }));
  assert.equal(searchReferenceIndex(index, "실험적 최적화")[0]?.review, "uncertain");
  assert.equal(searchReferenceIndex(index, "이전 값", ["vue"]).length, 0);
  const excluded = { ...index, entries: [{ ...entry("restricted", ["재시도"]), excludedTechnologies: ["vue"] }] };
  assert.equal(searchReferenceIndex(excluded, "재시도", ["Vue"]).length, 0);
});

test("sync validates source evidence, records deferrals, tracks corrections/deletion and bounds reads", async () => {
  const root = await mkdtemp(join(tmpdir(), "fs-knowledge-"));
  const learned = join(root, "references/learned");
  try {
    await mkdir(join(root, "knowledge/source/manual"), { recursive: true });
    await mkdir(learned, { recursive: true });
    await writeFile(join(root, "knowledge/source/manual/source.md"), "source");
    await catalogKnowledgeDocument(root, { id: "source", path: "knowledge/source/manual/source.md", title: "Source", summary: "Concept", sourceType: "manual", facets: {} });
    const index: ReferenceIndex = { version: 1, entries: [entry("snapshot", ["상태"], ["react"])], outcomes: [{ sourceId: "source", sourceHash: contentHash("source"), action: "represented", reason: "Concept retained without a prescription" }] };
    const save = () => writeFile(join(learned, "index.json"), JSON.stringify(index));
    await save();
    const context = await new KnowledgeResolver(learned).resolve({ technologies: [{ name: "React", category: "framework" }] } as ProjectProfile, { raw: "상태" } as WorkRequest);
    assert.equal(context.applicable[0]?.kind, "concept");
    assert.deepEqual(context.applicable[0]?.conditions, ["Check version and domain"]);
    // No Markdown exists yet: metadata retrieval must not open reference bodies.
    await writeFile(join(learned, "snapshot.md"), "body");
    await markKnowledgeSynced(root, ["source"]);
    assert.deepEqual((await knowledgeStatus(root)).unpublished, []);
    assert.equal((await readIndexedReference(learned, "snapshot", 0, 2)).content, "bo");
    assert.equal((await readIndexedReference(learned, "snapshot", 0, 2)).nextOffset, 2);
    await writeFile(join(learned, "snapshot.md"), "changed body");
    await assert.rejects(readIndexedReference(learned, "snapshot"), /resync/);
    await assert.rejects(markKnowledgeSynced(root, ["source"]), /Changed reference/);
    await writeFile(join(learned, "snapshot.md"), "body");
    await writeFile(join(root, "knowledge/source/manual/second.md"), "second");
    await catalogKnowledgeDocument(root, { id: "second", path: "knowledge/source/manual/second.md", title: "Second", summary: "Independent evidence", sourceType: "manual", facets: {} });
    index.entries.push({ ...entry("dependent", ["decision"]), kind: "decision", sources: { second: contentHash("second") }, related: ["snapshot"] });
    await save();
    await writeFile(join(root, "knowledge/source/manual/source.md"), "corrected source");
    assert.deepEqual((await knowledgeStatus(root)).affectedReferences, ["snapshot", "dependent"]);
    await assert.rejects(markKnowledgeSynced(root, ["source"]), /Stale reference/);
    await rm(join(root, "knowledge/source/manual/source.md"));
    assert.deepEqual((await knowledgeStatus(root)).deleted, ["source"]);
    await writeFile(join(root, "knowledge/source/manual/source.md"), "source");
    index.entries.pop();
    index.outcomes[0]!.action = "deferred"; await save();
    assert.ok((await knowledgeStatus(root)).unpublished.includes("source"));
    await assert.rejects(markKnowledgeSynced(root, ["source"]), /Deferred/);
    index.entries[0]!.path = "../../knowledge/source/manual/source.md"; await save();
    await assert.rejects(readIndexedReference(learned, "snapshot"), /escapes/);
    await symlink(join(root, "knowledge/source/manual/source.md"), join(learned, "escape.md"));
    index.entries[0]!.path = "escape.md"; await save();
    await assert.rejects(readIndexedReference(learned, "snapshot"), /escapes/);
    index.entries[0]!.related = ["missing"]; await save();
    await assert.rejects(readReferenceIndex(learned), /Unknown related/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("concepts and uncertain decisions are context, not engineering rules", async () => {
  const root = await mkdtemp(join(tmpdir(), "fs-rules-"));
  try {
    const profile = { technologies: [], constraints: [], conventions: [] } as unknown as ProjectProfile;
    const request = { constraints: [] } as unknown as WorkRequest;
    const knowledge = [entry("concept", ["state"]), { ...entry("uncertain", ["state"]), kind: "decision" as const, review: "uncertain" as const }, { ...entry("decision", ["state"]), kind: "decision" as const }];
    const rules = await new RuleResolver(root).resolve(profile, request, knowledge, []);
    assert.deepEqual(rules.filter((rule) => rule.source === "knowledge").map((rule) => rule.id), ["decision"]);
    assert.equal(rules[0]?.mandatory, false);
  } finally { await rm(root, { recursive: true, force: true }); }
});
