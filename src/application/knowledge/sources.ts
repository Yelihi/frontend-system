import { execFile } from "node:child_process";
import { lookup } from "node:dns/promises";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, mkdtemp, readFile, realpath, rename, rm, writeFile } from "node:fs/promises";
import { isIP } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import * as z from "zod/v4";
import { ruleId } from "../policy.js";
import { loadKnowledgeCatalog } from "./catalog.js";

const hash = (text: string) => createHash("sha256").update(text).digest("hex");
const run = promisify(execFile);
const sourcesSchema = z.record(ruleId, z.url());
const snapshotSchema = z.object({
  url: z.string(), checkedAt: z.string(), body: z.string(), hash: z.string(),
  reviewedBody: z.string().optional(), reviewedHash: z.string().optional(),
  etag: z.string().optional(), lastModified: z.string().optional(), diff: z.string(),
});
type Snapshot = z.infer<typeof snapshotSchema>;

async function optional(path: string) {
  try { return await readFile(path, "utf8"); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return ""; throw error; }
}

export async function sourceRegistry(root: string) {
  const raw = await optional(join(root, "knowledge/sources.json"));
  return { sources: raw ? sourcesSchema.parse(JSON.parse(raw)) : {}, hash: raw ? hash(raw) : null };
}

export async function registerSource(root: string, id: string, url: string, expectedHash: string | null) {
  ruleId.parse(id); validateUrl(url);
  const folder = join(root, "knowledge");
  await mkdir(folder, { recursive: true });
  if (await realpath(folder) !== join(await realpath(root), "knowledge")) throw new Error("Knowledge directory must not be a symlink");
  const lock = join(folder, ".sources-lock");
  await mkdir(lock);
  try {
    const current = await sourceRegistry(root);
    if (current.hash !== expectedHash) throw new Error("Source registry changed; reread it");
    await replace(join(folder, "sources.json"), `${JSON.stringify({ ...current.sources, [id]: url }, null, 2)}\n`);
    return sourceRegistry(root);
  } finally { await rm(lock, { recursive: true }); }
}

async function replace(path: string, data: string) {
  const temp = `${path}.${randomUUID()}.tmp`;
  try { await writeFile(temp, data, { flag: "wx" }); await rename(temp, path); }
  finally { await rm(temp, { force: true }); }
}

async function cacheFolder(root: string) {
  const folder = join(root, "knowledge/.cache/sources");
  await mkdir(folder, { recursive: true });
  if (await realpath(folder) !== join(await realpath(root), "knowledge/.cache/sources")) throw new Error("Source cache must not traverse symlinks");
  return folder;
}

function privateAddress(address: string) {
  const value = address.replace(/^\[|\]$/g, "").toLowerCase();
  if (value.includes(":")) return value === "::" || value === "::1" || /^(fc|fd|fe[89ab]|ff)/.test(value) || value.startsWith("::ffff:");
  return /^(0|10|127|169\.254|192\.168|172\.(1[6-9]|2\d|3[01])|22[4-9]|23\d|24\d|25[0-5])\./.test(value) || value.startsWith("100.64.");
}

function validateUrl(input: string) {
  const url = new URL(input);
  if (url.protocol !== "https:" || url.username || url.password || url.port && url.port !== "443" || url.hostname === "localhost" || url.hostname.endsWith(".local") || privateAddress(url.hostname)) throw new Error("Use a public HTTPS documentation URL without credentials");
  return url;
}

async function boundedText(response: Response) {
  const limit = 2 * 1024 * 1024;
  if (Number(response.headers.get("content-length")) > limit) throw new Error("Document exceeds 2 MiB; select a narrower source");
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Empty document response");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) throw new Error("Document exceeds 2 MiB; select a narrower source");
      chunks.push(value);
    }
  } finally { await reader.cancel(); }
  return Buffer.concat(chunks).toString("utf8").replace(/\r\n/g, "\n");
}

async function documentDiff(before: string | undefined, after: string) {
  if (before === undefined) return `Initial source; review before adopting rules.\n\n${after}`;
  if (before === after) return "";
  const temp = await mkdtemp(join(tmpdir(), "fs-source-diff-"));
  try {
    await writeFile(join(temp, "previous.md"), before);
    await writeFile(join(temp, "current.md"), after);
    try { return (await run("git", ["diff", "--no-index", "--no-ext-diff", "--no-color", "--unified=4", "previous.md", "current.md"], { cwd: temp, maxBuffer: 6 * 1024 * 1024 })).stdout; }
    catch (error) {
      const result = error as { code?: number; stdout?: string };
      if (result.code === 1 && typeof result.stdout === "string") return result.stdout;
      throw error;
    }
  } finally { await rm(temp, { recursive: true, force: true }); }
}

