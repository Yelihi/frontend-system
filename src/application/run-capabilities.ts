import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { dirname, join, relative } from "node:path";
import { digest, readAttempt, readCheckRecord, readRevision, saveCheckRecord, sourceSnapshot } from "./workflow-store.js";
import { policyFailures, requiredScripts } from "./policy.js";

import type { ProjectCapability, ProjectProfile, VerificationResult } from "../domain/types.js";

function checkOrder(name: string): number {
  if (/^(lint|typecheck)(:|$)/.test(name)) return 0;
  if (/^(check)(:|$)/.test(name)) return 1;
  if (/^(test:(e2e|storybook)|e2e|build-storybook)(:|$)/.test(name)) return 3;
  if (/^build(:|$)/.test(name)) return 4;
  return 2;
}

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
  const excerpt = (output: string) => {
    if (output.length <= 2000) return output;
    const omitted = "\n[... omitted; read get_check_record with capability/offset for the original log ...]\n";
    return output.slice(0, 1500) + omitted + output.slice(-(500 - omitted.length));
  };
  return { ...record, results: record.results.map((item) => ({
    ...item, output: item.status === "passed" ? "" : excerpt(item.output),
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
    (a, b) => checkOrder(a.name) - checkOrder(b.name) || a.script.localeCompare(b.script),
  );
  const results: VerificationResult[] = [];
  for (const capability of capabilities) {
    if (!selected || selected.includes(id(capability))) results.push(await run(capability, id(capability), profile.scripts[id(capability)] ?? capability.command));
  }
  if (!results.length) results.push({ capability: "none", command: "", passed: false, status: "not-run", output: "", reason: "No discovered checks; establish the required test environment" });
  return results;
}

export async function runProjectChecks(profile: ProjectProfile, options: {
  planId?: string | undefined;
  stage?: "baseline" | "issue" | "delivery" | undefined;
  stepId?: string | undefined;
  capabilities?: string[] | undefined;
  purpose?: "baseline" | "verification" | undefined;
  baselineCheckId?: string | undefined;
  required?: boolean | undefined;
  attemptId?: string | undefined;
} = {}) {
  const root = profile.project.rootPath;
  const baseline = options.baselineCheckId ? await readCheckRecord(root, options.baselineCheckId, options.planId) : undefined;
  const snapshot = await sourceSnapshot(root);
  const before = digest(JSON.stringify(snapshot));
  const revision = await readRevision(root, options.planId);
  const required = options.required || options.stage === "delivery" || options.stage === "issue";
  if (required && (!revision.policy || !revision.approved)) throw new Error("Required checks need an approved verification policy");
  let attemptStep: string | undefined;
  if (options.attemptId) {
    const attempt = await readAttempt(root, options.attemptId, options.planId);
    attemptStep = attempt.stepId;
    if (!revision.approved || attempt.revisionHash !== revision.hash) throw new Error("Check attempt does not match the approved revision");
  }
  if ((required || options.stage) && options.capabilities) throw new Error("Choose a stage/required checks or a capability selection, not both");
  if (options.required && options.stage && options.stage !== "delivery") throw new Error("Required checks cannot be narrowed by a stage");
  if (options.stage === "baseline" && options.purpose === "verification") throw new Error("Baseline stage records baseline evidence");
  let selected = required ? requiredScripts(revision.policy!) : options.capabilities;
  if (options.stage === "baseline") selected = profile.capabilities.filter((item) =>
    /^(lint|typecheck)(:|$)/.test(item.name) || ["test:unit", "test:integration"].includes(item.name) ||
    (item.name === "test" && !profile.capabilities.some((other) => other.workingDirectory === item.workingDirectory && ["test:unit", "test:integration"].includes(other.name))))
    .map((item) => relative(root, item.workingDirectory) ? `${relative(root, item.workingDirectory)}:${item.script}` : item.script);
  if (options.stage === "issue") {
    const stepId = options.stepId ?? attemptStep;
    const issue = revision.issues?.find(({ id }) => id === stepId);
    if (!issue || (attemptStep && attemptStep !== issue.id)) throw new Error("Issue stage requires an approved issue and matching attempt");
    selected = [...new Set(issue.requiredCheckIds.map((id) => revision.policy!.checks.find((check) => check.id === id)!.script))];
  }
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
  const afterRevision = await readRevision(root, options.planId);
  const requiredPolicyScripts = revision.policy ? requiredScripts(revision.policy) : [];
  const missingOrFailedScripts = requiredPolicyScripts.filter((script) =>
    !results.some((result) => result.capability === script && result.status === "passed"));
  const record = {
    ...(revision.policy ? { coverage: { requiredScripts: requiredPolicyScripts, missingOrFailedScripts,
      allRequiredPassed: requiredPolicyScripts.length > 0 && missingOrFailedScripts.length === 0 } } : {}),
    id: randomUUID(), planId: options.planId ?? null, stage: options.stage, purpose: options.stage === "baseline" ? "baseline" : options.purpose ?? "verification", revisionHash: revision.hash,
    sourceHash: after, stable: before === after && revision.hash === afterRevision.hash, full: !options.capabilities && !required && !options.stage,
    results: results.map((result) => ({ ...result, status: result.status ?? "not-run" as const })),
    createdAt: new Date().toISOString(),
    ...(options.attemptId ? { attemptId: options.attemptId } : {}),
  };
  const saved = await saveCheckRecord(root, record, options.planId);
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
