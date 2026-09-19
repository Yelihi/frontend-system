import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { isAbsolute, join, relative, resolve } from "node:path";

import { confinedRead, readReferenceIndex, contentHash as referenceHash, type ReferenceIndex } from "./reference-index.js";

import { terms } from "./knowledge-resolver.js";
import { readRuleProposal } from "./rule-proposals.js";

export type KnowledgeSourceType = "manual" | "imported" | "attachment";

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
        else if (entry.isFile() && entry.name.endsWith(".md")) found.push(relative(root, path));
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
  if (isAbsolute(path) || (absolute !== sourceRoot && !absolute.startsWith(`${sourceRoot}/`))) {
    throw new Error("Knowledge path must be relative and inside knowledge/source.");
  }
  return absolute;
}

export async function catalogKnowledgeDocument(
  root: string,
  input: Omit<KnowledgeDocument, "contentHash" | "updatedAt" | "publishedHash">,
): Promise<{ document: KnowledgeDocument; duplicateOf?: string }> {
  const contentHash = digest(await readFile(sourcePath(root, input.path), "utf8"));
  const catalog = await loadKnowledgeCatalog(root);
  const duplicate = Object.values(catalog.documents).find(
    (document) => document.contentHash === contentHash && document.id !== input.id,
  );
  if (duplicate) return { document: duplicate, duplicateOf: duplicate.id };

  const previous = catalog.documents[input.id];
  const document: KnowledgeDocument = {
    ...input,
    contentHash,
    ...(previous?.publishedHash ? { publishedHash: previous.publishedHash } : {}),
    updatedAt: new Date().toISOString(),
  };
  catalog.documents[input.id] = document;
  for (const [facet, values] of Object.entries(input.facets)) {
    catalog.facets[facet] = [...new Set([...(catalog.facets[facet] ?? []), ...values])].sort();
  }
  await saveKnowledgeCatalog(root, catalog);
  return { document };
}

export async function knowledgeStatus(root: string): Promise<{
  uncataloged: string[];
  changed: string[];
  unpublished: string[];
  deleted: string[];
  affectedReferences: string[];
  outcomes: ReferenceIndex["outcomes"];
  ruleProposals: Array<{ id: string; status: "approved" | "pending" | "stale"; hash?: string; reason?: string }>;
}> {
  const catalog = await loadKnowledgeCatalog(root);
  const files = await sourceFiles(root);
  const byPath = new Map(Object.values(catalog.documents).map((document) => [document.path, document]));
  const actual = new Map<string, string>();
  const changed: string[] = [];
  for (const path of files) {
    const hash = digest(await readFile(join(root, path), "utf8"));
    actual.set(path, hash);
    const document = byPath.get(path);
    if (document && hash !== document.contentHash) changed.push(path);
  }
  const index = await readReferenceIndex(join(root, "references", "learned"));
  const affectedReferences = (index?.entries ?? []).filter((entry) => Object.entries(entry.sources).some(([id, hash]) => {
    const document = catalog.documents[id];
    return !document || actual.get(document.path) !== hash;
  })).map((entry) => entry.id);
  const affected = new Set(affectedReferences);
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
      if (!affected.has(entry.id) && entry.related.some((id) => affected.has(id))) {
        affected.add(entry.id); expanded = true;
      }
    }
  }
  return {
    deleted: Object.values(catalog.documents).filter((document) => !files.includes(document.path)).map((document) => document.id),
    affectedReferences: [...affected],
    outcomes: index?.outcomes ?? [],
    ruleProposals,
    uncataloged: files.filter((path) => !byPath.has(path)),
    changed,
    unpublished: Object.values(catalog.documents)
      .filter((document) => document.contentHash !== document.publishedHash || index?.outcomes.some((item) => item.sourceId === document.id && item.action === "deferred"))
      .map((document) => document.id)
      .sort(),
  };
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

export async function markKnowledgeSynced(root: string, ids: string[]): Promise<KnowledgeDocument[]> {
  const catalog = await loadKnowledgeCatalog(root);
  const updated: KnowledgeDocument[] = [];
  const learnedRoot = join(root, "references", "learned");
  const index = await readReferenceIndex(learnedRoot);
  if (!index) throw new Error("Publish references/learned/index.json before marking sources synced.");
  for (const entry of index.entries) {
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
      if (!source || digest(await confinedRead(join(root, "knowledge", "source"), relative(join(root, "knowledge", "source"), sourcePath(root, source.path)))) !== hash) {
        throw new Error(`Stale reference source: ${entry.id}/${sourceId}`);
      }
    }
  }
  for (const id of ids) {
    const document = catalog.documents[id];
    if (!document) throw new Error(`Unknown knowledge document: ${id}`);
    if (digest(await readFile(sourcePath(root, document.path), "utf8")) !== document.contentHash) throw new Error(`Recatalog changed source: ${id}`);
    const outcome = index.outcomes.find((item) => item.sourceId === id && item.sourceHash === document.contentHash);
    if (!outcome) throw new Error(`Missing current sync outcome: ${id}`);
    if (outcome.action === "deferred") throw new Error(`Deferred source cannot be marked published: ${id}`);
    if (outcome.action === "represented" && !index.entries.some((entry) => entry.sources[id] === document.contentHash)) throw new Error(`Missing source representation: ${id}`);
    document.publishedHash = document.contentHash;
    updated.push(document);
  }
  await saveKnowledgeCatalog(root, catalog);
  return updated;
}
