import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import * as z from "zod/v4";
import { sourceSnapshot } from "./workflow-store.js";

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
  return await optionalRead(join(root, directoryName, "init.md")) || optionalRead(join(root, directoryName, "project.md"));
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
    section("Architecture", analysis.architecture),
    section("Conventions", analysis.conventions),
    section("Decisions", analysis.decisions),
    section("Quality Gates", analysis.qualityGates),
    section("Assumptions", analysis.assumptions),
    section("Open Questions", analysis.questions.map(({ question, reason }) => `${question} — ${reason}`)),
    "",
  ].join("\n\n");
}

export async function writeProjectArtifacts(profile: ProjectProfile, analysis: ProjectAnalysis): Promise<void> {
  const directory = join(profile.project.rootPath, directoryName);
  await mkdir(join(directory, "reports"), { recursive: true });
  const ignorePath = join(directory, ".gitignore");
  const ignored = await optionalRead(ignorePath);
  const missing = ["state.json", "reports/", ".workflow-lock/"].filter((line) => !ignored.split(/\r?\n/).includes(line));
  if (missing.length) await writeFile(ignorePath, `${ignored}${ignored && !ignored.endsWith("\n") ? "\n" : ""}${missing.join("\n")}\n`);
  const legacy = await optionalRead(join(directory, "project.md"));
  const content = renderProject(profile, analysis) + (legacy ? "\nLegacy context (preserved): [project.md](project.md). Reconcile its decisions before superseding them.\n" : "");
  await Promise.all([
    writeFile(join(directory, "init.md"), content),
    writeFile(join(directory, "state.json"), JSON.stringify({
      ...(profile.project.git.commit ? { analyzedCommit: profile.project.git.commit } : {}),
      fileHashes: await sourceSnapshot(profile.project.rootPath),
      updatedAt: new Date().toISOString(),
    } satisfies ProjectState, null, 2)),
  ]);
}

export async function writeReport(root: string, name: string, content: string): Promise<string> {
  const directory = join(root, directoryName, "reports");
  await mkdir(directory, { recursive: true });
  const path = join(directory, name);
  await writeFile(path, content);
  return path;
}