// Dependency injection is confined to network tests; production always uses fetch + DNS.
export async function checkSources(root: string, ids?: string[], transport = fetch, resolveHost = (hostname: string) => lookup(hostname, { all: true })) {
  const registry = await sourceRegistry(root);
  const selected = ids ?? Object.keys(registry.sources);
  if (selected.some((id) => !registry.sources[id])) throw new Error("Select registered source IDs");
  const folder = await cacheFolder(root);
  const results = [];
  for (const id of selected) {
    ruleId.parse(id);
    const sourceUrl = registry.sources[id]!;
    const path = join(folder, `${id}.json`);
    const lock = `${path}.lock`;
    let acquired = false;
    try {
      await mkdir(lock); acquired = true;
      const raw = await optional(path);
      const saved = raw ? snapshotSchema.parse(JSON.parse(raw)) : undefined;
      const previous = saved?.url === sourceUrl ? saved : undefined;
      let url = validateUrl(sourceUrl);
      let response: Response | undefined;
      for (let redirects = 0; redirects <= 5; redirects++) {
        const addresses = isIP(url.hostname) ? [{ address: url.hostname }] : await resolveHost(url.hostname);
        if (!addresses.length || addresses.some(({ address }) => privateAddress(address))) throw new Error("Documentation address is not public");
        const headers: Record<string, string> = { Accept: "text/markdown, text/plain;q=0.9, text/html;q=0.5" };
        if (redirects === 0 && previous?.etag) headers["If-None-Match"] = previous.etag;
        else if (redirects === 0 && previous?.lastModified) headers["If-Modified-Since"] = previous.lastModified;
        response = await transport(url, { headers, redirect: "manual", signal: AbortSignal.timeout(20_000) });
        if (![301, 302, 303, 307, 308].includes(response.status)) break;
        const location = response.headers.get("location");
        await response.body?.cancel();
        if (!location || redirects === 5) throw new Error("Invalid or excessive documentation redirects");
        url = validateUrl(new URL(location, url).href);
      }
      if (!response) throw new Error("No response");
      let next: Snapshot;
      if (response.status === 304) {
        if (!previous) throw new Error("304 without cached source");
        next = { ...previous, checkedAt: new Date().toISOString() };
      } else {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const type = response.headers.get("content-type") ?? "";
        if (!/text\/(plain|markdown)|application\/(x-)?markdown/.test(type)) {
          await response.body?.cancel();
          results.push({ id, url: sourceUrl, status: "needs-host", reason: "Use the host browser to inspect HTML/PDF or register an official Markdown source. Previous capture preserved." });
          continue;
        }
        const body = await boundedText(response);
        if (!body.trim() || /^\s*(<!doctype html|<html)/i.test(body)) throw new Error("Unexpected empty/HTML body; previous capture preserved");
        next = {
          url: sourceUrl, checkedAt: new Date().toISOString(), body, hash: hash(body),
          ...(previous?.reviewedBody !== undefined ? { reviewedBody: previous.reviewedBody, reviewedHash: previous.reviewedHash } : {}),
          ...(response.headers.get("etag") ? { etag: response.headers.get("etag")! } : {}),
          ...(response.headers.get("last-modified") ? { lastModified: response.headers.get("last-modified")! } : {}),
          diff: await documentDiff(previous?.reviewedBody, body),
        };
      }
      await replace(path, JSON.stringify(next));
      results.push({ id, url: sourceUrl, status: next.hash === next.reviewedHash ? "unchanged" : "pending-review", hash: next.hash, checkedAt: next.checkedAt, sourceCharacters: next.body.length, reviewCharacters: next.diff.length });
    } catch (error) {
      results.push({ id, url: sourceUrl, status: "failed", reason: error instanceof Error ? error.message : String(error) });
    } finally { if (acquired) await rm(lock, { recursive: true }); }
  }
  return results;
}

export async function readSourceChange(root: string, id: string, offset = 0, limit = 12000, full = false, expectedHash?: string) {
  ruleId.parse(id);
  const record = snapshotSchema.parse(JSON.parse(await readFile(join(await cacheFolder(root), `${id}.json`), "utf8")));
  if ((await sourceRegistry(root)).sources[id] !== record.url || expectedHash && record.hash !== expectedHash) throw new Error("Source changed; restart review");
  const content = full ? record.body : record.diff;
  const start = Math.max(0, offset); const end = start + Math.max(1, Math.min(12000, limit));
  return { id, hash: record.hash, content: content.slice(start, end), totalCharacters: content.length, returnedCharacters: content.slice(start, end).length, nextOffset: end < content.length ? end : null };
}

export async function acknowledgeSource(root: string, id: string, expectedHash: string, sourceId: string) {
  ruleId.parse(id);
  const path = join(await cacheFolder(root), `${id}.json`);
  const lock = `${path}.lock`;
  await mkdir(lock);
  try {
    const current = snapshotSchema.parse(JSON.parse(await readFile(path, "utf8")));
    if (current.hash !== expectedHash || (await sourceRegistry(root)).sources[id] !== current.url) throw new Error("Source changed; review again");
    const source = (await loadKnowledgeCatalog(root)).documents[sourceId];
    if (!source || source.remoteHash !== expectedHash || source.sourceUrl !== current.url || source.publishedHash !== source.contentHash) throw new Error("Publish the reviewed source with its remoteHash before acknowledging");
    await replace(path, JSON.stringify({ ...current, reviewedBody: current.body, reviewedHash: current.hash, diff: "" }));
    return { id, reviewedHash: current.hash };
  } finally { await rm(lock, { recursive: true }); }
}
