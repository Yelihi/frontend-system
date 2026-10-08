import { validateInvestigation, investigationCitations } from "./investigation.js";
import { join } from "node:path";
import * as z from "zod/v4";
import { saveProjectRecord } from "../workflow-store.js";
import { readProjectSource } from "../project-snapshot.js";
import { quoteLocationHint } from '../source-file.js';
import { inspectCode, projectFile, type CodeSignal } from "./code-triggers.js";
import { confinedRead, contentHash, matchKnowledgeTriggers, readReferenceIndex, searchReferenceIndex, technologyKey } from "./reference-index.js";

import { triggerInspectionSchema, triggerDiscoverySchema, checkJudgmentSchema } from './trigger-schema.js';
export { interpretationSchema, triggerInspectionSchema, triggerDiscoverySchema, checkJudgmentSchema } from './trigger-schema.js';
type InspectionInput = z.input<typeof triggerInspectionSchema>;

export async function discoverKnowledgeTriggers(systemRoot: string, input: z.input<typeof triggerDiscoverySchema>) {
  const request = triggerDiscoverySchema.parse(input);
  const index = await readReferenceIndex(join(systemRoot, "references/learned"));
  if (!index) throw new Error("Publish a knowledge index before trigger discovery");
  const hash = contentHash(JSON.stringify(index));
  if (request.expectedHash && request.expectedHash !== hash) throw new Error("Knowledge changed; restart discovery");
  const technologies = request.technologies.map(technologyKey);
  const domains = new Set(index.entries.flatMap((entry) => entry.domains));
  if (request.domains.some((domain) => !domains.has(domain))) throw new Error(`Unknown domains; use: ${[...domains].sort().join(', ')}`);
  let entries = index.entries.filter((entry) => entry.triggers?.some((trigger) => trigger.kind === "semantic") &&
    (!entry.routing || entry.routing.mode === "direct") &&
    (!request.domains.length || entry.domains.some((domain) => request.domains.includes(domain))) &&
    !entry.excludedTechnologies.some((value) => technologies.includes(technologyKey(value))) &&
    (!technologies.length || !entry.technologies.length || entry.technologies.some((value) => technologies.includes(technologyKey(value)))));
  if (request.query.trim()) {
    const ids = searchReferenceIndex({ ...index, entries }, request.query, request.technologies, 20).map(({ id }) => id);
    entries = ids.map((id) => entries.find((entry) => entry.id === id)!);
  }
  return { hash, total: entries.length, nextOffset: request.offset + request.limit < entries.length ? request.offset + request.limit : null,
    queryLimit: request.query.trim() ? 20 : null,
    domains: [...new Set(index.entries.filter((entry) => entry.routing?.mode === "direct").flatMap((entry) => entry.domains))].sort(),
    entries: entries.slice(request.offset, request.offset + request.limit).map((entry) => ({ id: entry.id, title: entry.title,
      triggers: entry.triggers!.filter((trigger) => trigger.kind === "semantic"), conditions: entry.conditions, exclusions: entry.exclusions,
      investigation: entry.investigation ? {questionCount: entry.investigation.questions.length, readWith: "read_learned_knowledge"} : null })),
    authority: "Discovery candidates only; read scoped code and cite evidence before emitting a semantic signal" };
}

function hasEvidence(content: string, line: number, evidence: string) {
  return content.split(/\r?\n/).slice(line - 1, line + 9).join("\n").includes(evidence);
}

