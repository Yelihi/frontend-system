import { createHash } from "node:crypto";
import { readFile, realpath } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import * as z from "zod/v4";
import { investigationSchema } from "./investigation.js";
import { ruleSchema } from "../policy.js";

const text = z.string().min(1).max(600);
const id = z.string().regex(/^[a-z0-9][a-z0-9._-]*$/);
const hash = z.string().regex(/^[a-f0-9]{64}$/);
export const triggerSchema = z.object({ kind: z.enum(["call", "import", "path", "jsx-element", "jsx-attribute", "semantic", "syntax"]), value: text, description: text.optional() });
export const knowledgeCheckSchema = z.object({
  id, question: text, guidance: text,
  verification: z.enum(["review", "static", "behavior", "runtime"]),
});
export const referenceIndexSchema = z.object({
  version: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  entries: z.array(z.object({
    id, kind: z.enum(["concept", "decision", "rule"]), title: text, summary: text,
    rule: ruleSchema.optional(),
    ruleApproval: z.object({ proposalId: id, proposalHash: hash }).optional(),
    path: text, contentHash: hash,
    keywords: z.array(text).max(30), domains: z.array(text).max(15),
    technologies: z.array(text).max(15), excludedTechnologies: z.array(text).max(15),
    conditions: z.array(text).max(15), exclusions: z.array(text).max(15),
    evidenceKind: z.enum(["public-contract", "implementation", "experience", "hypothesis"]),
    review: z.enum(["reviewed", "uncertain"]),
    sources: z.record(id, hash), related: z.array(id).max(15),
    routing: z.object({ mode: z.enum(["direct", "supporting", "deferred"]), reason: text }).optional(),
    triggers: z.array(triggerSchema).min(1).max(30).optional(),
    investigation: investigationSchema.optional(),
    checks: z.array(knowledgeCheckSchema).min(1).max(15).optional(),
  })).max(10000),
  retrievalChecks: z.array(z.object({
    query: text, technologies: z.array(text).max(15),
    expectedIds: z.array(id).max(20), forbiddenIds: z.array(id).max(20), expectEmpty: z.boolean().optional(),
  })).max(1000).optional(),
  triggerChecks: z.array(z.object({
    signals: z.array(triggerSchema).max(30), technologies: z.array(text).max(15),
    expectedIds: z.array(id).max(20), forbiddenIds: z.array(id).max(20), expectEmpty: z.boolean().optional(),
  })).max(1000).optional(),
  outcomes: z.array(z.object({
    sourceId: id, sourceHash: hash,
    action: z.enum(["represented", "deferred", "omitted"]), reason: text,
  })).max(10000),
});
export type ReferenceIndex = z.infer<typeof referenceIndexSchema>;
export type ReferenceEntry = ReferenceIndex["entries"][number];
export const contentHash = (value: string) => createHash("sha256").update(value).digest("hex");
export const technologyKey = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

export async function confinedRead(root: string, path: string): Promise<string> {
  if (isAbsolute(path)) throw new Error("Expected a relative knowledge path.");
  const base = await realpath(root);
  const target = await realpath(resolve(base, path));
  const rel = relative(base, target);
  if (!rel || rel.startsWith("..") || isAbsolute(rel)) throw new Error("Knowledge path escapes its root.");
  return readFile(target, "utf8");
}

