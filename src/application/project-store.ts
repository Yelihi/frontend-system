import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import * as z from "zod/v4";
import { atomic, digest, directory, locked, sourceSnapshot } from "./workflow-store.js";

import { projectSnapshot } from "./project-snapshot.js";
import { validateProjectEvidence } from './design-evidence.js';
import {prepareProjectReport} from './project-report.js';

import type { ProjectAnalysis, ProjectConfig, ProjectProfile, ProjectState } from "../domain/types.js";

const directoryName = ".frontend-system";
const configSchema = z.strictObject({
  version: z.literal(1),
  designProvider: z.discriminatedUnion("name", [
    z.strictObject({ name: z.literal("built-in"), scope: z.enum(["project", "user"]).optional() }),
    z.strictObject({
      name: z.literal("open-design"),
      scope: z.enum(["project", "user"]).optional(),
      mode: z.enum(["cloud", "local-codex", "byok"]).optional(),
      projectId: z.uuid().optional(),
    }),
  ]),
});

async function optionalRead(path: string): Promise<string> {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return "";
    throw error;
  }
}

export async function readProjectDocument(root: string): Promise<string> {
  return await optionalRead(join(root, directoryName, "project.md")) || optionalRead(join(root, directoryName, "init.md"));
}

export async function readProjectAiContext(root: string): Promise<string> {
  const document = await readProjectDocument(root);
  const match = /<!-- fs-project-context ([a-f0-9]{64}) -->/.exec(document);
  if (!match) return document;
  const content = await readFile(join(root, directoryName, 'evidence', `context-${match[1]}.json`), 'utf8');
  if (digest(content) !== match[1]) throw new Error('Project AI context changed; refresh the analysis');
  return content;
}

export async function readProjectConfig(root: string): Promise<ProjectConfig | undefined> {
  const content = await optionalRead(join(root, directoryName, "config.json"));
  return content ? configSchema.parse(JSON.parse(content)) : undefined;
}

export async function writeProjectConfig(root: string, config: ProjectConfig): Promise<void> {
  const validated = configSchema.parse(config);
  const directory = join(root, directoryName);
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, "config.json"), `${JSON.stringify(validated, null, 2)}\n`);
}

export async function readProjectState(root: string): Promise<ProjectState | undefined> {
  const content = await optionalRead(join(root, directoryName, "state.json"));
  return content ? JSON.parse(content) as ProjectState : undefined;
}

function section(title: string, entries: string[]): string {
  return `## ${title}\n\n${entries.length ? entries.map((entry) => `- ${entry}`).join("\n") : "- None"}`;
}

function renderProject(profile: ProjectProfile, analysis: ProjectAnalysis): string {
  return [
    `# ${profile.project.name} Frontend Context`,
    `\n> Generated from ${profile.project.git.commit ?? "an uncommitted tree"}. Verify evidence before changing approved decisions.`,
    `\n${analysis.summary}`,
    section("Observed", analysis.observed),
    section("Domains and routes", analysis.domains ?? []),
    section("Events and calls", analysis.events ?? []),
    section("Architecture", analysis.architecture),
    section("State and data fetching", analysis.state ?? []),
    section("Styles", analysis.styles ?? []),
    section("Tests and evidence", analysis.tests ?? []),
    section("Conventions", analysis.conventions),
    section("Decisions", analysis.decisions),
    section("Quality Gates", analysis.qualityGates),
    section("Assumptions", analysis.assumptions),
    section("Open Questions", analysis.questions.map(({ question, reason }) => `${question} — ${reason}`)),
    "",
  ].join("\n\n");
}

