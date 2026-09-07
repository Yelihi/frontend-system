#!/usr/bin/env node
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as z from "zod/v4";

import { FileSystemProjectDiscovery } from "./adapters/filesystem/project-discovery.js";
import { changedFiles, diffStat, reviewBase } from "./application/git-state.js";
import {
  catalogKnowledgeDocument,
  knowledgeStatus,
  markKnowledgeSynced,
  searchKnowledge,
} from "./application/knowledge/catalog.js";
import {
  readProjectConfig,
  readProjectDocument,
  readProjectState,
  writeProjectArtifacts,
  writeProjectConfig,
} from "./application/project-store.js";
import { runCapabilities } from "./application/run-capabilities.js";
import { taskContext } from "./application/task-context.js";
import type { ProjectAnalysis, ProjectConfig, WorkRequest } from "./domain/types.js";

const systemRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const discovery = new FileSystemProjectDiscovery();
const server = new McpServer({ name: "frontend-system", version: "0.1.0" });

function result(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }] };
}

function projectPath(path?: string): string {
  return resolve(path ?? process.cwd());
}

function repositoryPath(path?: string): string {
  return resolve(path ?? process.env.FRONTEND_SYSTEM_REPO ?? systemRoot);
}

const readOnly = { readOnlyHint: true, destructiveHint: false, openWorldHint: false };
const localWrite = { readOnlyHint: false, destructiveHint: false, openWorldHint: false };

server.registerTool("inspect_project", {
  title: "Inspect frontend project facts",
  description: "Discover manifests, technologies, design evidence, scripts, architecture hints, and existing frontend-system context without invoking a model.",
  inputSchema: {
    projectPath: z.string().optional(),
    overall: z.boolean().default(false).describe("Signals that the calling skill should avoid asking project-structure questions."),
  },
  annotations: readOnly,
}, async ({ projectPath: path, overall }) => {
  const root = projectPath(path);
  const profile = await discovery.discover(await discovery.createRef(root));
  return result({
    overall,
    profile,
    config: await readProjectConfig(root),
    projectDocument: await readProjectDocument(root),
    state: await readProjectState(root),
    changedFiles: await changedFiles(root).catch(() => []),
  });
});

server.registerTool("configure_project", {
  title: "Configure frontend-system",
  description: "Write the small project-local frontend-system configuration. This never modifies package.json.",
  inputSchema: {
    projectPath: z.string().optional(),
    designProvider: z.enum(["built-in", "open-design"]),
    designProviderScope: z.enum(["project", "user"]).optional(),
  },
  annotations: localWrite,
}, async ({ projectPath: path, designProvider, designProviderScope }) => {
  const root = projectPath(path);
  const config: ProjectConfig = {
    version: 1,
    designProvider: {
      name: designProvider,
      ...(designProviderScope ? { scope: designProviderScope } : {}),
    },
  };
  await writeProjectConfig(root, config);
  return result({ path: `${root}/.frontend-system/config.json`, config });
});

const questionSchema = z.object({
  id: z.string(),
  question: z.string(),
  reason: z.string(),
});

server.registerTool("save_project_context", {
  title: "Save inspected project context",
  description: "Persist the top-level model's evidence-backed project analysis and update deterministic hashes.",
  inputSchema: {
    projectPath: z.string().optional(),
    analysis: z.object({
      summary: z.string(),
      observed: z.array(z.string()),
      architecture: z.array(z.string()),
      conventions: z.array(z.string()),
      decisions: z.array(z.string()),
      qualityGates: z.array(z.string()),
      assumptions: z.array(z.string()),
      questions: z.array(questionSchema),
    }),
  },
  annotations: localWrite,
}, async ({ projectPath: path, analysis }) => {
  const root = projectPath(path);
  const profile = await discovery.discover(await discovery.createRef(root));
  await writeProjectArtifacts(profile, analysis as ProjectAnalysis);
  return result({ projectDocument: `${root}/.frontend-system/project.md`, analyzedCommit: profile.project.git.commit });
});