export async function readReferenceIndex(root: string): Promise<ReferenceIndex | undefined> {
  let raw: string;
  try { raw = await readFile(resolve(root, "index.json"), "utf8"); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
  const index = referenceIndexSchema.parse(JSON.parse(raw));
  const ids = new Set(index.entries.map((entry) => entry.id));
  if (ids.size !== index.entries.length) throw new Error("Duplicate knowledge IDs.");
  if (new Set(index.outcomes.map((item) => item.sourceId)).size !== index.outcomes.length) throw new Error("Duplicate source outcomes.");
  for (const entry of index.entries) {
    if (index.version === 3) {
      if (!entry.routing) throw new Error(`Missing routing disposition: ${entry.id}`);
      if (entry.routing.mode === "direct" && (!entry.triggers || !entry.checks || !entry.conditions.length || !entry.exclusions.length)) throw new Error(`Direct routing needs triggers, checks and applicability: ${entry.id}`);
      if (entry.routing.mode !== "direct" && (entry.triggers || entry.checks)) throw new Error(`Only direct knowledge may own checks: ${entry.id}`);
      if (entry.routing.mode === "supporting" && !entry.related.some((id) => index.entries.find((item) => item.id === id)?.routing?.mode === "direct")) throw new Error(`Supporting knowledge needs a direct reference: ${entry.id}`);
      if (entry.triggers?.some((trigger) => trigger.kind === "semantic" && !trigger.description)) throw new Error(`Semantic trigger needs a description: ${entry.id}`);
    }
    if (entry.investigation && entry.routing?.mode !== "direct") throw new Error(`Only direct knowledge may own investigation: ${entry.id}`);
    if (!!entry.triggers !== !!entry.checks) throw new Error(`Triggers and checks must be published together: ${entry.id}`);
    if (entry.checks && new Set(entry.checks.map((check) => check.id)).size !== entry.checks.length) throw new Error(`Duplicate knowledge check IDs: ${entry.id}`);
    if (entry.kind === "rule" && (index.version < 2 || !entry.rule || !entry.ruleApproval || entry.review !== "reviewed" || entry.rule.id !== entry.id)) throw new Error(`Rule needs an approved v2 definition: ${entry.id}`);
    if (entry.kind !== "rule" && (entry.rule || entry.ruleApproval)) throw new Error(`Rule metadata on non-rule: ${entry.id}`);
    if (!Object.keys(entry.sources).length) throw new Error(`Missing source evidence: ${entry.id}`);
    if (entry.related.some((related) => !ids.has(related))) throw new Error(`Unknown related knowledge: ${entry.id}`);
  }
  for (const check of [...index.retrievalChecks ?? [], ...index.triggerChecks ?? []]) {
    if ((check.expectEmpty && check.expectedIds.length > 0) || [...check.expectedIds, ...check.forbiddenIds].some((id) => !ids.has(id)) ||
      check.expectedIds.some((id) => check.forbiddenIds.includes(id))) throw new Error("Invalid retrieval check IDs.");
  }
  return index;
}

export function matchKnowledgeTriggers(index: ReferenceIndex, signals: Array<z.infer<typeof triggerSchema>>, technologies: string[] = []) {
  const tech = technologies.map(technologyKey);
  return index.entries.filter((entry) =>
    (!entry.routing || entry.routing.mode === "direct") &&
    !entry.excludedTechnologies.some((value) => tech.includes(technologyKey(value))) &&
    (!tech.length || !entry.technologies.length || entry.technologies.some((value) => tech.includes(technologyKey(value))))
  ).flatMap((entry) => {
    const matched = signals.filter((signal) => entry.triggers?.some((trigger) => trigger.kind === signal.kind &&
      (trigger.kind === "path" ? signal.value === trigger.value || signal.value.startsWith(trigger.value.replace(/\/$/, "") + "/") : signal.value === trigger.value)));
    return matched.length ? [{ entry, matched }] : [];
  });
}

export function evaluateTriggerChecks(index: ReferenceIndex) {
  return (index.triggerChecks ?? []).map((check) => {
    const ids = matchKnowledgeTriggers(index, check.signals, check.technologies).map(({ entry }) => entry.id);
    return { ...check, ids, passed: check.expectedIds.every((id) => ids.includes(id)) &&
      check.forbiddenIds.every((id) => !ids.includes(id)) && (!check.expectEmpty || ids.length === 0) };
  });
}

// Matching a fabricated signal against the same fabricated trigger can pass every
// synthetic case. Reject call shapes the extractor cannot emit at publication;
// keep old indexes readable so their metadata can be inspected and repaired.
export function triggerPublicationFailures(index: ReferenceIndex) {
  const failures: string[] = [];
  const check = (trigger: z.infer<typeof triggerSchema>, location: string) => {
    if (trigger.kind === 'syntax' && trigger.value !== 'parameter-dispatch') failures.push(`${location}: unsupported syntax trigger ${trigger.value}`);
    if (trigger.kind !== 'call') return;
    const separator = trigger.value.lastIndexOf('#');
    if (separator <= 0 || separator === trigger.value.length - 1 ||
      (trigger.value.startsWith('global#') && trigger.value !== 'global#fetch')) {
      failures.push(`${location}: unsupported call trigger ${JSON.stringify(trigger.value)}. Use an inspected module#export (e.g. react#useEffect) or global#fetch; injected/local method meaning needs a cited semantic trigger. Matching synthetic signals alone does not validate code extraction.`);
    }
  };
  for (const entry of index.entries) for (const trigger of entry.triggers ?? []) check(trigger, entry.id);
  for (const [i, item] of (index.triggerChecks ?? []).entries()) for (const trigger of item.signals) check(trigger, `triggerChecks[${i}]`);
  return failures;
}

const ignoredWords = new Set(["the", "and", "for", "with", "this", "that", "in", "on", "at", "to", "of", "is", "are", "a", "an",
  "implement", "approved", "task", "md", "please", "현재", "기능", "분석", "개선", "해주세요"]);
export function terms(value: string): string[] {
  return [...new Set(value.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase().split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word.length > 1 && !ignoredWords.has(word)))];
}
function matches(token: string, words: string[]): boolean {
  return words.some((word) => word === token ||
    (/[가-힣]/.test(token) && /[가-힣]/.test(word) && (word.startsWith(token) || token.startsWith(word))));
}

