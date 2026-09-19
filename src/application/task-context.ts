import { join } from "node:path";

import { buildWorkContext } from "./context/build-work-context.js";
import { KnowledgeResolver } from "./knowledge/knowledge-resolver.js";
import { RuleResolver } from "./rules/rule-resolver.js";
import { readProjectConfig, readProjectDocument, readProjectState } from "./project-store.js";
import { sourceSnapshot, workflowContext } from "./workflow-store.js";
import type { WorkRequest } from "../domain/types.js";
import type { ProjectDiscoveryPort } from "../ports/project-discovery.port.js";

export async function taskContext(
  discovery: ProjectDiscoveryPort,
  systemRoot: string,
  projectPath: string,
  request: WorkRequest,
) {
  const profile = await discovery.discover(await discovery.createRef(projectPath));
  const knowledge = await new KnowledgeResolver(join(systemRoot, "references", "learned")).resolve(profile, request);
  const rules = await new RuleResolver(join(systemRoot, "mandatory-rules")).resolve(
    profile,
    request,
    knowledge.applicable,
    knowledge.gaps,
  );
  const previous = await readProjectState(projectPath);
  const current = previous ? await sourceSnapshot(projectPath) : undefined;
  const workflow = await workflowContext(projectPath);
  const inspectionChanges = previous && current ? [...new Set([...Object.keys(previous.fileHashes), ...Object.keys(current)])]
    .filter((path) => previous.fileHashes[path] !== current[path]).sort() : [];
  return {
    inspection: { recorded: !!previous, changedFiles: inspectionChanges, needsRefresh: !previous || inspectionChanges.length > 0 },
    // Pinned policy is returned here independently of lexical knowledge search.
    workflow,
    focus: ["prepare", "inspect", "review"].includes(request.mode) ? "design" : "implementation",
    config: await readProjectConfig(projectPath),
    profile,
    context: await buildWorkContext(discovery, profile, request, knowledge.applicable, rules),
    document: await readProjectDocument(projectPath),
  };
}
