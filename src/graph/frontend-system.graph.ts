import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { randomUUID } from "node:crypto";
import { join } from "node:path";

import { buildWorkContext } from "../application/context/build-work-context.js";
import { KnowledgeResolver } from "../application/knowledge/knowledge-resolver.js";
import { createPlan, validatePlan } from "../application/planning/create-plan.js";
import { RuleResolver } from "../application/rules/rule-resolver.js";
import type {
  EngineeringRule,
  ExecutionPlan,
  KnowledgeGap,
  KnowledgeReference,
  ProjectProfile,
  ProjectRef,
  WorkContext,
  WorkflowEvent,
  WorkRequest,
} from "../domain/types.js";
import type { ProjectDiscoveryPort } from "../ports/project-discovery.port.js";

const WorkflowState = Annotation.Root({
  target: Annotation<ProjectRef>(),
  request: Annotation<WorkRequest>(),
  profile: Annotation<ProjectProfile | undefined>(),
  knowledge: Annotation<KnowledgeReference[]>(),
  knowledgeGaps: Annotation<KnowledgeGap[]>(),
  rules: Annotation<EngineeringRule[]>(),
  context: Annotation<WorkContext | undefined>(),
  plan: Annotation<ExecutionPlan | undefined>(),
  events: Annotation<WorkflowEvent[]>({ reducer: (left, right) => [...left, ...right], default: () => [] }),
});

export interface WorkflowResult {
  target: ProjectRef;
  request: WorkRequest;
  profile: ProjectProfile;
  knowledge: KnowledgeReference[];
  knowledgeGaps: KnowledgeGap[];
  rules: EngineeringRule[];
  context: WorkContext;
  plan?: ExecutionPlan;
  events: WorkflowEvent[];
}

function event(type: string, message: string): WorkflowEvent[] {
  return [{ type, timestamp: new Date().toISOString(), message }];
}

export function createFrontendSystemGraph(
  discovery: ProjectDiscoveryPort,
  knowledgeRoot: string,
  mandatoryRulesRoot: string,
) {
  const knowledgeResolver = new KnowledgeResolver(knowledgeRoot);
  const ruleResolver = new RuleResolver(mandatoryRulesRoot);

  return new StateGraph(WorkflowState)
    .addNode("discoverProject", async (state) => ({
      profile: await discovery.discover(state.target),
      events: event("project.discovered", state.target.rootPath),
    }))
    .addNode("understandRequest", (state) => ({
      events: event("request.understood", state.request.raw),
    }))
    .addNode("resolveKnowledge", async (state) => {
      if (!state.profile) throw new Error("Project must be discovered before knowledge resolution");
      const result = await knowledgeResolver.resolve(state.profile, state.request);
      return {
        knowledge: result.applicable,
        knowledgeGaps: result.gaps,
        events: event("knowledge.resolved", `${result.applicable.length} applicable, ${result.gaps.length} gaps`),
      };
    })
    .addNode("resolveRules", async (state) => {
      if (!state.profile) throw new Error("Project must be discovered before rule resolution");
      const rules = await ruleResolver.resolve(state.profile, state.request, state.knowledge, state.knowledgeGaps);
      return { rules, events: event("rules.resolved", `${rules.length} rules`) };
    })
    .addNode("buildWorkContext", async (state) => {
      if (!state.profile) throw new Error("Project must be discovered before context construction");
      const context = await buildWorkContext(discovery, state.profile, state.request, state.knowledge, state.rules);
      return { context, events: event("context.built", context.summary) };
    })
    .addNode("createPlan", (state) => {
      if (!state.context || state.request.mode === "analyze") return { events: event("plan.skipped", "analyze mode") };
      const plan = createPlan(state.request, state.context);
      return { plan, events: event("plan.created", `${plan.tasks.length} tasks`) };
    })
    .addNode("validatePlan", (state) => {
      if (state.plan) validatePlan(state.plan);
      return { events: event("plan.validated", state.plan ? "valid" : "not requested") };
    })
    .addEdge(START, "discoverProject")
    .addEdge("discoverProject", "understandRequest")
    .addEdge("understandRequest", "resolveKnowledge")
    .addEdge("resolveKnowledge", "resolveRules")
    .addEdge("resolveRules", "buildWorkContext")
    .addEdge("buildWorkContext", "createPlan")
    .addEdge("createPlan", "validatePlan")
    .addEdge("validatePlan", END)
    .compile();
}

export async function runWorkflow(
  discovery: ProjectDiscoveryPort,
  systemRoot: string,
  projectPath: string,
  request: WorkRequest,
): Promise<WorkflowResult> {
  const target = await discovery.createRef(projectPath);
  const graph = createFrontendSystemGraph(
    discovery,
    join(systemRoot, "knowledge"),
    join(systemRoot, "mandatory-rules"),
  );
  const result = await graph.invoke({
    target,
    request,
    knowledge: [],
    knowledgeGaps: [],
    rules: [],
    events: event("run.started", randomUUID()),
  });
  if (!result.profile || !result.context) throw new Error("Workflow completed without required output");
  return result as WorkflowResult;
}

