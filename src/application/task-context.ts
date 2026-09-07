import { join } from "node:path";

import { buildWorkContext } from "./context/build-work-context.js";
import { KnowledgeResolver } from "./knowledge/knowledge-resolver.js";
import { RuleResolver } from "./rules/rule-resolver.js";
import { readProjectDocument } from "./project-store.js";
import type { ProjectProfile, WorkContext, WorkRequest } from "../domain/types.js";
import type { ProjectDiscoveryPort } from "../ports/project-discovery.port.js";

export async function taskContext(
  discovery: ProjectDiscoveryPort,
  systemRoot: string,
  projectPath: string,
  request: WorkRequest,
): Promise<{ profile: ProjectProfile; context: WorkContext; document: string }> {
  const profile = await discovery.discover(await discovery.createRef(projectPath));
  const knowledge = await new KnowledgeResolver(join(systemRoot, "knowledge")).resolve(profile, request);
  const rules = await new RuleResolver(join(systemRoot, "mandatory-rules")).resolve(
    profile,
    request,
    knowledge.applicable,
    knowledge.gaps,
  );
  return {
    profile,
    context: await buildWorkContext(discovery, profile, request, knowledge.applicable, rules),
    document: await readProjectDocument(projectPath),
  };
}
