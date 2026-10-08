import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { inspectCode } from "../src/application/knowledge/code-triggers.js";
import { inspectCodeKnowledge, saveKnowledgeReview } from "../src/application/knowledge/trigger-review.js";
import { contentHash, evaluateTriggerChecks, readReferenceIndex } from "../src/application/knowledge/reference-index.js";
import { validateKnowledgeSync } from "../src/application/knowledge/catalog.js";

test("syntax routing resolves binding aliases, ignores shadows, and exposes unresolved boundaries", async () => {
  const root = await mkdtemp(join(tmpdir(), "fs-trigger-"));
  try {
    await mkdir(join(root, "src"));
    await writeFile(join(root, "tsconfig.json"), JSON.stringify({ compilerOptions: { baseUrl: ".", paths: { "@/*": ["src/*"] } } }));
    await writeFile(join(root, "src/hooks.ts"), 'export { useEffect } from "react";');
    await writeFile(join(root, "src/view.tsx"), `import {useEffect as effect} from "react";
import * as R from "react";
import React from "react";
import { useEffect as wrapped } from "@/hooks";
effect(() => {});
R.useState(0);
React.useEffect(() => {});
function shadow(effect: () => void) { effect(); }
function shadowNamespace(R: {useState: () => void}) { R.useState(); }
wrapped(() => {});
const text = "useEffect()";
// useEffect(() => {});
import("./hooks");
`);
    await writeFile(join(root, "src/bad.ts"), "const x = (");
    await writeFile(join(root, "src/view.vue"), "<template />");
    const result = await inspectCode(root, ["src/view.tsx", "src/hooks.ts", "src/bad.ts", "src/view.vue"]);
    assert.deepEqual(result.signals.filter((signal) => signal.kind === "call").map(({ value }) => value),
      ["react#useEffect", "react#useState", "react#useEffect", "@/hooks#useEffect"]);
    assert.equal(result.imports.find(({ specifier }) => specifier === "@/hooks")?.resolvedPath, "src/hooks.ts");
    assert.ok(result.warnings.some((warning) => warning.includes("re-export")));
    assert.ok(result.warnings.some((warning) => warning.includes("dynamic/CommonJS")));
    assert.ok(result.warnings.some((warning) => warning.includes("parse failed")));
    assert.ok(result.warnings.some((warning) => warning.includes("unsupported")));
    assert.ok(result.configHashes["tsconfig.json"]);
    await symlink(join(root, "src/view.tsx"), join(root, "alias.tsx"));
    assert.equal((await inspectCode(root, ["alias.tsx"])).signals[0]?.path, "src/view.tsx");
    await assert.rejects(inspectCode(root, ["../"]));
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("trigger checks bypass lexical ranking; review covers each occurrence and rejects stale or invented evidence", async () => {
  const root = await mkdtemp(join(tmpdir(), "fs-trigger-review-"));
  const systemRoot = process.cwd();
  try {
    const code = 'import {useEffect as effect} from "react";\neffect(() => {});\neffect(() => {});\n';
    await writeFile(join(root, "view.tsx"), code);
    const input = { files: ["view.tsx"], technologies: ["React"] };
    const inspection = await inspectCodeKnowledge(root, systemRoot, input);
    const candidate = inspection.candidates.find(({ id }) => id === "react-derived-state-and-effects");
    assert.ok(candidate);
    assert.equal(candidate.matches.length, 2);
    assert.equal(inspection.checklist.length, candidate.checks.length * 2);
    const judgments = inspection.checklist.map((item) => ({ itemId: item.itemId, decision: "keep" as const,
      evidence: "effect(() => {});", rationale: "Synthetic empty effect retained for routing test, not a production recommendation",
      verification: { kind: "none" as const, reason: "No product behavior changed in this synthetic case" } }));
    await assert.rejects(saveKnowledgeReview(root, systemRoot, input, inspection.inspectionHash, judgments.slice(1), "review", null), /Every checklist/);
    await assert.rejects(saveKnowledgeReview(root, systemRoot, input, inspection.inspectionHash, [...judgments.slice(1), judgments[1]!], "review", null), /Every checklist/);
    await assert.rejects(saveKnowledgeReview(root, systemRoot, input, inspection.inspectionHash, judgments.map((item) => ({ ...item, evidence: "invented" })), "review", null), /evidence/);
    const pending = await saveKnowledgeReview(root, systemRoot, input, inspection.inspectionHash,
      judgments.map((item) => ({ ...item, decision: "needs-decision" })), "review", null);
    assert.equal(pending.status, "pending");
    await assert.rejects(saveKnowledgeReview(root, systemRoot, input, inspection.inspectionHash, judgments, "review", pending.hash), /Investigation findings required/);
    const excludedJudgments = judgments.map((judgment, index) => ({...judgment, decision:'not-applicable' as const,
      investigation:{findings:candidate.investigation!.questions.map(q=>({questionId:q.id,
        status:q.id==='purpose'?'refuted' as const:'unknown' as const,
        basis:q.id==='purpose'?'code' as const:'unknown' as const,
        rationale:'Synthetic empty callback performs no derivation, event work or synchronization; other intent is unknown.',
        citations:q.id==='purpose'?[{path:'view.tsx',line:inspection.checklist[index]!.line,quote:'effect(() => {});'}]:[]})),
        action:'keep' as const,limitations:['Empty callback routing fixture; not a recommendation for production effects.']}}));
    const saved = await saveKnowledgeReview(root, systemRoot, input, inspection.inspectionHash, excludedJudgments, "review", pending.hash);
    assert.equal(saved.status, "reviewed");
    assert.match(saved.verification, /^unverified/);
    const semantic = await inspectCodeKnowledge(root, systemRoot, { ...input, interpretations: [{ path: "view.tsx", line: 2,
      evidence: "effect(() => {});", signal: "react.derived-state", interpretation: "Synthetic host interpretation; not machine verified" }] });
    assert.ok(semantic.analysis.signals.some((signal) => signal.origin === "host"));
    await assert.rejects(inspectCodeKnowledge(root, systemRoot, { ...input, interpretations: [{ path: "view.tsx", line: 2,
      evidence: "invented", signal: "react.derived-state", interpretation: "Not supported" }] }), /evidence/);
    await writeFile(join(root, "view.tsx"), code + "// change\n");
    await assert.rejects(saveKnowledgeReview(root, systemRoot, input, inspection.inspectionHash, judgments, "review", saved.hash), /Inspection changed/);
    const excluded = await inspectCodeKnowledge(root, systemRoot, { ...input, technologies: ["Vue"] });
    assert.equal(excluded.candidates.length, 0);
    const noMatch = await saveKnowledgeReview(root, systemRoot, excluded.request, excluded.inspectionHash, [], "no-match", null);
    assert.equal(noMatch.status, "no-matches");
    assert.match(noMatch.verification, /^unverified/);
    const current = await inspectCodeKnowledge(root, systemRoot, input);
    await writeFile(join(root, "tsconfig.json"), '{"compilerOptions":{"strict":true}}');
    await assert.rejects(saveKnowledgeReview(root, systemRoot, input, current.inspectionHash, judgments, "review", saved.hash), /Inspection changed/);
    await writeFile(join(root, "view.tsx"), 'import {useEffect as effect} from "react";\neffect(() => {}); effect(() => {});');
    const sameLine = await inspectCodeKnowledge(root, systemRoot, input);
    assert.equal(sameLine.checklist.length, candidate.checks.length * 2, "Two calls on one line require separate judgments");
    await mkdir(join(root, "src/domain"), { recursive: true });
    await writeFile(join(root, "src/domain/order.ts"), "// header\n".repeat(20) + 'import {x} from "../adapter";');
    const architecture = await inspectCodeKnowledge(root, systemRoot, { files: ["src/domain/order.ts"] });
    assert.equal(architecture.checklist.length, 1);
    const recorded = await saveKnowledgeReview(root, systemRoot, architecture.request, architecture.inspectionHash,
      architecture.checklist.map((item) => ({ itemId: item.itemId, decision: "needs-context", evidenceLine: 21,
        evidence: 'import {x} from "../adapter";', rationale: "Resolve actual module and agreed layer contract first",
        verification: { kind: "static", reason: "Use project's approved dependency check after resolution" } })), "architecture", null);
    assert.equal(recorded.status, "pending");
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("sync rejects malformed trigger metadata and failed routing cases", async () => {
  const root = await mkdtemp(join(tmpdir(), "fs-trigger-sync-"));
  try {
    const learned = join(root, "references/learned");
    await mkdir(learned, { recursive: true });
    const original = await readReferenceIndex(join(process.cwd(), "references/learned"));
    assert.ok(original);
    assert.ok(evaluateTriggerChecks(original).length >= 4);
    assert.ok(evaluateTriggerChecks(original).every(({ passed }) => passed));
    const entry = structuredClone(original.entries.find(({ id }) => id === "react-derived-state-and-effects")!);
    const index = { version: 1, entries: [entry], outcomes: [], triggerChecks: [{
      signals: [{ kind: "call", value: "unrelated#hook" }], technologies: ["React"], expectedIds: [entry.id], forbiddenIds: [],
    }] };
    entry.related = [];
    const save = () => writeFile(join(learned, "index.json"), JSON.stringify(index));
    await save();
    await assert.rejects(validateKnowledgeSync(root, []), /Failed sync trigger checks/);
    entry.checks!.push(entry.checks![0]!); await save();
    await assert.rejects(readReferenceIndex(learned), /Duplicate knowledge check/);
    delete entry.checks; await save();
    await assert.rejects(readReferenceIndex(learned), /published together/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("reference edits invalidate review even when code is unchanged", async () => {
  const root = await mkdtemp(join(tmpdir(), "fs-trigger-freshness-"));
  try {
    const learned = join(root, "references/learned");
    await mkdir(learned, { recursive: true });
    const original = await readReferenceIndex(join(process.cwd(), "references/learned"));
    const entry = structuredClone(original!.entries.find(({ id }) => id === "react-derived-state-and-effects")!);
    entry.related = [];
    const body = await readFile(join(process.cwd(), "references/learned", entry.path), "utf8");
    await writeFile(join(learned, entry.path), body);
    const save = () => writeFile(join(learned, "index.json"), JSON.stringify({ version: 1, entries: [entry], outcomes: [] }));
    await save();
    await writeFile(join(root, "view.tsx"), 'import {useEffect} from "react";\nuseEffect(() => {});');
    const input = { files: ["view.tsx"] };
    const before = await inspectCodeKnowledge(root, root, input);
    entry.checks![0]!.guidance += " Recheck changed guidance.";
    await save();
    await assert.rejects(saveKnowledgeReview(root, root, input, before.inspectionHash, [], "review", null), /Inspection changed/);
    await writeFile(join(learned, entry.path), body + "\nchanged");
    await assert.rejects(inspectCodeKnowledge(root, root, input), /Reference changed/);
    entry.contentHash = contentHash(body + "\nchanged"); entry.review = "uncertain"; await save();
    const uncertain = await inspectCodeKnowledge(root, root, input);
    await assert.rejects(saveKnowledgeReview(root, root, input, uncertain.inspectionHash,
      uncertain.checklist.map((item) => ({ itemId: item.itemId, decision: "apply", rationale: "Unjustified adoption", evidence: "useEffect(() => {});",
        verification: { kind: "none", reason: "No evidence" } })), "review", null), /Uncertain knowledge/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
