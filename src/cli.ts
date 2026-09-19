#!/usr/bin/env node
import { dirname, resolve } from "node:path";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";

import { FileSystemProjectDiscovery } from "./adapters/filesystem/project-discovery.js";
import { changedFiles, diffStat, reviewBase } from "./application/git-state.js";
import { knowledgeStatus, searchKnowledge } from "./application/knowledge/catalog.js";
import { readProjectConfig, readProjectDocument, readProjectState } from "./application/project-store.js";
import { runProjectChecks, summarizeChecks } from "./application/run-capabilities.js";
import { checkSources, readSourceChange } from "./application/knowledge/sources.js";
import { taskContext } from "./application/task-context.js";
import type { WorkRequest } from "./domain/types.js";

const usage = `Usage:
  fs inspect-context [project] [--overall]
  fs work-context [project] "<request>" [--mode prepare|implement|verify|review|refactor]
  fs change-context [project] [--base <ref>]
  fs checks [project] [--required | --capability <script-id>] [--purpose baseline|verification] [--baseline <check-id>] [--attempt <id>]
  fs source-check [repository]
  fs source-read [repository] <id> [--offset <characters>]
  fs knowledge-status [repository]
  fs knowledge-search [repository] "<query>"
  fs mcp

These are deterministic helpers. Use the fs-* Skills in Codex or Claude Code for complete workflows.`;

const systemRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const discovery = new FileSystemProjectDiscovery();

function print(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

async function inspect(root: string, overall: boolean): Promise<void> {
  const profile = await discovery.discover(await discovery.createRef(root));
  print({
    overall,
    profile,
    config: await readProjectConfig(root),
    projectDocument: await readProjectDocument(root),
    state: await readProjectState(root),
    changedFiles: await changedFiles(root).catch(() => []),
  });
}

async function main(): Promise<void> {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      overall: { type: "boolean", default: false },
      base: { type: "string" },
      mode: { type: "string", default: "implement" },
      capability: { type: "string", multiple: true },
      purpose: { type: "string", default: "verification" },
      baseline: { type: "string" },
      required: { type: "boolean", default: false },
      attempt: { type: "string" },
      offset: { type: "string", default: "0" },
      help: { type: "boolean", short: "h", default: false },
    },
  });
  if (values.help) {
    process.stdout.write(`${usage}\n`);
    return;
  }
  const [command, rawPath, ...rest] = positionals;
  if (!command) throw new Error(usage);
  if (command === "mcp") {
    await import("./mcp.js");
    return;
  }

  const root = resolve(rawPath ?? process.cwd());
  if (command === "inspect-context") return inspect(root, values.overall);
  if (command === "work-context") {
    const raw = rest.join(" ");
    if (!raw) throw new Error(`work-context requires a request\n${usage}`);
    if (!(["prepare", "implement", "verify", "review", "refactor"] as string[]).includes(values.mode)) throw new Error("Invalid --mode value.");
    const request: WorkRequest = { raw, mode: values.mode as WorkRequest["mode"], constraints: [] };
    print(await taskContext(discovery, systemRoot, root, request));
    return;
  }
  if (command === "change-context") {
    const base = await reviewBase(root, values.base);
    print({ base, changedFiles: await changedFiles(root, base), diffStat: await diffStat(root, base) });
    return;
  }
  if (command === "checks") {
    if (values.purpose !== "baseline" && values.purpose !== "verification") throw new Error("Invalid --purpose value.");
    const record = await runProjectChecks(await discovery.discover(await discovery.createRef(root)), {
      capabilities: values.capability, purpose: values.purpose, baselineCheckId: values.baseline,
      required: values.required, attemptId: values.attempt,
    });
    print(summarizeChecks(record));
    if (!record.stable || record.results.some((item) => item.status !== "passed")) process.exitCode = 1;
    return;
  }
  if (command === "source-check") {
    const results = await checkSources(root);
    print(results);
    if (results.some((item) => ["failed", "needs-host"].includes(item.status))) process.exitCode = 1;
    return;
  }
  if (command === "source-read") {
    if (!rest[0] || !/^\d+$/.test(values.offset)) throw new Error("Provide a source ID and nonnegative offset");
    print(await readSourceChange(root, rest[0], Number(values.offset)));
    return;
  }
  if (command === "knowledge-status") {
    print(await knowledgeStatus(root));
    return;
  }
  if (command === "knowledge-search") {
    print(await searchKnowledge(root, rest.join(" ")));
    return;
  }
  throw new Error(usage);
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