export function searchReferenceIndex(index: ReferenceIndex, query: string, technologies: string[] = [], limit = 5) {
  const tokens = terms(query);
  const tech = technologies.map(technologyKey);
  // ponytail: lexical metadata ranking; semantic conditions remain a host judgment.
  const candidates = index.entries.filter((entry) => {
    if (entry.routing?.mode === "deferred") return false;
    if (entry.excludedTechnologies.some((value) => tech.includes(technologyKey(value)))) return false;
    return !tech.length || !entry.technologies.length || entry.technologies.some((value) => tech.includes(technologyKey(value)));
  }).map((entry) => ({ entry, title: terms(entry.title), keywords: terms(entry.keywords.join(" ")), summary: terms(entry.summary) }));
  const frequency = new Map(tokens.map((token) => [token,
    candidates.filter(({ title, keywords, summary }) => matches(token, [...title, ...keywords, ...summary])).length]));
  const ranked = candidates.map(({ entry, title, keywords, summary }) => {
    const matchedTerms = tokens.filter((token) => matches(token, [...title, ...keywords, ...summary]));
    const score = matchedTerms.reduce((sum, token) => sum +
      (matches(token, title) ? 3 : matches(token, keywords) ? 2 : 1) *
      (1 + Math.log((candidates.length + 1) / ((frequency.get(token) ?? 0) + 1))), 0);
    const { sources: _sources, ...metadata } = entry;
    void _sources;
    return { ...metadata, score, matchedTerms, applicability: "candidate-needs-context-review" as const };
  }).filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  // ponytail: relative lexical cutoff removes weak tail hits; not a semantic confidence score.
  return ranked.filter((entry) => entry.score >= (ranked[0]?.score ?? 0) * 0.4)
    .slice(0, Math.max(1, Math.min(20, limit)));
}

export function evaluateRetrievalChecks(index: ReferenceIndex) {
  return (index.retrievalChecks ?? []).map((check) => {
    const ids = searchReferenceIndex(index, check.query, check.technologies).map(({ id }) => id);
    return { ...check, ids, passed: check.expectedIds.every((id) => ids.includes(id)) &&
      check.forbiddenIds.every((id) => !ids.includes(id)) && (!check.expectEmpty || ids.length === 0) };
  });
}

export async function readIndexedReference(root: string, id: string, offset = 0, limit = 6000) {
  const entry = (await readReferenceIndex(root))?.entries.find((entry) => entry.id === id);
  if (!entry) throw new Error(`Unknown indexed knowledge: ${id}`);
  const body = await confinedRead(root, entry.path);
  if (contentHash(body) !== entry.contentHash) throw new Error(`Reference changed; resync required: ${id}`);
  const start = Math.max(0, offset);
  const end = start + Math.max(1, Math.min(12000, limit));
  return { entry, content: body.slice(start, end), totalCharacters: body.length, nextOffset: end < body.length ? end : null };
}
