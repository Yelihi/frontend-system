import { createHash } from "node:crypto";
import { readFile, realpath } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import * as z from "zod/v4";

const text = z.string().min(1).max(600);
const id = z.string().regex(/^[a-z0-9][a-z0-9._-]*$/);
const hash = z.string().regex(/^[a-f0-9]{64}$/);
export const referenceIndexSchema = z.object({
  version: z.literal(1),
  entries: z.array(z.object({
    id, kind: z.enum(["concept", "decision"]), title: text, summary: text,
    path: text, contentHash: hash,
    keywords: z.array(text).max(30), domains: z.array(text).max(15),
    technologies: z.array(text).max(15), excludedTechnologies: z.array(text).max(15),
    conditions: z.array(text).max(15), exclusions: z.array(text).max(15),
    evidenceKind: z.enum(["public-contract", "implementation", "experience", "hypothesis"]),
    review: z.enum(["reviewed", "uncertain"]),
    sources: z.record(id, hash), related: z.array(id).max(15),
  })).max(10000),
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
    if (!Object.keys(entry.sources).length) throw new Error(`Missing source evidence: ${entry.id}`);
    if (entry.related.some((related) => !ids.has(related))) throw new Error(`Unknown related knowledge: ${entry.id}`);
  }
  return index;
}

export function searchReferenceIndex(index: ReferenceIndex, query: string, technologies: string[] = [], limit = 5) {
  const tokens = [...new Set(query.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((word) => word.length > 1))];
  const tech = technologies.map(technologyKey);
  // ponytail: linear metadata scan; add an inverted index if measured search latency warrants it.
  return index.entries.filter((entry) => {
    if (entry.excludedTechnologies.some((value) => tech.includes(technologyKey(value)))) return false;
    return !tech.length || !entry.technologies.length || entry.technologies.some((value) => tech.includes(technologyKey(value)));
  }).map((entry) => {
    const haystack = `${entry.title} ${entry.summary} ${entry.keywords.join(" ")}`.toLowerCase();
    const score = tokens.filter((token) => haystack.includes(token)).length;
    const { contentHash: _hash, sources: _sources, ...metadata } = entry;
    void _hash; void _sources;
    return { ...metadata, score };
  }).filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .slice(0, Math.max(1, Math.min(20, limit)));
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
