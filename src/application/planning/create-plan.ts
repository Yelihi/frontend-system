import type { ExecutionPlan, Task, WorkContext, WorkRequest } from "../../domain/types.js";

function riskFor(request: string): Task["risk"] {
  if (/auth|security|payment|migration|보안|인증|결제/i.test(request)) return "high";
  if (/refactor|performance|architecture|리팩터|성능|구조/i.test(request)) return "medium";
  return "low";
}

export function createPlan(request: WorkRequest, context: WorkContext): ExecutionPlan {
  const scope = context.relevantFiles.map(({ path }) => path);
  const common = {
    constraints: request.constraints,
    applicableRuleIds: context.applicableRules.map(({ id }) => id),
    applicableKnowledgeIds: context.applicableKnowledge.map(({ id }) => id),
    risk: riskFor(request.raw),
    status: "pending" as const,
  };
  const inspect: Task = {
    id: "task-001",
    title: "Inspect relevant project context",
    objective: `Establish evidence for: ${request.raw}`,
    rationale: "Implementation decisions must follow the discovered project rather than assumptions.",
    dependencies: [],
    scope: { paths: scope },
    acceptanceCriteria: ["Relevant code paths and constraints are identified with file evidence."],
    ...common,
  };
  const deliver: Task = {
    id: "task-002",
    title: "Deliver the requested outcome",
    objective: request.raw,
    rationale: "Apply the resolved knowledge and rules to the requested scope.",
    dependencies: [inspect.id],
    scope: { paths: scope },
    acceptanceCriteria: [
      "The user request is satisfied within the identified scope.",
      "Higher-priority rules override conflicting project conventions.",
    ],
    ...common,
  };
  const verify: Task = {
    id: "task-003",
    title: "Review and verify the outcome",
    objective: "Review relevant quality dimensions and run discovered project checks.",
    rationale: "Worker output is not accepted without independent review and verification.",
    dependencies: [deliver.id],
    scope: { paths: scope },
    acceptanceCriteria: [
      "Correctness, architecture, security, accessibility, performance, and testing are reviewed as relevant.",
      "Only discovered verification commands are used.",
    ],
    ...common,
  };

  return {
    summary: `Three-step plan for: ${request.raw}`,
    tasks: [inspect, deliver, verify],
    risks: common.risk === "low" ? [] : [`Request classified as ${common.risk} risk.`],
  };
}

export function validatePlan(plan: ExecutionPlan): void {
  const taskIds = new Set(plan.tasks.map(({ id }) => id));
  for (const task of plan.tasks) {
    for (const dependency of task.dependencies) {
      if (!taskIds.has(dependency)) throw new Error(`${task.id} has unknown dependency: ${dependency}`);
      if (dependency === task.id) throw new Error(`${task.id} cannot depend on itself`);
    }
    if (!task.acceptanceCriteria.length) throw new Error(`${task.id} has no acceptance criteria`);
  }
}

