import { execFile } from "node:child_process";

import type { ProjectCapability, ProjectProfile, VerificationResult } from "../domain/types.js";

const order = ["test:unit", "test:integration", "test", "test:e2e", "e2e", "test:storybook", "build-storybook", "typecheck", "lint", "build"];

function run(capability: ProjectCapability): Promise<VerificationResult> {
  return new Promise((resolve) => {
    execFile(
      capability.packageManager,
      ["run", capability.script],
      {
        cwd: capability.workingDirectory,
        env: { ...process.env, CI: "true" },
        maxBuffer: 20 * 1024 * 1024,
        timeout: 15 * 60 * 1000,
      },
      (error, stdout, stderr) => resolve({
        capability: capability.name,
        command: capability.command,
        passed: !error,
        output: `${stdout}${stderr}`.slice(-12_000),
      }),
    );
  });
}

export async function runCapabilities(profile: ProjectProfile): Promise<VerificationResult[]> {
  const capabilities = [...profile.capabilities].sort(
    (a, b) => order.indexOf(a.name) - order.indexOf(b.name),
  );
  const results: VerificationResult[] = [];
  for (const capability of capabilities) results.push(await run(capability));
  return results;
}