server.registerTool("get_work_context", {
  title: "Build focused frontend work context",
  description: "Return a token-conscious file shortlist, applicable rules, learned references, project constraints, and design evidence for a request.",
  inputSchema: {
    projectPath: z.string().optional(),
    request: z.string(),
    mode: z.enum(["prepare", "implement", "verify"]).default("implement"),
    constraints: z.array(z.string()).default([]),
  },
  annotations: readOnly,
}, async ({ projectPath: path, request, mode, constraints }) => {
  const workRequest: WorkRequest = { raw: request, mode, constraints };
  return result(await taskContext(discovery, systemRoot, projectPath(path), workRequest));
});

server.registerTool("get_change_context", {
  title: "Build frontend change-review context",
  description: "Return the review base, changed-file list, compact diff statistics, project facts, and saved context. The caller should inspect only relevant diff hunks.",
  inputSchema: {
    projectPath: z.string().optional(),
    base: z.string().optional(),
  },
  annotations: readOnly,
}, async ({ projectPath: path, base }) => {
  const root = projectPath(path);
  const selectedBase = await reviewBase(root, base);
  const profile = await discovery.discover(await discovery.createRef(root));
  return result({
    base: selectedBase,
    changedFiles: await changedFiles(root, selectedBase),
    diffStat: await diffStat(root, selectedBase),
    profile,
    projectDocument: await readProjectDocument(root),
  });
});

server.registerTool("run_project_checks", {
  title: "Run discovered project checks",
  description: "Run only existing, non-watch package scripts for unit, integration, e2e, Storybook, types, lint, and build. Test code should be created before calling this tool.",
  inputSchema: { projectPath: z.string().optional() },
  annotations: localWrite,
}, async ({ projectPath: path }) => {
  const root = projectPath(path);
  const profile = await discovery.discover(await discovery.createRef(root));
  return result(await runCapabilities(profile));
});

server.registerTool("knowledge_status", {
  title: "Check source knowledge status",
  description: "Find uncataloged, changed, and not-yet-published source knowledge without reading it into model context.",
  inputSchema: { repositoryRoot: z.string().optional() },
  annotations: readOnly,
}, async ({ repositoryRoot }) => result(await knowledgeStatus(repositoryPath(repositoryRoot))));

server.registerTool("search_knowledge", {
  title: "Search source knowledge metadata",
  description: "Rank a small metadata-only shortlist using catalog facets and lexical terms before the model opens source documents.",
  inputSchema: {
    repositoryRoot: z.string().optional(),
    query: z.string().default(""),
    facets: z.record(z.string(), z.array(z.string())).default({}),
    limit: z.number().int().min(1).max(20).default(5),
  },
  annotations: readOnly,
}, async ({ repositoryRoot, query, facets, limit }) =>
  result(await searchKnowledge(repositoryPath(repositoryRoot), query, facets, limit)));

server.registerTool("catalog_knowledge_document", {
  title: "Catalog normalized source knowledge",
  description: "Hash and catalog an already-written Markdown file under knowledge/source. Exact duplicates are reported and not added.",
  inputSchema: {
    repositoryRoot: z.string().optional(),
    id: z.string(),
    path: z.string(),
    title: z.string(),
    summary: z.string(),
    sourceType: z.enum(["manual", "imported", "attachment"]),
    sourceUrl: z.string().url().optional(),
    facets: z.record(z.string(), z.array(z.string())),
  },
  annotations: localWrite,
}, async ({ repositoryRoot, sourceUrl, ...document }) =>
  result(await catalogKnowledgeDocument(repositoryPath(repositoryRoot), {
    ...document,
    ...(sourceUrl ? { sourceUrl } : {}),
  })));

server.registerTool("mark_knowledge_synced", {
  title: "Mark knowledge references as synced",
  description: "After learned Skill references have been updated, record the corresponding source hashes as published.",
  inputSchema: {
    repositoryRoot: z.string().optional(),
    ids: z.array(z.string()).min(1),
  },
  annotations: localWrite,
}, async ({ repositoryRoot, ids }) => result(await markKnowledgeSynced(repositoryPath(repositoryRoot), ids)));

await server.connect(new StdioServerTransport());
