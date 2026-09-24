import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, realpath, rename, rm, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import * as z from "zod/v4";

import { FileSystemProjectDiscovery } from "../adapters/filesystem/project-discovery.js";
import { policySchema, policyFailures, policyProtectionFailures, requiredScripts, type VerificationPolicy } from "./policy.js";

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
  kind: z.enum(["setup", "implement", "refactor", "verify"]).optional(),
  steps: z.array(z.strictObject({
    id: recordId, title: z.string().min(1), status: z.enum(["pending", "running", "blocked", "complete"]),
    files: z.array(z.string()), checkIds: z.array(recordId), remaining: z.array(z.string()),
    dependsOn: z.array(recordId).optional(),
    requiredCheckIds: z.array(z.string()).optional(),
    reviewIds: z.array(recordId).optional(),
    attemptId: recordId.optional(),
  })).min(1),
  note: z.string(),
}).refine((value) => new Set(value.steps.map((step) => step.id)).size === value.steps.length, "Duplicate step IDs");
type Execution = z.infer<typeof executionSchema>;
const revisionSchema = z.object({
  version: z.number().int().positive(), hash, approved: z.boolean(), approval: z.string(),
  policy: policySchema.optional(),
});
const executionRecordSchema = z.object({
  execution: executionSchema, fileHashes: z.record(z.string(), z.string()), updatedAt: z.string(),
  requiresRevalidation: z.boolean().optional(),
});
const checkRecordSchema = z.object({
  id: recordId, purpose: z.enum(["baseline", "verification"]), revisionHash: hash.nullable(),
  sourceHash: hash, stable: z.boolean(), full: z.boolean(), results: checksSchema, createdAt: z.string(),
  attemptId: recordId.optional(),
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
  const currentHash = content ? revisionDigest(content, metadata?.policy) : null;
  return {
    content, hash: currentHash, version: metadata?.version ?? 0,
    approved: !!metadata?.approved && metadata.hash === currentHash,
    drifted: !!metadata && metadata.hash !== currentHash,
    policy: metadata?.policy,
  };
}

function revisionDigest(content: string, policy?: VerificationPolicy) {
  return digest(policy ? JSON.stringify({ content, policy }) : content);
}

export async function saveRevision(root: string, content: string, expectedHash: string | null, policy?: VerificationPolicy) {
  if (!content.trim()) throw new Error("Revision must not be empty");
  return locked(root, async () => {
    const current = await readRevision(root);
    if (current.hash !== expectedHash) throw new Error("Revision changed; reread before saving");
    const version = current.version + 1;
    const nextPolicy = policy === undefined ? current.policy : policySchema.parse(policy);
    const nextHash = revisionDigest(content, nextPolicy);
    const base = await directory(root);
    const history = await directory(root, "revisions");
    const previousMetadata = await optional(join(base, "revision.json"));
    if (previousMetadata) await atomic(join(history, `approval-${current.version}.json`), previousMetadata);
    if (current.content) await atomic(join(history, `${current.hash}.md`), current.content);
    await atomic(join(history, `${nextHash}.md`), content);
    await atomic(join(base, "revision.md"), content);
    await atomic(join(base, "revision.json"), JSON.stringify({ version, hash: nextHash, approved: false, approval: "", policy: nextPolicy }));
    return readRevision(root);
  });
}

export async function approveRevision(root: string, expectedHash: string, approval: string) {
  if (!approval.trim()) throw new Error("Record the user's explicit approval");
  return locked(root, async () => {
    const current = await readRevision(root);
    if (!current.version || current.drifted || current.hash !== expectedHash) throw new Error("Save and review the current revision before approval");
    const failures = current.policy ? policyProtectionFailures(current.policy) : [];
    if (failures.length) throw new Error(failures.join("; "));
    await atomic(join(await directory(root), "revision.json"), JSON.stringify({
      version: current.version, hash: current.hash, approved: true, approval,
      policy: current.policy,
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
  const protectionFailures = revision.policy ? policyProtectionFailures(revision.policy) : [];
  const needsRevalidation = !!saved && (saved.requiresRevalidation === true || changedFiles.length > 0 || saved.execution.revisionHash !== revision.hash || !revision.approved || protectionFailures.length > 0);
  return {
    revision: { ...revision, content: revision.content.slice(0, 12000), truncated: revision.content.length > 12000 }, records,
    execution: saved?.execution ?? null,
    executionHash: raw ? digest(raw) : null,
    changedSinceCheckpoint: changedFiles,
    revisionChangedSinceCheckpoint: !!saved && saved.execution.revisionHash !== revision.hash,
    needsRevalidation,
    verification: {
      status: protectionFailures.length ? "blocked" : needsRevalidation ? "stale" : saved?.execution.status !== "complete" ? "unverified" : revision.policy ? "verified" : "legacy",
      failures: protectionFailures,
      sourceHash: current ? digest(JSON.stringify(current)) : null,
      revisionHash: revision.hash,
      finalCheckId: saved?.execution.finalCheckId ?? null,
      // IDs identify the approved scope, not an assertion of correctness outside it.
      requiredRuleIds: revision.policy?.rules.filter((rule) => rule.obligation === "required").map((rule) => rule.id) ?? [],
      reviewIds: saved?.execution.steps.flatMap((step) => step.reviewIds ?? []) ?? [],
    },
    enforcement: revision.policy ? "policy" : "legacy",
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
    validateSteps(execution);
    const policy = state.revision.policy;
    for (const exception of policy?.exceptions ?? []) {
      if (!execution.steps.some(({ id }) => id === exception.resolveByStep)) throw new Error(`Missing exception resolution step: ${exception.resolveByStep}`);
    }
    if (state.execution?.revisionHash === execution.revisionHash) {
      for (const old of state.execution.steps) {
        if (!execution.steps.some(({ id }) => id === old.id)) throw new Error("Preserve existing step IDs and their attempt history; revise the plan explicitly instead of resetting work");
      }
    }
    const verify = async (id: string, full = false) => {
      const record = await readCheckRecord(root, id);
      if (!record.stable || record.sourceHash !== sourceHash || record.revisionHash !== execution.revisionHash ||
        !record.results.length || record.results.some((result) => result.status !== "passed") ||
        (full && ((!policy && !record.full) || !record.results.some((result) => /(^|:)(test|e2e)(:|$)/.test(result.capability))))) {
        throw new Error(`Check ${id} does not verify the current source and revision`);
      }
      if (policy && full && requiredScripts(policy).some((script) => !record.results.some((result) => result.capability === script && result.status === "passed"))) {
        throw new Error("Required checks are missing from the final run");
      }
      return record;
    };
    if (execution.baselineCheckId) {
      if ((await readCheckRecord(root, execution.baselineCheckId)).purpose !== "baseline") throw new Error("Expected a baseline check record");
    }
    for (const step of execution.steps) {
      if (["running", "complete"].includes(step.status) && (step.dependsOn ?? []).some((id) => execution.steps.find((entry) => entry.id === id)?.status !== "complete")) {
        throw new Error(`Prerequisites are incomplete: ${step.id}`);
      }
      const previous = state.execution?.steps.find(({ id }) => id === step.id);
      if (step.status === "complete" && (JSON.stringify(previous) !== JSON.stringify(step) || state.revisionChangedSinceCheckpoint)) {
        if (!step.checkIds.length || step.remaining.length) throw new Error("Completed steps require checks and no remaining work");
        for (const id of step.checkIds) await verify(id);
        if (policy) await verifyStep(root, step, policy, execution.revisionHash, sourceHash);
      }
    }
    if (execution.status === "complete") {
      if (execution.steps.some((step) => step.status !== "complete") || !execution.finalCheckId) throw new Error("Complete all steps and provide a final full check");
      const finalCheck = await verify(execution.finalCheckId, true);
      if (policy) {
        if (!finalCheck.attemptId || !execution.steps.some((step) => step.attemptId === finalCheck.attemptId)) throw new Error("Final verification requires an execution attempt");
        const discovery = new FileSystemProjectDiscovery();
        const profile = await discovery.discover(await discovery.createRef(root));
        const failures = policyFailures(policy, profile.scripts, fileHashes);
        if (failures.length) throw new Error(failures.join("; "));
        const reviews = await Promise.all(execution.steps.flatMap((step) => (step.reviewIds ?? []).map((id) => readReview(root, id))));
        verifyReviews(reviews, policy, execution.revisionHash, sourceHash);
      }
    }
    const path = join(await directory(root), "execution.json");
    // Saving progress must not erase stale verification. Only accepted final checks clear it.
    const requiresRevalidation = execution.status !== "complete" && state.needsRevalidation;
    const content = JSON.stringify({ execution, fileHashes, requiresRevalidation, updatedAt: new Date().toISOString() }, null, 2);
    await atomic(path, content);
    await writeChecklist(root, execution);
    return { path, hash: digest(content) };
  });
}

function validateSteps(execution: Execution) {
  const steps = new Map(execution.steps.map((step) => [step.id, step]));
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const visit = (id: string) => {
    if (visited.has(id)) return;
    if (visiting.has(id)) throw new Error("Cyclic step dependencies");
    const step = steps.get(id);
    if (!step) throw new Error(`Unknown dependency: ${id}`);
    visiting.add(id);
    for (const dependency of step.dependsOn ?? []) visit(dependency);
    visiting.delete(id); visited.add(id);
  };
  for (const id of steps.keys()) visit(id);
}

async function writeChecklist(root: string, execution: Execution) {
  const path = join(await directory(root), "refactoring.md");
  const previous = await optional(path);
  const body = `# Work plan\n\nRevision: ${execution.revisionHash}\nKind: ${execution.kind ?? "refactor"}\nStatus: ${execution.status}\n\n${execution.steps.map((step) => `- [${step.status === "complete" ? "x" : " "}] ${step.id}: ${step.title} (${step.status})\n  Depends on: ${(step.dependsOn ?? []).join(", ") || "none"}\n  Remaining: ${step.remaining.join("; ") || "none"}`).join("\n")}\n\n${execution.note}\n`;
  if (previous && previous !== body) await atomic(join(await directory(root, "plans"), `${digest(previous)}.md`), previous);
  await atomic(path, body);
}

const attemptSchema = z.object({ id: recordId, stepId: recordId, revisionHash: hash, number: z.number().int().min(1).max(3), createdAt: z.string() });
export async function readAttempt(root: string, id: string) {
  recordId.parse(id);
  return attemptSchema.parse(JSON.parse(await readFile(join(root, ".frontend-system/attempts", `${id}.json`), "utf8")));
}

export async function beginAttempt(root: string, stepId: string, expectedHash: string) {
  recordId.parse(stepId);
  return locked(root, async () => {
    const state = await workflowContext(root);
    if (state.executionHash !== expectedHash || !state.execution || !state.revision.approved || state.revision.hash !== state.execution.revisionHash) throw new Error("Reread the current approved execution");
    const step = state.execution.steps.find(({ id }) => id === stepId);
    if (!step || step.status === "complete") throw new Error("Select an incomplete step");
    validateSteps(state.execution);
    if ((step.dependsOn ?? []).some((id) => state.execution!.steps.find((entry) => entry.id === id)?.status !== "complete")) throw new Error("Prerequisites are incomplete");
    const folder = await directory(root, "attempts");
    const attempts = await Promise.all((await readdir(folder)).filter((name) => name.endsWith(".json")).map((name) => readAttempt(root, name.slice(0, -5))));
    const number = attempts.filter((item) => item.stepId === stepId && item.revisionHash === state.revision.hash).length + 1;
    if (number > 3) throw new Error("Attempt budget exhausted; record blocked state and resolve the cause");
    const attempt = attemptSchema.parse({ id: randomUUID(), stepId, revisionHash: state.revision.hash, number, createdAt: new Date().toISOString() });
    await writeFile(join(folder, `${attempt.id}.json`), JSON.stringify(attempt), { flag: "wx" });
    return attempt;
  });
}

export const reviewInputSchema = z.strictObject({
  stepId: recordId, reviewId: z.string().min(1), attemptId: recordId,
  status: z.enum(["passed", "failed"]),
  findings: z.array(z.strictObject({ ruleId: z.string().min(1), files: z.array(z.string()).min(1), evidence: z.string().min(1), conclusion: z.string().min(1) })).min(1),
  remaining: z.array(z.string()), resolvedExceptions: z.array(z.string()),
});
const reviewSchema = reviewInputSchema.extend({ id: recordId, revisionHash: hash, sourceHash: hash, createdAt: z.string(), authority: z.literal("host-model-review") });
type Review = z.infer<typeof reviewSchema>;
export async function readReview(root: string, id: string) {
  recordId.parse(id);
  return reviewSchema.parse(JSON.parse(await readFile(join(root, ".frontend-system/reviews", `${id}.json`), "utf8")));
}
export async function saveReview(root: string, input: z.infer<typeof reviewInputSchema>) {
  const data = reviewInputSchema.parse(input);
  return locked(root, async () => {
    const state = await workflowContext(root);
    const policy = state.revision.policy;
    const requirement = policy?.reviews.find(({ id }) => id === data.reviewId);
    if (!state.revision.approved || !requirement || !state.execution?.steps.some(({ id }) => id === data.stepId)) throw new Error("Review requires an approved policy and execution step");
    const attempt = await readAttempt(root, data.attemptId);
    if (attempt.revisionHash !== state.revision.hash || attempt.stepId !== data.stepId) throw new Error("Review attempt does not match");
    const snapshot = await sourceSnapshot(root);
    if (data.findings.some((finding) => !policy!.rules.some(({ id }) => id === finding.ruleId) || finding.files.some((file) => !snapshot[file]))) throw new Error("Review findings require existing files and policy rules");
    if (requirement.ruleIds.some((id) => !data.findings.some((finding) => finding.ruleId === id))) throw new Error("Review must address all required rules");
    if (data.resolvedExceptions.some((id) => !policy!.exceptions.some((item) => item.id === id))) throw new Error("Unknown exception resolution");
    if (data.status === "passed" && data.remaining.length) throw new Error("Passing review cannot have remaining work");
    const review = reviewSchema.parse({ ...data, id: randomUUID(), revisionHash: state.revision.hash, sourceHash: digest(JSON.stringify(snapshot)), createdAt: new Date().toISOString(), authority: "host-model-review" });
    await writeFile(join(await directory(root, "reviews"), `${review.id}.json`), JSON.stringify(review), { flag: "wx" });
    return review;
  });
}

function verifyReviews(reviews: Review[], policy: VerificationPolicy, revisionHash: string, sourceHash: string) {
  const passing = reviews.filter((item) => item.status === "passed" && !item.remaining.length && item.revisionHash === revisionHash && item.sourceHash === sourceHash);
  if (policy.reviews.some((item) => !passing.some((review) => review.reviewId === item.id))) throw new Error("Missing current semantic review evidence");
  if (policy.exceptions.some((item) => !passing.some((review) => review.resolvedExceptions.includes(item.id)))) throw new Error("Unresolved migration exceptions");
}

async function verifyStep(root: string, step: Execution["steps"][number], policy: VerificationPolicy, revisionHash: string, sourceHash: string) {
  if (!step.attemptId) throw new Error("Policy steps require a recorded attempt");
  const attempt = await readAttempt(root, step.attemptId);
  if (attempt.stepId !== step.id || attempt.revisionHash !== revisionHash) throw new Error("Step attempt does not match");
  const records = await Promise.all(step.checkIds.map((id) => readCheckRecord(root, id)));
  if (records.some((item) => item.attemptId !== attempt.id)) throw new Error("Step checks must belong to its attempt");
  const checks = step.requiredCheckIds ?? policy.checks.map(({ id }) => id);
  for (const id of checks) {
    const check = policy.checks.find((item) => item.id === id);
    if (!check || !records.some((record) => record.results.some((result) => result.capability === check.script && result.status === "passed"))) throw new Error(`Missing required step check: ${id}`);
  }
  const reviews = await Promise.all((step.reviewIds ?? []).map((id) => readReview(root, id)));
  if (reviews.some((review) => review.stepId !== step.id || review.attemptId !== attempt.id)) throw new Error("Step reviews must belong to its attempt");
  verifyReviews(reviews, { ...policy, exceptions: policy.exceptions.filter((item) => item.resolveByStep === step.id) }, revisionHash, sourceHash);
}
