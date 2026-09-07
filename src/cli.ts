#!/usr/bin/env node
import { parseArgs } from "node:util";
import { dirname, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";

import { CodexRunner } from "./ai/codex-runner.js";
import { FileSystemProjectDiscovery } from "./adapters/filesystem/project-discovery.js";
import {
  codexInspectAnalyzer,
  implementProject,
  prepareProject,
} from "./application/ai-work.js";
import { changedFiles, reviewBase } from "./application/git-state.js";
import { readProjectState, writeProjectArtifacts } from "./application/project-store.js";
import type { WorkRequest } from "./domain/types.js";
import { inspectProject, type AskUser } from "./graph/inspect.graph.js";
import { verifyProject } from "./graph/verify.graph.js";

const usage = `Usage:
  fs inspect <project> [--overall]
  fs sync <project> [--overall]
  fs prepare <project> "<request>" [--constraint "..."]
  fs implement <project> "<request>" [--constraint "..."]
  fs verify <project> ["<change description>"] [--base <ref>] [--fix ask|auto|never]`;

const ask: AskUser = async (question, reason) => {
  if (!process.stdin.isTTY) {
    throw new Error(`User input required: ${question}\n${reason}\nRun interactively or choose a non-interactive option.`);
  }
  const terminal = createInterface({ input: process.stdin, output: process.stdout });
  try {
    process.stdout.write(`\n${question}\nWhy: ${reason}\n`);
    return await terminal.question("> ");
  } finally {
    terminal.close();
  }
};

function request(raw: string, mode: WorkRequest["mode"], constraints: string[]): WorkRequest {
  return { raw, mode, constraints };
}

async function main(): Promise<void> {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      overall: { type: "boolean", default: false },
      constraint: { type: "string", multiple: true, default: [] },
      base: { type: "string" },
      fix: { type: "string", default: "ask" },
      help: { type: "boolean", short: "h", default: false },
    },
  });
  if (values.help) {
    process.stdout.write(`${usage}\n`);
    return;
  }
  const [command, rawProjectPath, ...requestParts] = positionals;
  if (!command || !rawProjectPath || !["inspect", "sync", "prepare", "implement", "verify"].includes(command)) {
    throw new Error(usage);
  }

  const projectPath = resolve(rawProjectPath);
  const rawRequest = requestParts.join(" ");
  const systemRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
  const discovery = new FileSystemProjectDiscovery();
  const runner = new CodexRunner();

  if (command === "inspect" || command === "sync") {
    if (command === "sync") {
      const state = await readProjectState(projectPath);
      if (state?.analyzedCommit) {
        const changes = await changedFiles(projectPath, state.analyzedCommit).catch(() => ["unknown"]);
        if (!changes.length) {
          process.stdout.write("Project context is already up to date.\n");
          return;
        }
      }
    }
    const result = await inspectProject(
      discovery,
      codexInspectAnalyzer(runner),
      ask,
      { rootPath: projectPath, overall: values.overall },
    );
    await writeProjectArtifacts(result.profile, result.analysis);
    process.stdout.write(`${result.analysis.summary}\nSaved ${projectPath}/.frontend-system/project.md\n`);
    return;
  }

  if (command === "prepare") {
    if (!rawRequest) throw new Error(`prepare requires a request\n${usage}`);
    const output = await prepareProject(runner, discovery, systemRoot, projectPath, request(rawRequest, "prepare", values.constraint));
    process.stdout.write(`${output.trim()}\n`);
    return;
  }

  if (command === "implement") {
    if (!rawRequest) throw new Error(`implement requires a request\n${usage}`);
    const output = await implementProject(runner, discovery, systemRoot, projectPath, request(rawRequest, "implement", values.constraint));
    process.stdout.write(`${output.trim()}\n`);
    return;
  }

  if (!(["ask", "auto", "never"] as string[]).includes(values.fix)) {
    throw new Error("--fix must be ask, auto, or never");
  }
  const base = await reviewBase(projectPath, values.base);
  const result = await verifyProject(discovery, runner, ask, {
    projectPath,
    systemRoot,
    base,
    fix: values.fix as "ask" | "auto" | "never",
    request: request(rawRequest || "Review the current frontend changes", "verify", values.constraint),
  });
  process.stdout.write(`${result.finalReview.summary}\nReport: ${result.reportPath}\n`);
  if (result.verification.some(({ passed }) => !passed) || result.finalReview.findings.some(({ severity }) => severity === "blocker")) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
