import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, realpath, rename, rm, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import * as z from "zod/v4";

import { FileSystemProjectDiscovery } from "../adapters/filesystem/project-discovery.js";

export const recordId = z.string().regex(/^[a-z0-9][a-z0-9-]{0,79}$/);
export const digest = (value: string) => createHash("sha256").update(value).digest("hex");
const hash = z.string().regex(/^[a-f0-9]{64}$/);
const checksSchema = z.array(z.object({
  capability: z.string(), command: z.string(), passed: z.boolean(), output: z.string(),
  status: z.enum(["passed", "failed", "not-run"]), workingDirectory: z.string().optional(), reason: z.string().optional(),
}));
export const executionSchema = z.strictObject({
  revisionHash: hash,
  status: z.enum(["in-progress", "blocked", "complete"]),
  baselineCheckId: recordId.optional(),
  finalCheckId: recordId.optional(),
  steps: z.array(z.strictObject({
    id: recordId, title: z.string().min(1), status: z.enum(["pending", "running", "blocked", "complete"]),
    files: z.array(z.string()), checkIds: z.array(recordId), remaining: z.array(z.string()),
  })).min(1),
  note: z.string(),
}).refine((value) => new Set(value.steps.map((step) => step.id)).size === value.steps.length, "Duplicate step IDs");
type Execution = z.infer<typeof executionSchema>;
const revisionSchema = z.object({
  version: z.number().int().positive(), hash, approved: z.boolean(), approval: z.string(),
});
const executionRecordSchema = z.object({
  execution: executionSchema, fileHashes: z.record(z.string(), z.string()), updatedAt: z.string(),
});
const checkRecordSchema = z.object({
  id: recordId, purpose: z.enum(["baseline", "verification"]), revisionHash: hash.nullable(),
  sourceHash: hash, stable: z.boolean(), full: z.boolean(), results: checksSchema, createdAt: z.string(),
});
export type CheckRecord = z.infer<typeof checkRecordSchema>;

async function optional(path: string): Promise<string> {
  try { return await readFile(path, "utf8"); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return "";
    throw error;
  }
}

async function directory(root: string, child = ""): Promise<string> {
  const base = join(resolve(root), ".frontend-system");
  const path = join(base, child);
  await mkdir(base, { recursive: true });
  const actualRoot = await realpath(root);
  if (await realpath(base) !== join(actualRoot, ".frontend-system")) {
    throw new Error("Project records must not traverse symbolic links");
  }
  await mkdir(path, { recursive: true });
  if (await realpath(path) !== join(actualRoot, ".frontend-system", child)) throw new Error("Project records must not traverse symbolic links");
  return path;
}

async function atomic(path: string, content: string): Promise<void> {
  const temp = `${path}.${randomUUID()}.tmp`;
  try {
    await writeFile(temp, content, { flag: "wx" });
    await rename(temp, path);
  } finally { await rm(temp, { force: true }); }
}

async function locked<T>(root: string, action: () => Promise<T>): Promise<T> {
  const lock = join(await directory(root), ".workflow-lock");
  // ponytail: one writer per project; retry a busy lock, inspect an abandoned lock before removing it.
  await mkdir(lock);
  try { return await action(); }
  finally { await rm(lock, { recursive: true }); }
}

export async function sourceSnapshot(root: string): Promise<Record<string, string>> {
  const snapshot: Record<string, string> = {};
  // ponytail: hashes all discovered files for reliable resume; incremental hashing if large repos require it.
  for (const path of await new FileSystemProjectDiscovery().listFiles(root)) {
    snapshot[relative(root, path)] = createHash("sha256").update(await readFile(path)).digest("hex");
  }
  return snapshot;
}

export async function readRevision(root: string) {
  const content = await optional(join(root, ".frontend-system/revision.md"));
  const raw = await optional(join(root, ".frontend-system/revision.json"));
  const metadata = raw ? revisionSchema.parse(JSON.parse(raw)) : undefined;
  const currentHash = content ? digest(content) : null;
  return {
    content, hash: currentHash, version: metadata?.version ?? 0,
    approved: !!metadata?.approved && metadata.hash === currentHash,
    drifted: !!metadata && metadata.hash !== currentHash,
  };
}

export async function saveRevision(root: string, content: string, expectedHash: string | null) {
  if (!content.trim()) throw new Error("Revision must not be empty");
  return locked(root, async () => {
    const current = await readRevision(root);
    if (current.hash !== expectedHash) throw new Error("Revision changed; reread before saving");
    const version = current.version + 1;
    const base = await directory(root);
    const history = await directory(root, "revisions");
    const previousMetadata = await optional(join(base, "revision.json"));
    if (previousMetadata) await atomic(join(history, `approval-${current.version}.json`), previousMetadata);
    if (current.content) await atomic(join(history, `${current.hash}.md`), current.content);
    await atomic(join(history, `${digest(content)}.md`), content);
    await atomic(join(base, "revision.md"), content);
    await atomic(join(base, "revision.json"), JSON.stringify({ version, hash: digest(content), approved: false, approval: "" }));
    return readRevision(root);
  });
}

