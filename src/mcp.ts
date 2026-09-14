#!/usr/bin/env node
import { dirname, relative, resolve } from "node:path";
import { existsSync } from "node:fs";
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
import { runProjectChecks } from "./application/run-capabilities.js";
import {
  approveRevision, digest, executionSchema, readCheckRecord, readProjectRecord, readRevision, recordId,
  saveExecution, saveProjectRecord, saveRevision, workflowContext,
} from "./application/workflow-store.js";
import { taskContext } from "./application/task-context.js";
import type { ProjectAnalysis, ProjectConfig, WorkRequest } from "./domain/types.js";

const moduleDirectory = dirname(fileURLToPath(import.meta.url));
const systemRoot = resolve(moduleDirectory, existsSync(resolve(moduleDirectory, "../skills")) ? ".." : "../..");
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

server.registerTool("list_project_files", {
  title: "Page through the whole project inventory",
  description: "List every non-generated file without depth or count truncation. Exclusions and unfollowed symlinks are explicit; inventory coverage is not semantic analysis.",
  inputSchema: { projectPath: z.string().optional(), offset: z.number().int().min(0).default(0), limit: z.number().int().min(1).max(1000).default(200), expectedHash: z.string().optional() },
  annotations: readOnly,
}, async ({ projectPath: path, offset, limit, expectedHash }) => {
  const root = projectPath(path);
  const inventory = await discovery.inventory(root);
  const files = inventory.files.map((file) => relative(root, file));
  const hash = digest(JSON.stringify(files));
  if (expectedHash && hash !== expectedHash) throw new Error("Inventory changed; restart pagination");
  return result({ files: files.slice(offset, offset + limit), total: files.length, hash,
    nextOffset: offset + limit < files.length ? offset + limit : null, excluded: inventory.excluded, warnings: inventory.warnings });
});

server.registerTool("get_workflow_context", {
  title: "Read revision, decisions, and resume state",
  description: "Return project records and detect source or revision changes since the checkpoint. Stored completion is historical, not proof of current verification.",
  inputSchema: { projectPath: z.string().optional() }, annotations: readOnly,
}, async ({ projectPath: path }) => result(await workflowContext(projectPath(path))));

server.registerTool("get_revision", {
  title: "Read a revision window",
  description: "Read the current target design with its content hash and effective approval. Read all relevant windows before discussing or approving it.",
  inputSchema: { projectPath: z.string().optional(), offset: z.number().int().min(0).default(0), limit: z.number().int().min(1).max(500).default(200) }, annotations: readOnly,
}, async ({ projectPath: path, offset, limit }) => {
  const revision = await readRevision(projectPath(path));
  const lines = revision.content.split("\n");
  return result({ ...revision, content: lines.slice(offset, offset + limit).join("\n"), totalLines: lines.length, nextOffset: offset + limit < lines.length ? offset + limit : null });
});

server.registerTool("save_revision", {
  title: "Save an unapproved target design",
  description: "Save a revision draft and preserve the previous content in history. Every save invalidates approval. Pass the current hash, or null for a new project.",
  inputSchema: { projectPath: z.string().optional(), content: z.string().min(1), expectedHash: z.string().nullable() }, annotations: localWrite,
}, async ({ projectPath: path, content, expectedHash }) => result(await saveRevision(projectPath(path), content, expectedHash)));

server.registerTool("approve_revision", {
  title: "Record explicit user approval of a revision",
  description: "Call only after the user approves this exact target design. Record their approval, never infer it from a request to analyze or draft. Does not start implementation.",
  inputSchema: { projectPath: z.string().optional(), expectedHash: z.string(), approval: z.string().min(1) }, annotations: localWrite,
}, async ({ projectPath: path, expectedHash, approval }) => result(await approveRevision(projectPath(path), expectedHash, approval)));

