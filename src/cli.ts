#!/usr/bin/env node
import { parseArgs } from "node:util";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { FileSystemProjectDiscovery } from "./adapters/filesystem/project-discovery.js";
import type { WorkRequest } from "./domain/types.js";
import { runWorkflow } from "./graph/frontend-system.graph.js";

const usage = `Usage:
  fs analyze <project>
  fs plan <project> "<request>"`;

async function main(): Promise<void> {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      constraint: { type: "string", multiple: true, default: [] },
      "max-workers": { type: "string", default: "1" },
    },
  });
  const [command, projectPath, ...requestParts] = positionals;
  if (!command || !projectPath || !["analyze", "plan"].includes(command)) {
    throw new Error(usage);
  }
  const raw = requestParts.join(" ") || "Analyze the current project structure and identify improvement opportunities.";
  const maxWorkers = Number(values["max-workers"]);
  if (!Number.isInteger(maxWorkers) || maxWorkers < 1) throw new Error("--max-workers must be a positive integer");
  const request: WorkRequest = {
    raw,
    mode: command as WorkRequest["mode"],
    constraints: values.constraint,
    maxWorkers,
  };
  const systemRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
  const result = await runWorkflow(new FileSystemProjectDiscovery(), systemRoot, projectPath, request);
  const output = {
    projectProfile: result.profile,
    knowledge: { applicable: result.knowledge, gaps: result.knowledgeGaps },
    applicableRules: result.rules,
    detectedCapabilities: result.profile.capabilities,
    workContext: result.context,
    ...(result.plan ? { plan: result.plan } : {}),
  };
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
