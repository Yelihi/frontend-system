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
import { projectSnapshot, projectDocumentStatus } from "./application/project-snapshot.js";
import { listPlans, workflowContext } from "./application/workflow-store.js";
import type { WorkRequest } from "./domain/types.js";

import {getProjectAnalysis, saveProjectAnalysis} from './application/project-flows.js';
import {analysisWriteSchema} from './application/flow-schema.js';
import {renderProjectFlow, renderFlowOptions} from './application/render-project-flow.js';
import {readRevisionDraft} from './application/revision-draft.js';
import {checkPrReadiness} from './application/pr-readiness.js';

const usage = `Usage:
  fs inspect-context [project] [--overall]
  fs work-context [project] "<request>" [--plan <id>] [--mode prepare|implement|verify|review|refactor]
  fs change-context [project] [--base <ref>]
  fs pr-check [project] --base <target-ref> [--plan <id>]
  fs checks [project] [--plan <id>] [--stage baseline|issue|delivery] [--issue <id>] [--required | --capability <script-id>] [--purpose baseline|verification] [--baseline <check-id>] [--attempt <id>]
  fs project-snapshot [project] [--base main]
  fs plans [project]
  fs workflow [project] [--plan <id>]
  fs source-check [repository]
  fs source-read [repository] <id> [--offset <characters>]
  fs knowledge-status [repository]
  fs knowledge-search [repository] "<query>"
  fs flow-list [project]
  fs flow-save <project> .frontend-system/drafts/<name>.json
  fs flow-render <project> <id> --expected-hash <hash> [--scenario <id>] [--language ko|en] [--format html|mermaid] [--allow-unverified]
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
      "expected-hash": {type: "string"},
      scenario: {type: "string"},
      language: {type: "string"},
      format: {type: "string", default: "html"},
      "allow-unverified": {type: "boolean", default: false},
      overall: { type: "boolean", default: false },
      base: { type: "string" },
      mode: { type: "string", default: "implement" },
      capability: { type: "string", multiple: true },
      purpose: { type: "string" },
      baseline: { type: "string" },
      required: { type: "boolean", default: false },
      stage: { type: "string" },
      issue: { type: "string" },
      plan: { type: "string" },
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
  if (command === "flow-list") {
    if (!/^\d+$/.test(values.offset)) throw new Error('Provide a nonnegative offset');
    return print(await getProjectAnalysis(root, systemRoot, {kind:'flow', offset:Number(values.offset)}));
  }
  if (command === "flow-save") {
    if (!rest[0]) throw new Error('Provide a confined JSON draft path');
    return print(await saveProjectAnalysis(root, systemRoot, analysisWriteSchema.parse((await readRevisionDraft(root, rest[0])).input)));
  }
  if (command === "flow-render") return print(await renderProjectFlow(root, systemRoot, renderFlowOptions.parse({
    id:rest[0], expectedHash:values['expected-hash'], scenarioId:values.scenario,
    language:values.language, format:values.format, allowUnverified:values['allow-unverified'],
  })));
  if (command === "inspect-context") return inspect(root, values.overall);
  if (command === "work-context") {
    const raw = rest.join(" ");
    if (!raw) throw new Error(`work-context requires a request\n${usage}`);
    if (!(["prepare", "implement", "verify", "review", "refactor"] as string[]).includes(values.mode)) throw new Error("Invalid --mode value.");
    const request: WorkRequest = { raw, mode: values.mode as WorkRequest["mode"], constraints: [] };
    print(await taskContext(discovery, systemRoot, root, request, values.plan));
    return;
  }
  if (command === "change-context") {
    const base = await reviewBase(root, values.base);
    print({ base, changedFiles: await changedFiles(root, base), diffStat: await diffStat(root, base) });
    return;
  }
  if (command === 'pr-check') {
    if (!values.base) throw new Error('pr-check requires an explicit --base target branch/ref');
    const readiness = await checkPrReadiness(root, values.plan, values.base);
    print(readiness);
    if (readiness.status !== 'ready') process.exitCode = 1;
    return;
  }
  if (command === "project-snapshot") return print({ ...await projectSnapshot(root, values.base), documentStatus: await projectDocumentStatus(root) });
  if (command === "plans") return print(await listPlans(root));
  if (command === "workflow") return print(await workflowContext(root, values.plan));
  if (command === "checks") {
    if (values.purpose && values.purpose !== "baseline" && values.purpose !== "verification") throw new Error("Invalid --purpose value.");
    if (values.stage && !["baseline", "issue", "delivery"].includes(values.stage)) throw new Error("Invalid --stage value");
    const record = await runProjectChecks(await discovery.discover(await discovery.createRef(root)), {
      capabilities: values.capability, purpose: values.purpose as "baseline" | "verification" | undefined, baselineCheckId: values.baseline,
      stage: values.stage as "baseline" | "issue" | "delivery" | undefined, stepId: values.issue,
      planId: values.plan, required: values.required, attemptId: values.attempt,
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
