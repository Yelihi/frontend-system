import { createHash, randomUUID } from "node:crypto";
import { copyFile, mkdir, readFile, readdir, realpath, rm, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import * as z from "zod/v4";

import { confinedRead, readReferenceIndex, contentHash as referenceHash, evaluateRetrievalChecks, evaluateTriggerChecks, triggerPublicationFailures, technologyKey, type ReferenceIndex } from "./reference-index.js";

import { terms } from "./knowledge-resolver.js";
import { readRuleProposal } from "./rule-proposals.js";
import { pendingNote, sourceSelection } from "./source-state.js";

export type KnowledgeSourceType = "manual" | "imported" | "attachment";

const reviewText = z.string().trim().min(1).max(1200);
export const sourceReviewInputSchema = z.object({
  status: z.enum(["on-review", "approved", "changes-requested"]),
  reviewer: z.enum(["host", "user"]), summary: reviewText,
  scope: reviewText,
  claims: z.array(z.object({ quote: reviewText, assessment: reviewText, evidence: reviewText,
    verdict: z.enum(["supported", "qualified", "unsupported", "unverified"]) })).max(100),
  conditions: z.array(reviewText).max(30), exclusions: z.array(reviewText).max(30),
  unresolved: z.array(reviewText).max(30),
}).refine((review) => review.status !== "approved" || (review.claims.length > 0 && review.conditions.length > 0 &&
  review.exclusions.length > 0 && !review.unresolved.length && review.claims.every((claim) =>
    claim.verdict === "supported" || claim.verdict === "qualified")), "Approval needs supported/qualified claims, conditions, exclusions and no unresolved questions");
type SourceReview = z.infer<typeof sourceReviewInputSchema> & { sourceHash: string; metadataHash: string; reviewedAt: string };
type SourceReviewStatus = SourceReview["status"] | "stale" | "legacy-unreviewed";

export interface KnowledgeDocument {
  id: string;
  path: string;
  title: string;
  summary: string;
  sourceType: KnowledgeSourceType;
  sourceUrl?: string;
  remoteHash?: string;
  contentHash: string;
  publishedHash?: string;
  publishedArtifactsHash?: string;
  sourceReview?: SourceReview;
  facets: Record<string, string[]>;
  updatedAt: string;
}

export interface KnowledgeCatalog {
  version: 1;
  facets: Record<string, string[]>;
  documents: Record<string, KnowledgeDocument>;
}

const emptyCatalog = (): KnowledgeCatalog => ({ version: 1, facets: {}, documents: {} });

function digest(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

async function sourceFiles(root: string): Promise<string[]> {
  const sourceRoot = join(root, "knowledge", "source");
  const found: string[] = [];
  const visit = async (directory: string): Promise<void> => {
    try {
      for (const entry of await readdir(directory, { withFileTypes: true })) {
        const path = join(directory, entry.name);
        if (entry.isDirectory()) await visit(path);
        else if (entry.isFile() && entry.name.endsWith(".md") && path !== join(sourceRoot, "template.md")) found.push(relative(root, path));
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  };
  await visit(sourceRoot);
  return found.sort();
}

export async function loadKnowledgeCatalog(root: string): Promise<KnowledgeCatalog> {
  try {
    return JSON.parse(await readFile(join(root, "knowledge", "catalog.json"), "utf8")) as KnowledgeCatalog;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return emptyCatalog();
    throw error;
  }
}

async function saveKnowledgeCatalog(root: string, catalog: KnowledgeCatalog): Promise<void> {
  await mkdir(join(root, "knowledge"), { recursive: true });
  await writeFile(join(root, "knowledge", "catalog.json"), `${JSON.stringify(catalog, null, 2)}\n`);
}

function sourcePath(root: string, path: string): string {
  const sourceRoot = resolve(root, "knowledge", "source");
  const absolute = resolve(root, path);
  if (absolute === join(sourceRoot, "template.md")) throw new Error("Knowledge template is not source material; copy it into source/manual first.");
  if (isAbsolute(path) || (absolute !== sourceRoot && !absolute.startsWith(`${sourceRoot}/`))) {
    throw new Error("Knowledge path must be relative and inside knowledge/source.");
  }
  return absolute;
}

function readSource(root: string, path: string) {
  const sourceRoot = join(root, "knowledge/source");
  return confinedRead(sourceRoot, relative(sourceRoot, sourcePath(root, path)));
}

async function knowledgeDirectory(root: string, path: string) {
  let directory = await realpath(root);
  for (const part of path.split("/")) {
    directory = join(directory, part);
    await mkdir(directory, {recursive: true});
    if (await realpath(directory) !== directory) throw new Error("Knowledge directory must not traverse symlinks");
  }
}

function sourceMetadataHash(document: KnowledgeDocument) {
  return digest(JSON.stringify([document.path, document.title, document.summary, document.sourceType,
    document.sourceUrl ?? null, document.remoteHash ?? null, document.facets]));
}

function sourceReviewState(document: KnowledgeDocument, actualHash: string | undefined): SourceReviewStatus {
  if (actualHash !== document.contentHash) return "stale";
  if (!document.sourceReview) return document.publishedHash ? "legacy-unreviewed" : "on-review";
  if (!sourceReviewInputSchema.safeParse(document.sourceReview).success) return "stale";
  if (document.sourceReview.sourceHash !== actualHash || document.sourceReview.metadataHash !== sourceMetadataHash(document)) return "stale";
  return document.sourceReview.status;
}

function lifecycle(document: KnowledgeDocument, body: string): "pending" | "active" | "merged" | "legacy" {
  const selection = sourceSelection(body);
  if (!selection) return "legacy";
  if (selection === "pending") return "pending";
  return sourceReviewState(document, digest(body)) === "approved" ? "merged" : "active";
}

export async function readKnowledgeDocument(root: string, id: string, offset = 0, limit = 6000, expectedSourceHash?: string) {
  const catalog = await loadKnowledgeCatalog(root);
  const document = Object.hasOwn(catalog.documents, id) ? catalog.documents[id] : undefined;
  if (!document) throw new Error(`Unknown knowledge document: ${id}`);
  const body = await readSource(root, document.path);
  const sourceHash = digest(body);
  if ((offset > 0 && !expectedSourceHash) || (expectedSourceHash && expectedSourceHash !== sourceHash)) throw new Error("Source changed or page hash missing; restart reading");
  const start = Math.max(0, offset), end = start + Math.max(1, Math.min(12000, limit));
  return { document, sourceHash, state: lifecycle(document, body), metadataHash: sourceMetadataHash(document), reviewStatus: sourceReviewState(document, sourceHash),
    reviewHash: document.sourceReview ? digest(JSON.stringify(document.sourceReview)) : null,
    content: body.slice(start, end), totalCharacters: body.length, nextOffset: end < body.length ? end : null };
}

export async function reviewKnowledgeSource(root: string, id: string, expectedSourceHash: string, expectedMetadataHash: string, expectedReviewHash: string | null,
  input: z.input<typeof sourceReviewInputSchema>) {
  const review = sourceReviewInputSchema.parse(input);
  const catalog = await loadKnowledgeCatalog(root);
  const document = Object.hasOwn(catalog.documents, id) ? catalog.documents[id] : undefined;
  if (!document) throw new Error(`Unknown knowledge document: ${id}`);
  const body = await readSource(root, document.path);
  if (sourceSelection(body) === "pending") throw new Error("Pending knowledge is storage only; the user must set state: active before review");
  if (document.contentHash !== expectedSourceHash || digest(body) !== expectedSourceHash) throw new Error("Source changed; recatalog and review current content");
  if (sourceMetadataHash(document) !== expectedMetadataHash) throw new Error("Source metadata changed; reread before reviewing");
  if ((document.sourceReview ? digest(JSON.stringify(document.sourceReview)) : null) !== expectedReviewHash) throw new Error("Source review changed; reread before saving");
  if (review.claims.some((claim) => !body.includes(claim.quote))) throw new Error("Review quotes must exist in the source document");
  document.sourceReview = { ...review, sourceHash: expectedSourceHash, metadataHash: sourceMetadataHash(document), reviewedAt: new Date().toISOString() };
  await saveKnowledgeCatalog(root, catalog);
  return { id, status: review.status, state: lifecycle(document, body), reviewHash: digest(JSON.stringify(document.sourceReview)),
    authority: `${review.reviewer} semantic review; not automatic fact certification or publication` };
}

export async function catalogKnowledgeDocument(
  root: string,
  input: Omit<KnowledgeDocument, "contentHash" | "updatedAt" | "publishedHash" | "publishedArtifactsHash" | "sourceReview">,
): Promise<{ document: KnowledgeDocument; duplicateOf?: string }> {
  const contentHash = digest(await readSource(root, input.path));
  const catalog = await loadKnowledgeCatalog(root);
  for (const document of Object.values(catalog.documents)) {
    if (document.id === input.id || document.contentHash !== contentHash || document.sourceUrl !== input.sourceUrl || document.remoteHash !== input.remoteHash) continue;
    try {
      if (digest(await readSource(root, document.path)) === contentHash) return { document, duplicateOf: document.id };
    } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
  }

  const previous = catalog.documents[input.id];
  const sameProvenance = previous?.sourceUrl === input.sourceUrl && previous?.remoteHash === input.remoteHash;
  const document: KnowledgeDocument = {
    ...input,
    contentHash,
    ...(sameProvenance && previous?.publishedHash ? { publishedHash: previous.publishedHash } : {}),
    ...(sameProvenance && previous?.publishedArtifactsHash ? { publishedArtifactsHash: previous.publishedArtifactsHash } : {}),
    ...(previous?.sourceReview ? { sourceReview: previous.sourceReview } : {}),
    updatedAt: new Date().toISOString(),
  };
  catalog.documents[input.id] = document;
  for (const [facet, values] of Object.entries(input.facets)) {
    catalog.facets[facet] = [...new Set([...(catalog.facets[facet] ?? []), ...values])].sort();
  }
  await saveKnowledgeCatalog(root, catalog);
  return { document };
}

export const knowledgeNoteSchema = z.object({
  title: z.string().trim().min(1).max(200), content: z.string().trim().min(1).max(100_000),
});

export async function addKnowledgeNote(root: string, input: z.input<typeof knowledgeNoteSchema>) {
  const note = knowledgeNoteSchema.parse(input);
  const body = pendingNote(`${note.content}\n`);
  for (const document of Object.values((await loadKnowledgeCatalog(root)).documents)) {
    if (document.sourceType !== "manual" || document.sourceUrl) continue;
    try {
      const existing = await readSource(root, document.path);
      let comparable: string;
      try { comparable = pendingNote(existing); }
      catch { continue; } // Invalid metadata is reported by status; it cannot block unrelated add.
      if (comparable === body)
        return {document, duplicateOf: document.id, status: "Existing note retained; selection unchanged"};
    } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
  }
  const id = `note-${randomUUID()}`;
  await knowledgeDirectory(root, "knowledge/source/manual");
  const path = `knowledge/source/manual/${id}.md`;
  await writeFile(join(root, path), body, { flag: "wx" });
  try {
    const result = await catalogKnowledgeDocument(root, { id, path, title: note.title, summary: note.content.slice(0, 200), sourceType: "manual", facets: {} });
    if (result.duplicateOf) await rm(join(root, path));
    return { ...result, status: "pending; user selects state: active before preparation and review" };
  } catch (error) { await rm(join(root, path)); throw error; }
}

/** Move only author-selected notes. Semantic preparation belongs to the host skill. */
export async function prepareActiveKnowledge(root: string) {
  const prepared: Array<{id: string; path: string; previousPath: string; moved: boolean}> = [];
  const errors: Array<{path: string; message: string}> = [];
  for (const path of await sourceFiles(root)) {
    try {
      const body = await readSource(root, path);
      if (sourceSelection(body) !== "active") continue;
      const catalog = await loadKnowledgeCatalog(root);
      const prior = Object.values(catalog.documents).find(document => document.path === path);
      // Merged sources need no mechanical move or model preparation until changed.
      if (prior && lifecycle(prior, body) === "merged") continue;
      const input = { id: prior?.id ?? `note-${randomUUID()}`, path,
        title: prior?.title ?? body.match(/^#\s+(.+)$/m)?.[1] ?? path,
        summary: prior?.summary ?? "User-selected knowledge; host preparation pending",
        sourceType: prior?.sourceType ?? "manual" as const, facets: prior?.facets ?? {},
        ...(prior?.sourceUrl ? {sourceUrl: prior.sourceUrl} : {}),
        ...(prior?.remoteHash ? {remoteHash: prior.remoteHash} : {}),
      };
      const target = path.startsWith("knowledge/source/active/") ? path
        : `knowledge/source/active/${relative("knowledge/source", path)}`;
      if (target !== path) {
        await knowledgeDirectory(root, dirname(target));
        await copyFile(join(root, path), join(root, target), constants.COPYFILE_EXCL);
      }
      let saved;
      try {
        if (await readSource(root, path) !== body || await readSource(root, target) !== body) throw new Error("Source changed during active preparation; retry after inspecting both paths");
        saved = await catalogKnowledgeDocument(root, {...input, path: target});
        if (saved.duplicateOf) throw new Error(`Duplicate source ${saved.duplicateOf}; original retained, resolve explicitly`);
      } catch (error) {
        if (target !== path && await readSource(root, target) === body) await rm(join(root, target));
        throw error;
      }
      if (target !== path) {
        if (await readSource(root, path) !== body) throw new Error(`Original changed after catalog update; retained both paths (${target})`);
        await rm(join(root, path));
      }
      prepared.push({id: saved.document.id, path: target, previousPath: path, moved: target !== path});
    } catch (error) {
      errors.push({path, message: error instanceof Error ? error.message : String(error)});
    }
  }
  return {prepared, errors, authority: "Moved user-selected notes only; no semantic review, approval or publication"};
}

export async function selectMergedKnowledge(root: string, ids?: string[]) {
  const status = await knowledgeStatus(root);
  const selected = ids ?? status.syncReady.filter(id => status.unpublished.includes(id));
  if (new Set(selected).size !== selected.length) throw new Error("Select distinct knowledge IDs");
  for (const id of selected) if (!status.syncReady.includes(id)) throw new Error(`Knowledge must be merged with current review evidence before sync: ${id}`);
  return selected;
}

export async function knowledgeStatus(root: string): Promise<{
  uncataloged: string[];
  changed: string[];
  unpublished: string[];
  deleted: string[];
  affectedReferences: string[];
  outcomes: ReferenceIndex["outcomes"];
  ruleProposals: Array<{ id: string; status: "approved" | "pending" | "stale"; hash?: string; reason?: string }>;
  routing: Record<"direct" | "supporting" | "deferred" | "unmigrated" | "withoutInvestigation", string[]>;
  sourceReviews: Record<SourceReviewStatus, string[]>;
  lifecycle: Record<"pending" | "active" | "merged" | "legacy" | "invalid", string[]>;
  syncReady: string[];
  stateErrors: Array<{path: string; message: string}>;
}> {
  const catalog = await loadKnowledgeCatalog(root);
  const files = await sourceFiles(root);
  const byPath = new Map(Object.values(catalog.documents).map((document) => [document.path, document]));
  const actual = new Map<string, string>();
  const changed: string[] = [];
  const states: Record<"pending" | "active" | "merged" | "legacy" | "invalid", string[]> = { pending: [], active: [], merged: [], legacy: [], invalid: [] };
  const stateErrors: Array<{path: string; message: string}> = [];
  for (const path of files) {
    const body = await readSource(root, path);
    const hash = digest(body);
    actual.set(path, hash);
    const document = byPath.get(path);
    if (document && hash !== document.contentHash) changed.push(path);
    try {
      const state = document ? lifecycle(document, body) : sourceSelection(body) ?? "legacy";
      states[state].push(document?.id ?? path);
    } catch (error) {
      states.invalid.push(document?.id ?? path);
      stateErrors.push({path, message: error instanceof Error ? error.message : String(error)});
    }
  }
  const index = await readReferenceIndex(join(root, "references", "learned"));
  const affectedReferences = (index?.entries ?? []).filter((entry) => Object.entries(entry.sources).some(([id, hash]) => {
    const document = catalog.documents[id];
    return !document || actual.get(document.path) !== hash;
  })).map((entry) => entry.id);
  const affected = new Set(affectedReferences);
  for (const entry of index?.entries ?? []) {
    try { if (digest(await confinedRead(join(root, "references/learned"), entry.path)) !== entry.contentHash) affected.add(entry.id); }
    catch { affected.add(entry.id); }
  }
  const ruleProposals: Array<{ id: string; status: "approved" | "pending" | "stale"; hash?: string; reason?: string }> = [];
  let proposalFiles: string[] = [];
  try { proposalFiles = await readdir(join(root, "knowledge/proposals")); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
  for (const file of proposalFiles.filter((file) => file.endsWith(".json")).sort()) {
    const id = file.slice(0, -5);
    try {
      const proposal = await readRuleProposal(root, id);
      ruleProposals.push({ id, status: proposal.approved ? "approved" : "pending", hash: proposal.hash });
    } catch (error) { ruleProposals.push({ id, status: "stale", reason: error instanceof Error ? error.message : String(error) }); }
  }
  let expanded = true;
  while (expanded) {
    expanded = false;
    for (const entry of index?.entries ?? []) {
      if (!affected.has(entry.id) && (entry.related.some((id) => affected.has(id)) ||
        index?.entries.some((support) => support.routing?.mode === "supporting" && affected.has(support.id) && support.related.includes(entry.id)))) {
        affected.add(entry.id); expanded = true;
      }
    }
  }
  const sourceReviews: Record<SourceReviewStatus, string[]> = { "on-review": [], approved: [], "changes-requested": [], stale: [], "legacy-unreviewed": [] };
  for (const document of Object.values(catalog.documents)) sourceReviews[sourceReviewState(document, actual.get(document.path))].push(document.id);
  return {
    sourceReviews,
    lifecycle: states,
    syncReady: states.merged,
    stateErrors,
    deleted: Object.values(catalog.documents).filter((document) => !files.includes(document.path)).map((document) => document.id),
    affectedReferences: [...affected],
    outcomes: index?.outcomes ?? [],
    ruleProposals,
    uncataloged: files.filter((path) => !byPath.has(path)),
    changed,
    routing: {
      direct: index?.entries.filter((entry) => entry.routing?.mode === "direct").map(({ id }) => id) ?? [],
      supporting: index?.entries.filter((entry) => entry.routing?.mode === "supporting").map(({ id }) => id) ?? [],
      deferred: index?.entries.filter((entry) => entry.routing?.mode === "deferred").map(({ id }) => id) ?? [],
      withoutInvestigation: index?.entries.filter((entry) => entry.routing?.mode === "direct" && !entry.investigation).map(({ id }) => id) ?? [],
      unmigrated: index?.entries.filter((entry) => !entry.routing).map(({ id }) => id) ?? [],
    },
    unpublished: Object.values(catalog.documents)
      .filter((document) => document.contentHash !== document.publishedHash || actual.get(document.path) !== document.contentHash || !index || index.version < 3 ||
        (document.sourceReview && sourceReviewState(document, actual.get(document.path)) !== "approved") ||
        document.publishedArtifactsHash !== publicationHash(index, document.id, document.sourceReview) ||
        index.entries.some((entry) => entry.sources[document.id] && (affected.has(entry.id) || entry.routing?.mode === "deferred")) ||
        index.outcomes.some((item) => item.sourceId === document.id && item.action === "deferred"))
      .map((document) => document.id)
      .sort(),
  };
}

// Hash the published contract as well as the original; unrelated sources stay current.
function publicationHash(index: ReferenceIndex, sourceId: string, sourceReview?: SourceReview): string {
  const entries = index.entries.filter((entry) => entry.sources[sourceId]);
  const ids = new Set(entries.map(({ id }) => id));
  const related = index.entries.filter((entry) => entry.related.some((id) => ids.has(id)) || entries.some((item) => item.related.includes(entry.id)));
  const affected = new Set([...ids, ...related.map(({ id }) => id)]);
  return digest(JSON.stringify({ version: index.version, entries, related,
    outcome: index.outcomes.find((item) => item.sourceId === sourceId),
    cases: [...index.retrievalChecks ?? [], ...index.triggerChecks ?? []].filter((check) =>
      [...check.expectedIds, ...check.forbiddenIds].some((id) => affected.has(id))),
    ...(sourceReview ? { sourceReview } : {}),
  }));
}

export async function searchKnowledge(
  root: string,
  query: string,
  facets: Record<string, string[]> = {},
  limit = 5,
): Promise<KnowledgeDocument[]> {
  const catalog = await loadKnowledgeCatalog(root);
  const queryTerms = terms(query);
  return Object.values(catalog.documents)
    .map((document) => {
      const haystack = terms(`${document.title} ${document.summary} ${document.path}`);
      const tokenScore = queryTerms.filter((term) => haystack.includes(term)).length;
      const facetScore = Object.entries(facets).reduce(
        (score, [name, values]) => score + values.filter((value) => document.facets[name]?.includes(value)).length * 3,
        0,
      );
      return { document, score: tokenScore + facetScore };
    })
    .filter(({ score }) => score > 0 || (!queryTerms.length && !Object.keys(facets).length))
    .sort((a, b) => b.score - a.score || a.document.path.localeCompare(b.document.path))
    .slice(0, Math.max(1, Math.min(limit, 20)))
    .map(({ document }) => document);
}

export async function validateKnowledgeSync(root: string, ids: string[], requireInvestigations = false) {
  const catalog = await loadKnowledgeCatalog(root);
  const updated: KnowledgeDocument[] = [];
  const learnedRoot = join(root, "references", "learned");
  const index = await readReferenceIndex(learnedRoot);
  if (!index) throw new Error("Publish references/learned/index.json before marking sources synced.");
  const triggerFailures = triggerPublicationFailures(index);
  if (triggerFailures.length) throw new Error(`Invalid sync trigger metadata: ${triggerFailures.join('; ')}`);
  const retrievalChecks = evaluateRetrievalChecks(index);
  const triggerChecks = evaluateTriggerChecks(index);
  if (triggerChecks.some((check) => !check.passed)) throw new Error("Failed sync trigger checks");
  const failed = retrievalChecks.filter((check) => !check.passed);
  if (failed.length) throw new Error(`Failed sync retrieval checks: ${failed.map((check) => check.query).join("; ")}`);
  for (const entry of index.entries) {
    if (entry.technologies.some((technology) => entry.excludedTechnologies.some((excluded) =>
      technologyKey(technology) === technologyKey(excluded)))) throw new Error(`Conflicting technology metadata: ${entry.id}`);
    if (entry.kind === "rule") {
      const approved = await readRuleProposal(root, entry.ruleApproval!.proposalId);
      const rule = approved.proposal.rules.find(({ id }) => id === entry.id);
      if (!approved.approved || approved.hash !== entry.ruleApproval!.proposalHash || JSON.stringify(rule) !== JSON.stringify(entry.rule) || JSON.stringify(Object.entries(approved.proposal.sources).sort()) !== JSON.stringify(Object.entries(entry.sources).sort())) {
        throw new Error(`Rule does not match its approved proposal: ${entry.id}`);
      }
    }
    if (referenceHash(await confinedRead(learnedRoot, entry.path)) !== entry.contentHash) throw new Error(`Changed reference: ${entry.id}`);
    for (const [sourceId, hash] of Object.entries(entry.sources)) {
      const source = catalog.documents[sourceId];
      if (!source || source.contentHash !== hash || digest(await readSource(root, source.path)) !== hash) {
        throw new Error(`Stale reference source: ${entry.id}/${sourceId}`);
      }
    }
  }
  for (const id of ids) {
    const document = catalog.documents[id];
    if (!document) throw new Error(`Unknown knowledge document: ${id}`);
    if (digest(await readSource(root, document.path)) !== document.contentHash) throw new Error(`Recatalog changed source: ${id}`);
    const outcome = index.outcomes.find((item) => item.sourceId === id && item.sourceHash === document.contentHash);
    if (!outcome) throw new Error(`Missing current sync outcome: ${id}`);
    if (outcome.action === "deferred") throw new Error(`Deferred source cannot be marked published: ${id}`);
    if (outcome.action === "omitted" && index.entries.some((entry) => entry.sources[id] === document.contentHash)) throw new Error(`Omitted source still represented: ${id}`);
    if (outcome.action === "represented" && !index.entries.some((entry) => entry.sources[id] === document.contentHash)) throw new Error(`Missing source representation: ${id}`);
    updated.push(document);
  }
  if (index.version < 3) throw new Error("Migrate the knowledge index to v3 routing before publishing a new sync");
  for (const entry of index.entries) {
    if (entry.routing?.mode !== "direct") continue;
    if (!triggerChecks.some((check) => check.expectedIds.includes(entry.id)) ||
      !triggerChecks.some((check) => check.forbiddenIds.includes(entry.id) && check.signals.length)) {
      throw new Error(`Direct knowledge needs positive and exclusion trigger cases: ${entry.id}`);
    }
  }
  for (const id of ids) {
    if (index.entries.some((entry) => entry.sources[id] && entry.routing?.mode === "deferred")) throw new Error(`Deferred routing cannot be marked published: ${id}`);
    if (requireInvestigations && index.entries.some(entry => entry.sources[id] && entry.routing?.mode === "direct" && !entry.investigation))
      throw new Error(`Investigation specification required for selected direct knowledge: ${id}. Review concrete instructions, applicability, exclusions and preserved contracts; do not fabricate them.`);
    const source = catalog.documents[id]!;
    const selection = sourceSelection(await readSource(root, source.path));
    if (selection === "pending") throw new Error(`Source review required before sync: ${id}; pending knowledge requires user selection state: active`);
    if (sourceReviewState(source, source.contentHash) !== "approved") throw new Error(`Source review required before sync: ${id}`);
  }
  for (const entry of index.entries.filter(entry => ids.some(id => Object.hasOwn(entry.sources, id)))) {
    for (const sourceId of Object.keys(entry.sources)) {
      const source = catalog.documents[sourceId]!;
      const body = await readSource(root, source.path);
      if (sourceSelection(body) && lifecycle(source, body) !== "merged")
        throw new Error(`Shared reference requires merged source review: ${entry.id}/${sourceId}`);
    }
  }
  return { documents: updated, referenceCount: index.entries.length, retrievalChecks, triggerChecks,
    artifactsHashes: Object.fromEntries(ids.map((id) => [id, publicationHash(index, id, catalog.documents[id]!.sourceReview)])),
    warnings: [
      ...(!retrievalChecks.length ? ["No recorded retrieval cases; search suitability has not been checked."] : []),
      ...(index.entries.some((entry) => entry.triggers) && !triggerChecks.length ? ["No recorded trigger cases; routing suitability has not been checked."] : []),
      ...(index.entries.some(entry => entry.routing?.mode === "direct" && !entry.investigation) ? ["Legacy checklists without investigation remain readable; they do not certify contextual applicability. Selected MCP sync requires migration."] : []),
      ...index.entries.filter((entry) => !entry.conditions.length || !entry.exclusions.length)
        .map((entry) => `Review applicability/exclusion metadata: ${entry.id}`),
    ],
    semanticValidation: "Source support, omitted claims and applicability still require human/host review",
  };
}

export async function markKnowledgeSynced(root: string, ids: string[], requireInvestigations = false): Promise<KnowledgeDocument[]> {
  const validated = await validateKnowledgeSync(root, ids, requireInvestigations);
  const catalog = await loadKnowledgeCatalog(root);
  const index = await readReferenceIndex(join(root, "references/learned"));
  for (const document of validated.documents) {
    if (catalog.documents[document.id]?.contentHash !== document.contentHash) throw new Error(`Source catalog changed: ${document.id}`);
    if (digest(await readSource(root, document.path)) !== document.contentHash) throw new Error(`Source changed during publication: ${document.id}`);
    if (!index || publicationHash(index, document.id, catalog.documents[document.id]!.sourceReview) !== validated.artifactsHashes[document.id]) throw new Error("Knowledge artifacts changed during publication");
    catalog.documents[document.id] = { ...catalog.documents[document.id]!, publishedHash: document.contentHash,
      publishedArtifactsHash: validated.artifactsHashes[document.id]! };
  }
  await saveKnowledgeCatalog(root, catalog);
  return validated.documents.map((document) => catalog.documents[document.id]!);
}
