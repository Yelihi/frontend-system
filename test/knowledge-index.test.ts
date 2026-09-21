import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { catalogKnowledgeDocument, knowledgeStatus, loadKnowledgeCatalog, markKnowledgeSynced } from "../src/application/knowledge/catalog.js";
import { contentHash, readIndexedReference, readReferenceIndex, searchReferenceIndex, type ReferenceEntry, type ReferenceIndex } from "../src/application/knowledge/reference-index.js";
import { KnowledgeResolver } from "../src/application/knowledge/knowledge-resolver.js";
import { RuleResolver } from "../src/application/rules/rule-resolver.js";
import type { ProjectProfile, WorkRequest } from "../src/domain/types.js";

function entry(id: string, keywords: string[], technologies: string[] = []): ReferenceEntry {
  return { id, kind: "concept", title: id, summary: "근거와 적용 조건을 본문에서 확인", path: `${id}.md`, contentHash: contentHash("body"), keywords, domains: ["state"], technologies, excludedTechnologies: [], conditions: ["Check version and domain"], exclusions: [], evidenceKind: "public-contract", review: "reviewed", sources: { source: contentHash("source") }, related: [] };
}

test("published knowledge: symptom retrieval, technology boundaries and evidence hashes", async (t) => {
  const root = process.cwd();
  const learned = join(root, "references/learned");
  const index = await readReferenceIndex(learned);
  assert.ok(index);
  const catalog = await loadKnowledgeCatalog(root);
  for (const reference of index.entries) {
    const body = await readIndexedReference(learned, reference.id, 0, 12000);
    assert.equal(body.nextOffset, null, `Keep reference cohesive: ${reference.id}`);
    for (const heading of ["## 참고 상황", "## 판단에 사용할 내용", "## 적용하지 않는 경우"]) {
      assert.ok(body.content.includes(heading), `Missing usage guidance: ${reference.id}/${heading}`);
    }
    for (const [id, hash] of Object.entries(reference.sources)) {
      const document = catalog.documents[id];
      assert.ok(document, `Missing source: ${id}`);
      assert.equal(contentHash(await readFile(join(root, document.path), "utf8")), hash);
    }
  }
  const cases: Array<{ query: string; tech: string[]; expected: string[]; allowsNeutral?: boolean }> = [
    { query: "아이콘 삭제 버튼 이름", tech: ["React"], expected: ["accessibility-names-and-alternatives"] },
    { query: "선택한 radio 다시 누르면 해제", tech: ["Vue"], expected: ["accessibility-widget-interactions"] },
    { query: "modal focus trap", tech: ["Vue"], expected: ["accessibility-modal-focus"] },
    { query: "재정렬 뒤 입력 값 남음", tech: ["React"], expected: ["react-identity-and-state"] },
    { query: "state snapshot", tech: ["React"], expected: ["react-rendering-state-model", "react-fiber-work-in-progress"] },
    { query: "state snapshot", tech: ["Vue"], expected: [], allowsNeutral: true },
    { query: "alternate memoizedState", tech: ["React"], expected: ["react-fiber-work-in-progress"] },
    { query: "행 클릭 table", tech: ["Vue"], expected: ["accessibility-native-controls-and-forms"] },
    { query: "polymorphic as", tech: ["React"], expected: ["accessibility-static-validation"] },
    { query: "zzunmatchedknowledgeprobezz", tech: [], expected: [] },
    { query: "가독성 반환 타입", tech: [], expected: ["code-quality-context-and-contracts"] },
    { query: "module not found alias", tech: [], expected: ["bundling-module-graph-and-transforms"] },
    { query: "sideEffects production CSS", tech: [], expected: ["bundling-output-and-optimization"] },
    { query: "최소 재현", tech: [], expected: ["debugging-evidence-and-reproduction"] },
    { query: "refetch", tech: ["React"], expected: ["debugging-react-integration-cases"] },
    { query: "refetch", tech: ["Vue"], expected: [], allowsNeutral: true },
    { query: "inputmode", tech: [], expected: ["html-editing-and-localization"] },
    { query: "inert", tech: [], expected: ["html-focus-visibility-and-popovers"] },
    { query: "exportparts", tech: [], expected: ["html-shadow-parts-and-experimental-headings"] },
    { query: "microdata", tech: [], expected: ["html-microdata-and-csp-nonces"] },
    { query: "margin collapsing", tech: [], expected: ["css-boxes-sizing-and-layout"] },
    { query: "specificity", tech: [], expected: ["css-cascade-and-value-resolution"] },
    { query: "will-change", tech: [], expected: ["css-motion-and-rendering-hints"] },
    { query: "Object.is", tech: [], expected: ["javascript-values-equality-and-collections"] },
    { query: "Symbol.iterator", tech: [], expected: ["javascript-iteration-promises-and-resources"] },
    { query: "렉시컬 클로저", tech: [], expected: ["javascript-functions-objects-and-scope"] },
    { query: "Intl", tech: [], expected: ["javascript-dates-and-internationalization"] },
    { query: "manifest", tech: [], expected: ["web-platform-protocols-and-delivery"] },
    { query: "XPath", tech: [], expected: ["web-xml-query-transform-and-automation"] },
    { query: "fetch HTTP 오류", tech: [], expected: ["web-api-network-streams-and-urls"] },
    { query: "BroadcastChannel 저장소 파티션", tech: [], expected: ["web-api-workers-and-coordination"] },
    { query: "IndexedDB", tech: [], expected: ["web-api-files-and-storage"] },
    { query: "getDisplayMedia", tech: [], expected: ["web-api-media-pipelines-and-speech"] },
    { query: "Trusted Types", tech: [], expected: ["web-api-permissions-identity-and-injection"] },
    { query: "WebVR", tech: [], expected: ["web-api-retired-features"] },
    { query: "WebUSB", tech: [], expected: ["web-api-hardware-transports"] },
    { query: "Summarizer", tech: [], expected: ["web-api-browser-ai-capabilities"] },
    { query: "tsconfig 배포 import 실패", tech: ["TypeScript"], expected: ["typescript-module-environment"] },
    { query: "compound cloneElement 중첩", tech: ["React"], expected: ["react-compound-component-boundaries"] },
    { query: "클릭 반응 INP forced reflow", tech: [], expected: ["web-performance-interaction-diagnosis"] },
    { query: "오프라인 저장 동기화 대기", tech: [], expected: ["pwa-offline-state-feedback"] },
    { query: "관리자 버튼 객체 소유권 IDOR", tech: [], expected: ["security-server-authorization-boundary"] },
    { query: "use client 서버 children", tech: ["Next.js"], expected: ["nextjs-server-client-boundary"] },
    { query: "필터 목록 파생 상태 useEffect", tech: ["React"], expected: ["react-derived-state-and-effects"] },
    { query: "이전 검색 응답 최신 결과 덮어쓰기", tech: ["React"], expected: ["react-derived-state-and-effects"] },
    { query: "useSyncExternalStore snapshot 구독", tech: ["React"], expected: ["react-derived-state-and-effects"] },
    { query: "useSyncExternalStore snapshot 구독", tech: ["Vue"], expected: [], allowsNeutral: true },
    { query: "staleTime gcTime 창 포커스", tech: ["React"], expected: ["tanstack-query-freshness-and-retention"] },
    { query: "팀 독립 배포 의존성 중복", tech: [], expected: ["micro-frontends-adoption-tradeoffs"] },
    { query: "RenderingNG compositor raster", tech: [], expected: ["chromium-rendering-pipeline"] },
    { query: "WebGL varying attribute", tech: [], expected: ["webgl-shader-data-flow"] },
    { query: "스타일이 덮어써지거나 우선순위 충돌", tech: [], expected: ["css-cascade-and-value-resolution"] },
    { query: "용량 초과 데이터가 사라지거나", tech: [], expected: ["web-api-files-and-storage"] },
    { query: "gcTime staleTime", tech: ["Vue"], expected: [], allowsNeutral: true },
  ];
  let relevant = 0, returned = 0, expected = 0, characters = 0;
  for (const scenario of cases) {
    const results = searchReferenceIndex(index, scenario.query, scenario.tech, 5);
    const ids = results.map((result) => result.id);
    assert.ok(scenario.expected.every((id) => ids.includes(id)), `${scenario.query}: ${ids.join(", ")}`);
    if (!scenario.expected.length && !scenario.allowsNeutral) assert.deepEqual(ids, []);
    if (scenario.tech.includes("Vue")) assert.ok(results.every((result) => !result.technologies.includes("react")));
    relevant += ids.filter((id) => scenario.expected.includes(id)).length;
    returned += ids.length; expected += scenario.expected.length;
    characters += JSON.stringify(results).length;
    t.diagnostic(JSON.stringify({ query: scenario.query, ids }));
  }
  t.diagnostic(JSON.stringify({ cases: cases.length, retrievedPrecisionAt5: relevant / returned, recallAt5: relevant / expected, returnedCharacters: characters, synthetic: true }));
});

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
