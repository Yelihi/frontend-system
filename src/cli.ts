#!/usr/bin/env node
import { dirname, resolve } from "node:path";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";

import { FileSystemProjectDiscovery } from "./adapters/filesystem/project-discovery.js";
import { changedFiles, diffStat, reviewBase } from "./application/git-state.js";
import { knowledgeStatus, searchKnowledge } from "./application/knowledge/catalog.js";
import { readProjectConfig, readProjectDocument, readProjectState } from "./application/project-store.js";
import { runCapabilities } from "./application/run-capabilities.js";
import { taskContext } from "./application/task-context.js";
import type { WorkRequest } from "./domain/types.js";

const usage = `Usage:
  fs inspect-context [project] [--overall]
  fs work-context [project] "<request>" [--mode prepare|implement|verify]
  fs change-context [project] [--base <ref>]
  fs checks [project]
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
    if (!(["prepare", "implement", "verify"] as string[]).includes(values.mode)) throw new Error("Invalid --mode value.");
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
    print(await runCapabilities(await discovery.discover(await discovery.createRef(root))));
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
