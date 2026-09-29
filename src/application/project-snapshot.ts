import { join } from "node:path";
import { readFile } from "node:fs/promises";
import { git } from "./git-state.js";
import * as z from "zod/v4";
import { atomic, directory, locked, digest } from "./workflow-store.js";

// Generated context and workflow evidence do not trigger a document refresh loop.
const included = (path: string) => !path.split("/").includes(".frontend-system") || path === ".frontend-system/config.json";

export async function projectSnapshot(root: string, baseRef = "main") {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._/-]*$/.test(baseRef) || baseRef.includes("..")) throw new Error("Invalid base branch");
  const head = await git(root, ["rev-parse", "--verify", "HEAD"]).then((value) => value.trim(), () => null);
  if (!head) return { baseRef, commit: null, sourceHash: digest("[]"), files: [] as string[], manifests: {} as Record<string, unknown>, workingChanges: [] as string[], status: "unversioned" as const };
  // Never substitute the feature branch when the requested main branch is missing.
  const commit = (await git(root, ["rev-parse", "--verify", `${baseRef}^{commit}`])).trim();
  const tree = (await git(root, ["ls-tree", "-r", "-z", commit, "--", "."])).split("\0").filter(Boolean);
  const entries = tree.map((line) => ({ path: line.slice(line.indexOf("\t") + 1), object: line.slice(0, line.indexOf("\t")) }))
    .filter(({ path }) => included(path)).sort((a, b) => a.path.localeCompare(b.path));
  const files = entries.map(({ path }) => path);
  const manifests: Record<string, unknown> = {};
  for (const path of files.filter((path) => /(^|\/)package\.json$/.test(path))) {
    try { manifests[path] = JSON.parse(await git(root, ["show", `${commit}:./${path}`])) as unknown; }
    catch { manifests[path] = { error: "Manifest could not be parsed at the base commit" }; }
  }
  const workingChanges = [...new Set([
    ...(await git(root, ["diff", "--name-only", "--relative", "-z", commit, "--", "."])).split("\0"),
    ...(await git(root, ["ls-files", "--others", "--exclude-standard", "-z", "--", "."])).split("\0"),
  ].filter((path) => path && included(path)))].sort();
  return { baseRef, commit, sourceHash: digest(JSON.stringify(entries)), files, manifests, workingChanges, status: "versioned" as const };
}

export async function readProjectSource(root: string, path: string, expectedCommit: string, baseRef = "main", offset = 0, limit = 12000) {
  const snapshot = await projectSnapshot(root, baseRef);
  if (snapshot.commit !== expectedCommit) throw new Error("Main changed; refresh project facts");
  if (!snapshot.files.includes(path)) throw new Error("Select a file from the main snapshot");
  const content = await git(root, ["show", `${expectedCommit}:./${path}`]);
  return { commit: expectedCommit, path, content: content.slice(offset, offset + limit), totalCharacters: content.length, nextOffset: offset + limit < content.length ? offset + limit : null };
}

const metadataSchema = z.object({
  baseRef: z.string(), analyzedCommit: z.string().nullable(), sourceHash: z.string(), updatedAt: z.string(),
});
const refreshSchema = z.object({
  baseRef: z.string(), commit: z.string().nullable(), status: z.enum(["pending", "failed"]), reason: z.string(), updatedAt: z.string(),
});
async function optional(path: string) {
  try { return await readFile(path, "utf8"); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return ""; throw error; }
}

export async function projectDocumentHash(root: string) {
  const content = await optional(join(root, ".frontend-system/project.md"));
  return content ? digest(content) : null;
}

export async function contextMetadata(root: string) {
  const content = await optional(join(root, ".frontend-system/project.md"));
  const match = /^<!-- frontend-system-context (.+) -->$/m.exec(content);
  return match ? metadataSchema.parse(JSON.parse(match[1]!)) : null;
}

export async function recordProjectRefresh(root: string, baseRef: string, expectedCommit: string | null, status: "pending" | "failed", reason: string) {
  if (status === "failed" && !reason.trim()) throw new Error("Record the refresh failure reason");
  return locked(root, async () => {
    const snapshot = await projectSnapshot(root, baseRef);
    if (snapshot.commit !== expectedCommit) throw new Error("Main changed; refresh project facts");
    const record = refreshSchema.parse({ baseRef, commit: snapshot.commit, status, reason, updatedAt: new Date().toISOString() });
    await atomic(join(await directory(root), "project-refresh.json"), JSON.stringify(record));
    return record;
  });
}

export async function projectDocumentStatus(root: string) {
  const metadata = await contextMetadata(root);
  const refreshRaw = await optional(join(root, ".frontend-system/project-refresh.json"));
  const refresh = refreshRaw ? refreshSchema.parse(JSON.parse(refreshRaw)) : null;
  if (!metadata && !refresh) return { status: "missing" as const, analyzedCommit: null };
  const snapshot = await projectSnapshot(root, refresh?.baseRef ?? metadata!.baseRef);
  const active = refresh && refresh.commit === snapshot.commit;
  return { ...metadata, mainCommit: snapshot.commit, workingChanges: snapshot.workingChanges,
    status: active ? refresh.status : !metadata ? "missing" as const : !snapshot.commit ? "unversioned" as const : snapshot.sourceHash === metadata.sourceHash ? "current" as const : "stale" as const,
    ...(active ? { refreshReason: refresh.reason, refreshStartedAt: refresh.updatedAt } : {}) };
}