export async function inspectCodeKnowledge(projectRoot: string, systemRoot: string, input: InspectionInput) {
  const request = triggerInspectionSchema.parse(input);
  const started = performance.now();
  const learned = join(systemRoot, "references/learned");
  const index = await readReferenceIndex(learned);
  if (!index) throw new Error("Publish a knowledge index before trigger inspection");
  const analysis = await inspectCode(projectRoot, request.files, request.snapshot, request.includeRelations);
  const signals: CodeSignal[] = [...analysis.signals];
  const semanticSignals = [...new Set(index.entries.flatMap((entry) => entry.triggers ?? [])
    .filter((trigger) => trigger.kind === "semantic").map((trigger) => trigger.value))].sort();
  for (const observation of request.interpretations) {
    if (!semanticSignals.includes(observation.signal)) throw new Error(`Unknown semantic trigger: ${observation.signal}`);
    const file = request.snapshot
      ? { path: observation.path, content: (await readProjectSource(projectRoot, observation.path, request.snapshot.expectedCommit, request.snapshot.baseRef, 0, 512_000)).content }
      : await projectFile(projectRoot, observation.path);
    if (analysis.hashes[file.path] !== contentHash(file.content)) throw new Error("Interpretation must cite a current inspected file");
    if (!hasEvidence(file.content, observation.line, observation.evidence)) throw new Error(`Interpretation evidence does not match cited lines: ${observation.path}:${observation.line}. ${quoteLocationHint(file.content, observation.evidence)}`);
    signals.push({ kind: "semantic", value: observation.signal, path: file.path, line: observation.line,
      column: observation.column, evidence: observation.evidence, origin: "host" });
  }
  if (signals.length > 1000) throw new Error("Too many signals; inspect a smaller file scope");
  const matches = matchKnowledgeTriggers(index, signals, request.technologies);
  if (matches.length > 100) throw new Error("Too many references; narrow the file/technology scope");
  const candidates = [];
  for (const { entry, matched } of matches) {
    const supporting = index.entries.filter((item) => item.routing?.mode === "supporting" && item.related.includes(entry.id));
    // Check freshness without sending every reference body to the model.
    for (const reference of [entry, ...supporting]) {
      if (contentHash(await confinedRead(learned, reference.path)) !== reference.contentHash) throw new Error(`Reference changed; resync required: ${reference.id}`);
    }
    candidates.push({ id: entry.id, title: entry.title, contentHash: entry.contentHash, kind: entry.kind, review: entry.review,
      conditions: entry.conditions, exclusions: entry.exclusions, checks: entry.checks ?? [],
      investigation: entry.investigation ?? null, investigationStatus: entry.investigation ? "pending" : "legacy-checklist",
      supporting: supporting.map((item) => ({ id: item.id, title: item.title, reason: item.routing!.reason, readWith: "read_learned_knowledge" })),
      matches: matched as CodeSignal[], readWith: "read_learned_knowledge" });
  }
  const checklist = candidates.flatMap((candidate) => candidate.checks.flatMap((check) => {
    const locations = new Map(candidate.matches.map((signal) => [`${signal.path}:${signal.line}:${signal.column}`, signal]));
    return [...locations.values()].map((signal) => ({
      itemId: contentHash(JSON.stringify([candidate.id, check.id, signal.path, signal.line, signal.column])),
      referenceId: candidate.id, checkId: check.id, path: signal.path, line: signal.line, column: signal.column,
    }));
  }));
  const payload = { request, analysis: { ...analysis, signals }, candidates, checklist,
    discovery: { tool: "discover_knowledge_triggers", reason: "Use task symptoms, observed code and domain; static matches alone do not cover semantic knowledge" },
    knowledgeHash: contentHash(JSON.stringify(index)),
    authority: "Static facts and host interpretations; no automatic adoption or verification" };
  return { ...payload, inspectionHash: contentHash(JSON.stringify(payload)), elapsedMs: performance.now() - started };
}

export async function saveKnowledgeReview(projectRoot: string, systemRoot: string, input: InspectionInput,
  expectedInspectionHash: string, judgments: Array<z.input<typeof checkJudgmentSchema>>, id: string, expectedHash: string | null) {
  const inspection = await inspectCodeKnowledge(projectRoot, systemRoot, input);
  if (inspection.request.snapshot) throw new Error('Implementation reviews require working-tree evidence');
  if (inspection.inspectionHash !== expectedInspectionHash) throw new Error("Inspection changed; inspect code and knowledge again");
  const parsed = z.array(checkJudgmentSchema).max(5000).parse(judgments);
  const byId = new Map(parsed.map((judgment) => [judgment.itemId, judgment]));
  if (byId.size !== parsed.length || parsed.length !== inspection.checklist.length ||
    inspection.checklist.some((item) => !byId.has(item.itemId))) throw new Error("Every checklist item needs exactly one judgment");
  const files = new Map(await Promise.all([...new Set(Object.keys(inspection.analysis.hashes))].map(async (path) =>
    [path, await projectFile(projectRoot, path)] as const)));
  for (const item of inspection.checklist) {
    const judgment = byId.get(item.itemId)!;
    const file = files.get(item.path)!;
    if (contentHash(file.content) !== inspection.analysis.hashes[item.path] || !hasEvidence(file.content, judgment.evidenceLine ?? item.line, judgment.evidence)) {
      throw new Error("Judgment evidence must match current code at the trigger location");
    }
    const reference = inspection.candidates.find((candidate) => candidate.id === item.referenceId)!;
    if (reference.review === "uncertain" && judgment.decision === "apply") throw new Error("Uncertain knowledge needs further review before adoption");
    validateInvestigation(reference.investigation ?? undefined, judgment.decision, judgment.investigation);
    for (const citation of investigationCitations(judgment.investigation)) {
      const cited = files.get(citation.path);
      if (!cited || contentHash(cited.content) !== inspection.analysis.hashes[citation.path] || !hasEvidence(cited.content, citation.line, citation.quote))
        throw new Error("Investigation citation must match the current inspected scope; include callers and contracts in files");
    }
  }
  const pending = parsed.filter((judgment) => ["needs-context", "needs-decision"].includes(judgment.decision));
  const record = {
    inspectionHash: inspection.inspectionHash, request: inspection.request, sourceHashes: inspection.analysis.hashes,
    configHashes: inspection.analysis.configHashes, knowledgeHash: inspection.knowledgeHash,
    checklist: inspection.checklist, judgments: parsed, warnings: inspection.analysis.warnings,
    status: pending.length ? "pending" : parsed.length ? "reviewed" : "no-matches",
    authority: "host-model-review", verification: "unverified; run existing project checks and policy reviews",
  };
  const saved = await saveProjectRecord(projectRoot, "evidence", id, JSON.stringify(record, null, 2), expectedHash);
  return { ...saved, status: record.status, pending: pending.length, verification: record.verification };
}
