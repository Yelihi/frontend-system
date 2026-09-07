import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import type { ProjectAnalysis, ProjectProfile, ProjectState } from "../domain/types.js";

const directoryName = ".frontend-system";

async function optionalRead(path: string): Promise<string> {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return "";
    throw error;
  }
}

export async function readProjectDocument(root: string): Promise<string> {
  return optionalRead(join(root, directoryName, "project.md"));
}

export async function readProjectState(root: string): Promise<ProjectState | undefined> {
  const content = await optionalRead(join(root, directoryName, "state.json"));
  return content ? JSON.parse(content) as ProjectState : undefined;
}

async function hashes(profile: ProjectProfile): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  for (const path of [...profile.paths.manifests, ...profile.paths.configFiles]) {
    try {
      result[path] = createHash("sha256").update(await readFile(join(profile.project.rootPath, path))).digest("hex");
    } catch {
      // A file can disappear between discovery and persistence; the next inspect will reconcile it.
    }
  }
  return result;
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
  await Promise.all([
    writeFile(join(directory, ".gitignore"), "state.json\nreports/\n"),
    writeFile(join(directory, "project.md"), renderProject(profile, analysis)),
    writeFile(join(directory, "state.json"), JSON.stringify({
      ...(profile.project.git.commit ? { analyzedCommit: profile.project.git.commit } : {}),
      fileHashes: await hashes(profile),
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
