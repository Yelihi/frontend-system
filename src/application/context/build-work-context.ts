import { relative } from "node:path";

import type {
  EngineeringRule,
  KnowledgeReference,
  ProjectProfile,
  WorkContext,
  WorkRequest,
} from "../../domain/types.js";
import type { ProjectDiscoveryPort } from "../../ports/project-discovery.port.js";
import { terms } from "../knowledge/knowledge-resolver.js";

export async function buildWorkContext(
  discovery: ProjectDiscoveryPort,
  profile: ProjectProfile,
  request: WorkRequest,
  knowledge: KnowledgeReference[],
  rules: EngineeringRule[],
): Promise<WorkContext> {
  const query = terms(request.raw);
  const files = (await discovery.listFiles(profile.project.rootPath)).map((path) =>
    relative(profile.project.rootPath, path),
  );
  const structuralSamples = new Set<string>();
  for (const sourceDirectory of profile.paths.sourceDirectories) {
    const sourceFiles = files.filter((path) => path.startsWith(`${sourceDirectory}/`));
    for (const path of sourceFiles) {
      const relativeSourcePath = path.slice(sourceDirectory.length + 1);
      const section = relativeSourcePath.split("/")[0];
      if (!section || structuralSamples.has(`${sourceDirectory}/${section}`)) continue;
      structuralSamples.add(path);
      structuralSamples.add(`${sourceDirectory}/${section}`);
    }
  }
  const relevantFiles = files
    .map((path) => ({
      path,
      score:
        (path.endsWith("package.json") ? 3 : 0) +
        (/^readme\.md$/i.test(path) ? 2 : 0) +
        (profile.paths.configFiles.includes(path) ? 2 : 0) +
        (structuralSamples.has(path) ? 2 : 0) +
        query.filter((term) => path.toLowerCase().includes(term)).length,
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path))
    .slice(0, 30)
    .map(({ path, score }) => ({
      path,
      reason: score >= 3 ? "project entry/configuration" : structuralSamples.has(path) ? "architecture sample" : "matches request",
    }));
  const requestTerms = new Set(query);
  const relevantTechnologies = profile.technologies.filter(
    (technology) =>
      ["framework", "library", "build-tool"].includes(technology.category ?? "") ||
      terms(technology.name).some((term) => requestTerms.has(term)),
  );
  const relevantModules = [
    ...new Set(relevantFiles.map(({ path }) => (path.includes("/") ? path.split("/")[0] ?? path : "root"))),
  ];

  return {
    relevantFiles,
    relevantModules,
    relevantTechnologies,
    applicableKnowledge: knowledge,
    applicableRules: rules,
    projectConstraints: profile.constraints,
    summary: `${profile.project.name}: ${relevantFiles.length} relevant files, ${relevantTechnologies.length} relevant technologies, ${rules.length} resolved rules.`,
  };
}