export async function writeProjectArtifacts(profile: ProjectProfile, analysis: ProjectAnalysis, options: {
  baseRef?: string | undefined; expectedCommit?: string | null | undefined; expectedHash?: string | null | undefined;
} = {}) {
  const root = profile.project.rootPath;
  return locked(root, async () => {
    const snapshot = await projectSnapshot(root, options.baseRef);
    if (snapshot.commit && options.expectedCommit !== snapshot.commit) throw new Error("Save context against the inspected main commit; main may have changed");
    if (!snapshot.commit && options.expectedCommit) throw new Error("The inspected main commit is unavailable");
    const base = await directory(root);
    const path = join(base, "project.md");
    const previous = await optionalRead(path);
    if (options.expectedHash !== undefined && (previous ? digest(previous) : null) !== options.expectedHash) throw new Error("Project document changed; reread before saving");
    if (snapshot.commit && options.expectedHash === undefined) throw new Error("Provide the current project document hash (null for a new document)");
    const legacy = await optionalRead(join(base, "init.md"));
    if (previous) await atomic(join(await directory(root, "project-history"), `${digest(previous)}.md`), previous);
    const metadata = { baseRef: snapshot.baseRef, analyzedCommit: snapshot.commit, sourceHash: snapshot.sourceHash, updatedAt: new Date().toISOString(), analysisStatus:analysis.report?.status ?? 'legacy' };
    const evidence = analysis.evidence ? await validateProjectEvidence(root, analysis.evidence, snapshot.baseRef, snapshot.commit) : null;
    const evidenceBody = evidence ? JSON.stringify(evidence) : null;
    const evidenceHash = evidenceBody ? digest(evidenceBody) : null;
    if (analysis.report && (!evidence || !evidenceHash || !snapshot.commit)) throw new Error('Project report requires structured evidence and a committed baseline');
    const report = analysis.report && evidence && evidenceHash && snapshot.commit
      ? await prepareProjectReport(root, analysis.report, evidence, evidenceHash, {baseRef:snapshot.baseRef, expectedCommit:snapshot.commit}) : null;
    const contextBody = report ? JSON.stringify({...report.context, summary:analysis.summary,
      conventions:analysis.conventions, decisions:analysis.decisions, qualityGates:analysis.qualityGates,
      assumptions:analysis.assumptions, questions:analysis.questions}) : null;
    const contextHash = contextBody ? digest(contextBody) : null;
    // Write projections before switching the document pointer; failures preserve the old baseline.
    if (report && contextBody && contextHash) {
      await atomic(join(await directory(root, 'evidence'), `context-${contextHash}.json`), contextBody);
      for (const artifact of report.artifacts) await atomic(join(await directory(root, 'diagrams'), artifact.path.slice('diagrams/'.length)), artifact.content);
    }
    if (evidenceBody) await atomic(join(await directory(root, 'evidence'), `project-${evidenceHash}.json`), evidenceBody);
    const mainProfile = { ...profile, project: { ...profile.project, git: { ...profile.project.git, ...(snapshot.commit ? { commit: snapshot.commit } : {}) } } };
    const content = [
      `<!-- frontend-system-context ${JSON.stringify(metadata)} -->`,
      renderProject(mainProfile, analysis),
      ...(report ? [
        `<!-- fs-project-context ${contextHash} -->`,
        `## Analysis delivery\n\nStatus: **${report.context.analysisStatus}**. This is static analysis, not runtime verification.\n\n[AI context](evidence/context-${contextHash}.json) · Read selected records by ID; diagrams are human projections.`,
        `## Detailed project analysis\n\n${report.details}`,
      ] : []),
      ...(evidence ? [
        `<!-- fs-project-evidence ${evidenceHash} -->`,
        `## Evidence and coverage\n\nCoverage: ${evidence.completeness}. Citations are checked; semantic accuracy is a host judgment.`,
        `Detailed statements and file coverage: [evidence](evidence/project-${evidenceHash}.json). Read only the relevant statements/flows for a task.`,
        `Statements: ${evidence.statements.length}; pending/blocked files: ${evidence.coverage.filter(item => ['pending', 'blocked'].includes(item.status)).length}.`,
      ] : ['Analysis format: legacy; structured claim evidence has not been recorded.']),
      `Tracked files: ${snapshot.files.length}. Page get_project_snapshot for the complete baseline inventory.`,
      `Package manifests: ${Object.keys(snapshot.manifests).join(", ") || "none"}. Read selected manifests from the baseline snapshot.`,
      ...(await optionalRead(join(base, 'analysis/index.md')) ? ["## Flow and improvement index\n\n[Flow/finding index](analysis/index.md). Query get_project_analysis for working-tree freshness; the baseline report pins its own observed versions."] : ["Flow/finding index has not been saved. No reusable flow is implied."]),
      snapshot.commit ? `Base: ${snapshot.baseRef} @ ${snapshot.commit}. Check current status with get_project_snapshot; local edits are not main facts.` : "No committed main baseline. This is initial context, not verified main state.",
      legacy ? "Previous inspection preserved: [init.md](init.md). Reconcile its decisions explicitly." : "",
      previous ? `Previous context preserved: [history](project-history/${digest(previous)}.md).` : "",
      "",
    ].join("\n\n");
    // Recheck after generation; a failed refresh preserves the last successful document.
    if ((await projectSnapshot(root, options.baseRef)).commit !== snapshot.commit) throw new Error("Main changed during context generation; retry with new facts");
    await atomic(path, content);
    await rm(join(base, "project-refresh.json"), { force: true });
    const ignored = await optionalRead(join(base, ".gitignore"));
    const missing = ["state.json", "reports/", ".workflow-lock/"].filter((line) => !ignored.split(/\r?\n/).includes(line));
    if (missing.length) await atomic(join(base, ".gitignore"), `${ignored}${ignored && !ignored.endsWith("\n") ? "\n" : ""}${missing.join("\n")}\n`);
    await atomic(join(base, "state.json"), JSON.stringify({
      ...(snapshot.commit ? { analyzedCommit: snapshot.commit } : {}),
      fileHashes: snapshot.workingChanges.length ? {} : await sourceSnapshot(root), updatedAt: metadata.updatedAt,
    } satisfies ProjectState, null, 2));
    return {analysisStatus:analysis.report?.status ?? 'legacy',
      aiContext:contextHash ? join(base, 'evidence', `context-${contextHash}.json`) : null,
      diagrams:report?.artifacts.map(a => ({path:a.absolutePath, hash:digest(a.content)})) ?? []};
  });
}

export async function writeReport(root: string, name: string, content: string): Promise<string> {
  const directory = join(root, directoryName, "reports");
  await mkdir(directory, { recursive: true });
  const path = join(directory, name);
  await writeFile(path, content);
  return path;
}
