import { approveFixtureSource, addActiveFixtureNote as addKnowledgeNote } from "./source-review-fixture.js";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { addKnowledgeNote as addPendingNote, knowledgeStatus, markKnowledgeSynced, validateKnowledgeSync } from "../src/application/knowledge/catalog.js";
import { contentHash, readReferenceIndex, type ReferenceIndex } from "../src/application/knowledge/reference-index.js";
import { discoverKnowledgeTriggers, inspectCodeKnowledge, saveKnowledgeReview } from "../src/application/knowledge/trigger-review.js";

test("plain notes → v3 publication → artifact changes invalidate only affected sources", async () => {
  const root = await mkdtemp(join(tmpdir(), "fs-sync-routing-"));
  try {
    const note = await addKnowledgeNote(root, { title: "이름이 없는 아이콘 버튼", content: "버튼의 계산된 이름으로 행동 대상을 구별한다. 텍스트 버튼은 불필요하게 덮어쓰지 않는다." });
    assert.equal((await addKnowledgeNote(root, { title: "같은 메모", content: await readFile(join(root, note.document.path), "utf8") })).duplicateOf, note.document.id);
    const other = await addKnowledgeNote(root, { title: "별도 원본", content: "현재 도입하지 않을 개인 학습 메모" });
    assert.equal((await knowledgeStatus(root)).unpublished.length, 2);
    const learned = join(root, "references/learned");
    await mkdir(learned, { recursive: true });
    const body = "Inspect the computed name and preserve visible action text. Do not overwrite an adequate native name.";
    const index: ReferenceIndex = { version: 1, entries: [{
      id: "names", kind: "concept", title: "Button names", summary: "Review icon button target names", path: "names.md", contentHash: contentHash(body),
      keywords: ["icon", "button", "이름"], domains: ["accessibility"], technologies: [], excludedTechnologies: [],
      conditions: ["Interactive element naming"], exclusions: ["Adequate native text name"], evidenceKind: "experience", review: "reviewed",
      sources: { [note.document.id]: note.document.contentHash }, related: [],
    }], outcomes: [
      { sourceId: note.document.id, sourceHash: note.document.contentHash, action: "represented", reason: "Preserve naming context and exception" },
      { sourceId: other.document.id, sourceHash: other.document.contentHash, action: "omitted", reason: "Retained source only; no reviewed claim" },
    ] };
    const save = () => writeFile(join(learned, "index.json"), JSON.stringify(index));
    await writeFile(join(learned, "names.md"), body); await save();
    assert.ok(await readReferenceIndex(learned), "Legacy index remains readable");
    await assert.rejects(markKnowledgeSynced(root, [note.document.id]), /Migrate/);
    assert.deepEqual((await knowledgeStatus(root)).routing.unmigrated, ["names"]);
    index.version = 3;
    await save();
    await assert.rejects(readReferenceIndex(learned), /Missing routing/);
    const entry = index.entries[0]!;
    entry.routing = { mode: "direct", reason: "Review names in code context" };
    entry.triggers = [{ kind: "jsx-element", value: "button" }, { kind: "semantic", value: "ui.naming", description: "Interactive element's target is unclear" }];
    entry.checks = [{ id: "name", question: "Does the computed name identify the action target?", guidance: body, verification: "behavior" }];
    await save();
    await assert.rejects(validateKnowledgeSync(root, [note.document.id]), /positive and exclusion/);
    index.triggerChecks = [
      { signals: [{ kind: "jsx-element", value: "button" }], technologies: [], expectedIds: ["names"], forbiddenIds: [] },
      { signals: [{ kind: "jsx-element", value: "article" }], technologies: [], expectedIds: [], forbiddenIds: ["names"] },
    ];
    await save();
    await approveFixtureSource(root, note.document.id);
    await approveFixtureSource(root, other.document.id);
    await markKnowledgeSynced(root, [note.document.id, other.document.id]);
    assert.deepEqual((await knowledgeStatus(root)).unpublished, []);
    const discovery = await discoverKnowledgeTriggers(root, { query: "icon button", domains: ["accessibility"], limit: 1 });
    assert.equal(discovery.entries[0]?.triggers[0]?.description, "Interactive element's target is unclear");
    await writeFile(join(root, "view.tsx"), 'export const View = () => <button onClick={remove}>×</button>;');
    const inspected = await inspectCodeKnowledge(root, root, { files: ["view.tsx"] });
    assert.equal(inspected.candidates[0]?.id, "names", "No API or topic in task prompt needed");
    const judgment = inspected.checklist.map((item) => ({ itemId: item.itemId, decision: "needs-context" as const,
      evidence: "<button onClick={remove}>×</button>", rationale: "Need the deletion target and intended accessible name",
      verification: { kind: "browser" as const, reason: "Inspect the computed name after editing" } }));
    assert.equal((await saveKnowledgeReview(root, root, inspected.request, inspected.inspectionHash, judgment, "naming", null)).status, "pending");
    entry.checks[0]!.guidance += " Preserve the target context."; await save();
    assert.deepEqual((await knowledgeStatus(root)).unpublished, [note.document.id]);
    await assert.rejects(discoverKnowledgeTriggers(root, { expectedHash: discovery.hash }), /Knowledge changed/);
    await assert.rejects(saveKnowledgeReview(root, root, inspected.request, inspected.inspectionHash, judgment, "naming", null), /Inspection changed/);
    await markKnowledgeSynced(root, [note.document.id]);
    await writeFile(join(learned, "names.md"), body + " corrected example");
    assert.deepEqual((await knowledgeStatus(root)).unpublished, [note.document.id]);
    await assert.rejects(validateKnowledgeSync(root, [note.document.id]), /Changed reference/);
    entry.contentHash = contentHash(body + " corrected example"); await save();
    await markKnowledgeSynced(root, [note.document.id]);
    const support = await addKnowledgeNote(root, { title: "Native naming background", content: "Native text contributes to a control's name." });
    await approveFixtureSource(root, support.document.id);
    const supportBody = "Background naming model";
    await writeFile(join(learned, "background.md"), supportBody);
    index.entries.push({ ...entry, id: "background", path: "background.md", contentHash: contentHash(supportBody),
      routing: { mode: "supporting", reason: "Explain native name calculation" }, related: ["names"],
      sources: { [support.document.id]: support.document.contentHash } });
    const background = index.entries[1]!;
    delete background.triggers; delete background.checks;
    index.outcomes.push({ sourceId: support.document.id, sourceHash: support.document.contentHash, action: "represented", reason: "Background for direct naming review" });
    await save();
    await markKnowledgeSynced(root, [note.document.id, support.document.id]);
    const withSupport = await inspectCodeKnowledge(root, root, { files: ["view.tsx"] });
    assert.equal(withSupport.candidates[0]?.supporting[0]?.id, "background");
    await writeFile(join(learned, "background.md"), supportBody + " changed");
    assert.deepEqual((await knowledgeStatus(root)).unpublished.sort(), [note.document.id, support.document.id].sort(), "Supporting-only link invalidates its direct consumer");
    await assert.rejects(saveKnowledgeReview(root, root, withSupport.request, withSupport.inspectionHash, judgment, "naming", null), /Reference changed/);
    await writeFile(join(learned, "background.md"), supportBody);
    background.title = "Updated native naming model"; await save();
    assert.deepEqual((await knowledgeStatus(root)).unpublished.sort(), [note.document.id, support.document.id].sort());
    await markKnowledgeSynced(root, [note.document.id, support.document.id]);
    entry.triggers[0]!.value = "img"; await save();
    assert.deepEqual((await knowledgeStatus(root)).unpublished.sort(), [note.document.id, support.document.id].sort());
    await assert.rejects(markKnowledgeSynced(root, [note.document.id]), /Failed sync trigger/);
    entry.routing = { mode: "deferred", reason: "Need source clarification" };
    background.routing = { mode: "deferred", reason: "Direct judgment needs clarification" };
    delete entry.triggers; delete entry.checks; index.triggerChecks = []; await save();
    await assert.rejects(markKnowledgeSynced(root, [note.document.id]), /Deferred routing/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("scoped semantic discovery is paginated; JSX facts do not assume wrapper DOM", async () => {
  const root = await mkdtemp(join(tmpdir(), "fs-routing-jsx-"));
  try {
    const system = process.cwd();
    let offset = 0;
    const ids: string[] = [];
    let hash: string | undefined;
    do {
      const page = await discoverKnowledgeTriggers(system, { domains: ["css"], limit: 2, offset, ...(hash ? { expectedHash: hash } : {}) });
      assert.ok(page.entries.length <= 2);
      ids.push(...page.entries.map(({ id }) => id)); hash = page.hash;
      offset = page.nextOffset ?? -1;
    } while (offset !== -1);
    const index = (await readReferenceIndex(join(system, "references/learned")))!;
    assert.equal(new Set(ids).size, index.entries.filter((entry) => entry.routing?.mode === "direct" && entry.domains.includes("css")).length);
    assert.deepEqual(new Set(ids), new Set(index.entries.filter((entry) => entry.routing?.mode === "direct" && entry.domains.includes("css")).map(entry => entry.id)));
    const vue = await discoverKnowledgeTriggers(system, { query: "useEffect", technologies: ["Vue"] });
    assert.ok(vue.entries.every(({ id }) => id !== "react-derived-state-and-effects"));
    await writeFile(join(root, "view.tsx"), 'export const View = () => <><Modal aria-modal={true} /><dialog open /><div popover="auto" /></>;');
    const inspected = await inspectCodeKnowledge(root, system, { files: ["view.tsx"] });
    assert.equal(inspected.candidates.find(({ id }) => id === "accessibility-modal-focus")?.matches.length, 1);
    assert.ok(!inspected.analysis.signals.some(({ value }) => value === "aria-modal"), "Wrapper props are not DOM facts");
    assert.ok(!("semanticSignals" in inspected), "Do not return the full semantic vocabulary every inspection");
    assert.equal(inspected.discovery.tool, "discover_knowledge_triggers");
    const nonmodal = inspected.checklist.map((item) => ({ itemId: item.itemId, decision: "not-applicable" as const,
      evidence: item.referenceId === "accessibility-modal-focus" ? "<dialog open />" : '<div popover="auto" />',
      rationale: "This fixture has nonmodal display; a modal trap would change the contract",
      verification: { kind: "none" as const, reason: "Routing exclusion case, no browser verification claimed" } }));
    assert.equal((await saveKnowledgeReview(root, system, inspected.request, inspected.inspectionHash, nonmodal, "nonmodal", null)).status, "reviewed");
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("all published references have explicit usage and direct routing cases", async () => {
  const root = process.cwd();
  const index = (await readReferenceIndex(join(root, "references/learned")))!;
  assert.ok(index.entries.length > 0);
  assert.ok(index.entries.every((entry) => entry.routing));
  const audit = await validateKnowledgeSync(root, []);
  assert.ok(audit.triggerChecks.every(({ passed }) => passed));
  assert.ok(audit.retrievalChecks.every(({ passed }) => passed));
});

test('sync refuses unextractable calls even when synthetic trigger cases agree', async () => {
  const root = await mkdtemp(join(tmpdir(), 'fs-call-publication-'));
  try {
    const note = await addKnowledgeNote(root, {title:'Effect ownership', content:'Review imported effects conditionally.'});
    await approveFixtureSource(root, note.document.id);
    const learned = join(root, 'references/learned'); await mkdir(learned, {recursive:true});
    const body = 'Review ownership before changing an effect.';
    await writeFile(join(learned, 'effect.md'), body);
    const index: ReferenceIndex = {version:3, entries:[{
      id:'effect', kind:'concept', title:'Effect ownership', summary:body, path:'effect.md', contentHash:contentHash(body),
      keywords:['effect'], domains:[], technologies:[], excludedTechnologies:[], conditions:['An imported effect'],
      exclusions:['Unrelated local function'], evidenceKind:'experience', review:'reviewed', sources:{[note.document.id]:note.document.contentHash}, related:[],
      routing:{mode:'direct',reason:'Conditional review'}, triggers:[{kind:'call',value:'useEffect'}],
      checks:[{id:'owner',question:'Who owns it?',guidance:body,verification:'review'}],
    }], outcomes:[{sourceId:note.document.id,sourceHash:note.document.contentHash,action:'represented',reason:'Conditional note'}],
    triggerChecks:[{signals:[{kind:'call',value:'useEffect'}],technologies:[],expectedIds:['effect'],forbiddenIds:[]},
      {signals:[{kind:'call',value:'other#unrelated'}],technologies:[],expectedIds:[],forbiddenIds:['effect']}],
    retrievalChecks:[{query:'Effect ownership',technologies:[],expectedIds:['effect'],forbiddenIds:[]}]};
    const save = () => writeFile(join(learned,'index.json'),JSON.stringify(index));
    await save();
    assert.ok(await readReferenceIndex(learned), 'Old invalid metadata remains readable for repair');
    await assert.rejects(markKnowledgeSynced(root,[note.document.id]), /Invalid sync trigger metadata.*module#export/);
    assert.equal((await knowledgeStatus(root)).unpublished.includes(note.document.id), true);
    for (const value of ['global#setTimeout', 'react#', '#useEffect']) {
      index.entries[0]!.triggers![0]!.value = value;
      index.triggerChecks![0]!.signals[0]!.value = value; await save();
      await assert.rejects(validateKnowledgeSync(root,[note.document.id]), /Invalid sync trigger metadata/);
    }
    index.entries[0]!.triggers![0]!.value = 'react#useEffect';
    index.triggerChecks![0]!.signals[0]!.value = 'useEffect'; await save();
    await assert.rejects(validateKnowledgeSync(root,[note.document.id]), /triggerChecks\[0\]/);
    index.triggerChecks![0]!.signals[0]!.value = 'react#useEffect'; await save();
    await markKnowledgeSynced(root,[note.document.id]);
    await writeFile(join(root,'view.ts'), "import {useEffect as observe} from 'react'; observe(() => {});\nfunction useEffect() {} useEffect();\n");
    const inspected = await inspectCodeKnowledge(root,root,{files:['view.ts']});
    assert.equal(inspected.candidates[0]?.id,'effect');
    assert.equal(inspected.candidates[0]?.matches.length,1,'Only the imported alias matches, not the same-named local function');
    const pending = await addPendingNote(root, {title: 'Unreviewed claim', content: 'A claim not selected by the author.'});
    index.entries[0]!.sources[pending.document.id] = pending.document.contentHash;
    await save();
    await assert.rejects(markKnowledgeSynced(root, [note.document.id]), /Shared reference requires merged/, 'A merged source cannot carry a pending co-source into publication');
  } finally { await rm(root,{recursive:true,force:true}); }
});