export async function approveRevision(root: string, expectedHash: string, approval: string) {
  if (!approval.trim()) throw new Error("Record the user's explicit approval");
  return locked(root, async () => {
    const current = await readRevision(root);
    if (!current.version || current.drifted || current.hash !== expectedHash) throw new Error("Save and review the current revision before approval");
    await atomic(join(await directory(root), "revision.json"), JSON.stringify({
      version: current.version, hash: current.hash, approved: true, approval,
    }));
    return readRevision(root);
  });
}

export async function saveProjectRecord(root: string, kind: "evidence" | "decisions", id: string, content: string, expectedHash: string | null) {
  recordId.parse(id);
  if (!content.trim()) throw new Error("Record must not be empty");
  return locked(root, async () => {
    const path = join(await directory(root, kind), `${id}.md`);
    const previous = await optional(path);
    if ((previous ? digest(previous) : null) !== expectedHash) throw new Error("Record changed; reread before saving");
    await atomic(path, content);
    return { path, hash: digest(content) };
  });
}

export async function readProjectRecord(root: string, kind: "evidence" | "decisions", id: string, offset = 0, limit = 200) {
  recordId.parse(id);
  const content = await optional(join(root, ".frontend-system", kind, `${id}.md`));
  if (!content) throw new Error("Record not found");
  const lines = content.split("\n");
  return { hash: digest(content), content: lines.slice(offset, offset + limit).join("\n"), totalLines: lines.length, nextOffset: offset + limit < lines.length ? offset + limit : null };
}

export async function workflowContext(root: string) {
  const revision = await readRevision(root);
  const records: Array<{ kind: string; id: string; path: string }> = [];
  for (const kind of ["evidence", "decisions"]) {
    const path = join(root, ".frontend-system", kind);
    try {
      for (const name of (await readdir(path)).sort()) {
        if (name.endsWith(".md")) records.push({ kind, id: name.slice(0, -3), path: join(path, name) });
      }
    } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
  }
  const raw = await optional(join(root, ".frontend-system/execution.json"));
  const saved = raw ? executionRecordSchema.parse(JSON.parse(raw)) : undefined;
  const current = saved ? await sourceSnapshot(root) : undefined;
  const changedFiles = saved && current ? [...new Set([...Object.keys(current), ...Object.keys(saved.fileHashes)])]
    .filter((path) => current[path] !== saved.fileHashes[path]).sort() : [];
  return {
    revision: { ...revision, content: revision.content.slice(0, 12000), truncated: revision.content.length > 12000 }, records,
    execution: saved?.execution ?? null,
    executionHash: raw ? digest(raw) : null,
    changedSinceCheckpoint: changedFiles,
    revisionChangedSinceCheckpoint: !!saved && saved.execution.revisionHash !== revision.hash,
    needsRevalidation: !!saved && (changedFiles.length > 0 || saved.execution.revisionHash !== revision.hash || !revision.approved),
  };
}

export async function saveCheckRecord(root: string, record: CheckRecord) {
  const validated = checkRecordSchema.parse(record);
  const path = join(await directory(root, "checks"), `${record.id}.json`);
  await writeFile(path, JSON.stringify(validated, null, 2), { flag: "wx" });
  return { id: record.id, path };
}

export async function readCheckRecord(root: string, id: string): Promise<CheckRecord> {
  recordId.parse(id);
  return checkRecordSchema.parse(JSON.parse(await readFile(join(root, ".frontend-system/checks", `${id}.json`), "utf8")));
}

export async function saveExecution(root: string, input: Execution, expectedHash: string | null) {
  const execution = executionSchema.parse(input);
  return locked(root, async () => {
    const state = await workflowContext(root);
    if (state.executionHash !== expectedHash) throw new Error("Execution changed; reread before saving");
    if (!state.revision.approved || state.revision.hash !== execution.revisionHash) throw new Error("Execution requires the current approved revision");
    const fileHashes = await sourceSnapshot(root);
    const sourceHash = digest(JSON.stringify(fileHashes));
    const verify = async (id: string, full = false) => {
      const record = await readCheckRecord(root, id);
      if (!record.stable || record.sourceHash !== sourceHash || record.revisionHash !== execution.revisionHash ||
        !record.results.length || record.results.some((result) => result.status !== "passed") ||
        (full && (!record.full || !record.results.some((result) => /(^|:)(test|e2e)(:|$)/.test(result.capability))))) {
        throw new Error(`Check ${id} does not verify the current source and revision`);
      }
    };
    if (execution.baselineCheckId) {
      if ((await readCheckRecord(root, execution.baselineCheckId)).purpose !== "baseline") throw new Error("Expected a baseline check record");
    }
    for (const step of execution.steps) {
      const previous = state.execution?.steps.find(({ id }) => id === step.id);
      if (step.status === "complete" && (JSON.stringify(previous) !== JSON.stringify(step) || state.revisionChangedSinceCheckpoint)) {
        if (!step.checkIds.length || step.remaining.length) throw new Error("Completed steps require checks and no remaining work");
        for (const id of step.checkIds) await verify(id);
      }
    }
    if (execution.status === "complete") {
      if (execution.steps.some((step) => step.status !== "complete") || !execution.finalCheckId) throw new Error("Complete all steps and provide a final full check");
      await verify(execution.finalCheckId, true);
    }
    const path = join(await directory(root), "execution.json");
    const content = JSON.stringify({ execution, fileHashes, updatedAt: new Date().toISOString() }, null, 2);
    await atomic(path, content);
    return { path, hash: digest(content) };
  });
}
