import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { relative } from "node:path";
import { digest, readCheckRecord, readRevision, saveCheckRecord, sourceSnapshot } from "./workflow-store.js";

import type { ProjectCapability, ProjectProfile, VerificationResult } from "../domain/types.js";

const order = ["test:unit", "test:integration", "test", "test:e2e", "e2e", "test:storybook", "build-storybook", "typecheck", "lint", "build"];

function run(capability: ProjectCapability, id: string, definition: string): Promise<VerificationResult> {
  if (/(?:^|\s)(?:--watch(?:=\S+)?|--ui|-w)(?:\s|$)/.test(definition)) {
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
        output: `${stdout}${stderr}`.slice(-12_000),
      }),
    );
  });
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
    (a, b) => order.indexOf(a.name) - order.indexOf(b.name),
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
} = {}) {
  const root = profile.project.rootPath;
  const baseline = options.baselineCheckId ? await readCheckRecord(root, options.baselineCheckId) : undefined;
  const before = digest(JSON.stringify(await sourceSnapshot(root)));
  const revision = await readRevision(root);
  const results = await runCapabilities(profile, options.capabilities);
  const after = digest(JSON.stringify(await sourceSnapshot(root)));
  const record = {
    id: randomUUID(), purpose: options.purpose ?? "verification", revisionHash: revision.hash,
    sourceHash: after, stable: before === after, full: !options.capabilities,
    results: results.map((result) => ({ ...result, status: result.status ?? "not-run" as const })),
    createdAt: new Date().toISOString(),
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
