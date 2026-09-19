import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { dirname, join, relative } from "node:path";
import { digest, readAttempt, readCheckRecord, readRevision, saveCheckRecord, sourceSnapshot } from "./workflow-store.js";
import { policyFailures, requiredScripts } from "./policy.js";

import type { ProjectCapability, ProjectProfile, VerificationResult } from "../domain/types.js";

const order = ["test:unit", "test:integration", "test", "test:e2e", "e2e", "test:storybook", "build-storybook", "typecheck", "lint", "build"];

function run(capability: ProjectCapability, id: string, definition: string): Promise<VerificationResult> {
  if (/(?:^|\s)(?:--watch(?:=\S+)?|--ui|--fix|--write|--updateSnapshot|-w|-u)(?:\s|$)/.test(definition)) {
    return Promise.resolve({ capability: id, command: capability.command, workingDirectory: capability.workingDirectory, passed: false, status: "not-run", reason: "Watch command requires a non-watch script", output: "" });
  }
  return new Promise((resolve) => {
    const env: NodeJS.ProcessEnv = { ...process.env, CI: "true" };
    // A host started by node:test must not make independent project tests look recursive.
    delete env.NODE_TEST_CONTEXT;
    execFile(
      capability.packageManager,
      ["run", capability.script],
      {
        cwd: capability.workingDirectory,
        env,
        maxBuffer: 20 * 1024 * 1024,
        timeout: 15 * 60 * 1000,
      },
      (error, stdout, stderr) => resolve({
        capability: id,
        command: capability.command,
        passed: !error,
        status: !error ? "passed" : (error as NodeJS.ErrnoException).code === "ENOENT" ? "not-run" : "failed",
        workingDirectory: capability.workingDirectory,
        output: `${stdout}${stderr}`,
      }),
    );
  });
}

export function summarizeChecks<T extends { results: Array<{ status?: string; output: string }> }>(record: T) {
  return { ...record, results: record.results.map((item) => ({
    ...item, output: item.status === "passed" ? "" : item.output.slice(-2000),
    outputCharacters: item.output.length,
    outputTruncated: item.output.length > (item.status === "passed" ? 0 : 2000),
  })) };
}

export async function runCapabilities(profile: ProjectProfile, selected?: string[]): Promise<VerificationResult[]> {
  const id = (capability: ProjectCapability) => {
    const prefix = relative(profile.project.rootPath, capability.workingDirectory);
    return prefix ? `${prefix}:${capability.script}` : capability.script;
  };
  if (selected) {
    if (!selected.length || selected.some((key) => !profile.capabilities.some((capability) => id(capability) === key))) throw new Error("Select existing capability IDs from profile.scripts");
  }
  const capabilities = [...profile.capabilities].sort(
    (a, b) => order.indexOf(a.name) - order.indexOf(b.name) || a.script.localeCompare(b.script),
  );
  const results: VerificationResult[] = [];
  for (const capability of capabilities) {
    if (!selected || selected.includes(id(capability))) results.push(await run(capability, id(capability), profile.scripts[id(capability)] ?? capability.command));
  }
  if (!results.length) results.push({ capability: "none", command: "", passed: false, status: "not-run", output: "", reason: "No discovered checks; establish the required test environment" });
  return results;
}

export async function runProjectChecks(profile: ProjectProfile, options: {
  capabilities?: string[] | undefined;
  purpose?: "baseline" | "verification" | undefined;
  baselineCheckId?: string | undefined;
  required?: boolean | undefined;
  attemptId?: string | undefined;
} = {}) {
  const root = profile.project.rootPath;
  const baseline = options.baselineCheckId ? await readCheckRecord(root, options.baselineCheckId) : undefined;
  const snapshot = await sourceSnapshot(root);
  const before = digest(JSON.stringify(snapshot));
  const revision = await readRevision(root);
  if (options.required && (!revision.policy || !revision.approved)) throw new Error("Required checks need an approved verification policy");
  if (options.attemptId) {
    const attempt = await readAttempt(root, options.attemptId);
    if (!revision.approved || attempt.revisionHash !== revision.hash) throw new Error("Check attempt does not match the approved revision");
  }
  if (options.required && options.capabilities) throw new Error("Choose required checks or a capability selection, not both");
  const selected = options.required ? requiredScripts(revision.policy!) : options.capabilities;
  const failures = revision.policy ? policyFailures(revision.policy, profile.scripts, snapshot) : [];
  const eligible = { ...profile, capabilities: [...profile.capabilities] };
  // Explicit approved script IDs may use names outside the discovery convention.
  for (const script of revision.policy ? requiredScripts(revision.policy) : []) {
    const manifest = [...profile.paths.manifests].sort((a, b) => b.length - a.length)
      .find((path) => dirname(path) !== "." && script.startsWith(`${dirname(path)}:`));
    const folder = manifest ? dirname(manifest) : "";
    const name = folder ? script.slice(folder.length + 1) : script;
    const workingDirectory = join(root, folder);
    if (!profile.scripts[script] || eligible.capabilities.some((item) => item.workingDirectory === workingDirectory && item.script === name)) continue;
    const manager = profile.capabilities.find((item) => item.workingDirectory === workingDirectory)?.packageManager ?? profile.packageManager?.name ?? "npm";
    eligible.capabilities.push({ name, script: name, command: `${manager} run ${name}`, packageManager: manager, workingDirectory });
  }
  const results: VerificationResult[] = failures.length
    ? failures.map((reason) => ({ capability: "policy", command: "", passed: false, status: "not-run", reason, output: "" }))
    : selected?.length === 0
      ? [{ capability: "none", command: "", passed: false, status: "not-run", reason: "Policy has no automated checks", output: "" }]
      : await runCapabilities(eligible, selected);
  const after = digest(JSON.stringify(await sourceSnapshot(root)));
  const afterRevision = await readRevision(root);
  const record = {
    id: randomUUID(), purpose: options.purpose ?? "verification", revisionHash: revision.hash,
    sourceHash: after, stable: before === after && revision.hash === afterRevision.hash, full: !options.capabilities && !options.required,
    results: results.map((result) => ({ ...result, status: result.status ?? "not-run" as const })),
    createdAt: new Date().toISOString(),
    ...(options.attemptId ? { attemptId: options.attemptId } : {}),
  };
  const saved = await saveCheckRecord(root, record);
  return {
    ...saved, ...record,
    comparison: results.map((result) => {
      const previous = baseline?.results.find((entry) => entry.capability === result.capability);
      return {
        capability: result.capability, previousStatus: previous?.status ?? null, status: result.status,
        previouslyFailing: previous?.status === "failed",
        // Matching status does not establish the same failure cause; the caller must inspect evidence.
        needsFailureReview: result.status === "failed",
      };
    }),
  };
}