server.registerTool("save_project_record", {
  title: "Save project evidence or a scoped decision",
  description: "Write Markdown evidence or decisions, preserving provenance, scope, alternatives, tradeoffs, uncertainty and recheck conditions. Project recording never promotes a decision to shared knowledge.",
  inputSchema: { projectPath: z.string().optional(), kind: z.enum(["evidence", "decisions"]), id: recordId, content: z.string().min(1), expectedHash: z.string().nullable() }, annotations: localWrite,
}, async ({ projectPath: path, kind, id, content, expectedHash }) => result(await saveProjectRecord(projectPath(path), kind, id, content, expectedHash)));

server.registerTool("get_project_record", {
  title: "Read selected evidence or decision",
  description: "Read a bounded window of a project record selected from workflow context.",
  inputSchema: { projectPath: z.string().optional(), kind: z.enum(["evidence", "decisions"]), id: recordId, offset: z.number().int().min(0).default(0), limit: z.number().int().min(1).max(500).default(200) }, annotations: readOnly,
}, async ({ projectPath: path, kind, id, offset, limit }) => result(await readProjectRecord(projectPath(path), kind, id, offset, limit)));

server.registerTool("save_execution", {
  title: "Checkpoint a refactoring execution",
  description: "Record stages against the approved revision. Reconcile source changes before saving. Newly completed stages require current passing checks; complete execution requires a full current check. Never edit product files or reset user changes here.",
  inputSchema: { projectPath: z.string().optional(), expectedHash: z.string().nullable(), execution: executionSchema }, annotations: localWrite,
}, async ({ projectPath: path, expectedHash, execution }) => result(await saveExecution(projectPath(path), execution, expectedHash)));

server.registerTool("get_check_record", {
  title: "Read recorded check evidence",
  description: "Return an immutable baseline or verification record. Matching failure status does not prove the same failure cause.",
  inputSchema: { projectPath: z.string().optional(), id: recordId }, annotations: readOnly,
}, async ({ projectPath: path, id }) => result(await readCheckRecord(projectPath(path), id)));

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
    openDesignMode: z.enum(["cloud", "local-codex", "byok"]).optional(),
    openDesignProjectId: z.uuid().nullable().optional().describe("Verified OpenDesign project ID; null clears the binding. Omitted settings are preserved for the same provider."),
  },
  annotations: localWrite,
}, async ({ projectPath: path, designProvider, designProviderScope, openDesignMode, openDesignProjectId }) => {
  const root = projectPath(path);
  const previous = await readProjectConfig(root);
  const config: ProjectConfig = {
    version: 1,
    designProvider: {
      ...(previous?.designProvider.name === designProvider ? previous.designProvider : {}),
      name: designProvider,
      ...(designProviderScope ? { scope: designProviderScope } : {}),
      ...(openDesignMode ? { mode: openDesignMode } : {}),
      ...(openDesignProjectId ? { projectId: openDesignProjectId } : {}),
    },
  };
  if (openDesignProjectId === null) delete config.designProvider.projectId;
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
  return result({ projectDocument: `${root}/.frontend-system/init.md`, analyzedCommit: profile.project.git.commit });
});

server.registerTool("get_work_context", {
  title: "Build focused frontend work context",
  description: "Return a token-conscious file shortlist, applicable rules, learned references, project constraints, and design evidence for a request.",
  inputSchema: {
    projectPath: z.string().optional(),
    request: z.string(),
    mode: z.enum(["prepare", "implement", "verify", "review", "refactor"]).default("implement"),
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
  inputSchema: { projectPath: z.string().optional(), capabilities: z.array(z.string()).min(1).optional(), purpose: z.enum(["baseline", "verification"]).default("verification"), baselineCheckId: recordId.optional() },
  annotations: localWrite,
}, async ({ projectPath: path, capabilities, purpose, baselineCheckId }) => {
  const root = projectPath(path);
  const profile = await discovery.discover(await discovery.createRef(root));
  return result(await runProjectChecks(profile, { capabilities, purpose, baselineCheckId }));
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
