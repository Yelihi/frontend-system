import { Annotation, END, START, StateGraph } from "@langchain/langgraph";

import type {
  ProjectProfile,
  ReviewAnalysis,
  VerificationResult,
  WorkContext,
  WorkRequest,
} from "../domain/types.js";
import type { AskUser } from "./inspect.graph.js";
import type { ProjectDiscoveryPort } from "../ports/project-discovery.port.js";
import { applyReview, reviewProject, type Reasoner } from "../application/ai-work.js";
import { runCapabilities } from "../application/run-capabilities.js";
import { taskContext } from "../application/task-context.js";
import { writeReport } from "../application/project-store.js";

const VerifyState = Annotation.Root({
  projectPath: Annotation<string>(),
  systemRoot: Annotation<string>(),
  base: Annotation<string>(),
  fix: Annotation<"ask" | "auto" | "never">(),
  request: Annotation<WorkRequest>(),
  profile: Annotation<ProjectProfile | undefined>(),
  document: Annotation<string>(),
  context: Annotation<WorkContext | undefined>(),
  review: Annotation<ReviewAnalysis | undefined>(),
  answers: Annotation<Record<string, string>>(),
  implementation: Annotation<string>(),
  verification: Annotation<VerificationResult[]>(),
  finalReview: Annotation<ReviewAnalysis | undefined>(),
});

function report(review: ReviewAnalysis, verification: VerificationResult[], finalReview: ReviewAnalysis): string {
  const findings = finalReview.findings.length
    ? finalReview.findings.map((finding) => `- **${finding.severity} · ${finding.dimension}** ${finding.title}\n  - ${finding.evidence.join("; ")}\n  - ${finding.proposal}`).join("\n")
    : "- None";
  const checks = verification.length
    ? verification.map((result) => `- ${result.passed ? "PASS" : "FAIL"} \`${result.command}\``).join("\n")
    : "- No project verification commands were discovered.";
  return `# Frontend Verification\n\n${finalReview.summary}\n\n## Initial assessment\n\n${review.summary}\n\n## Findings\n\n${findings}\n\n## Checks\n\n${checks}\n`;
}

export function createVerifyGraph(
  discovery: ProjectDiscoveryPort,
  runner: Reasoner,
  ask: AskUser,
) {
  return new StateGraph(VerifyState)
    .addNode("collect", async (state) => {
      const task = await taskContext(discovery, state.systemRoot, state.projectPath, state.request);
      return { profile: task.profile, document: task.document, context: task.context };
    })
    .addNode("reviewChanges", async (state) => {
      if (!state.context) throw new Error("Verification context is missing");
      return {
        review: await reviewProject(runner, state.projectPath, state.base, state.document, state.context),
      };
    })
    .addNode("ask", async (state) => {
      const answers: Record<string, string> = {};
      if (state.fix === "ask") {
        for (const question of state.review?.questions ?? []) {
          answers[question.id] = await ask(question.question, question.reason);
        }
      }
      return { answers };
    })
    .addNode("apply", async (state) => {
      if (!state.review) throw new Error("Initial review is missing");
      const needsWrite = state.review.tests.length > 0 || (state.fix !== "never" && state.review.findings.length > 0);
      return {
        implementation: needsWrite
          ? await applyReview(runner, state.projectPath, state.base, state.review, state.fix, state.answers)
          : "No test or production changes were required.",
      };
    })
    .addNode("runChecks", async (state) => {
      if (!state.profile) throw new Error("Project profile is missing");
      return { verification: await runCapabilities(state.profile) };
    })
    .addNode("finalizeReview", async (state) => {
      if (!state.context || !state.review) throw new Error("Review context is missing");
      return {
        finalReview: await reviewProject(
          runner,
          state.projectPath,
          state.base,
          state.document,
          state.context,
          state.verification,
        ),
      };
    })
    .addEdge(START, "collect")
    .addEdge("collect", "reviewChanges")
    .addEdge("reviewChanges", "ask")
    .addEdge("ask", "apply")
    .addEdge("apply", "runChecks")
    .addEdge("runChecks", "finalizeReview")
    .addEdge("finalizeReview", END)
    .compile();
}

export async function verifyProject(
  discovery: ProjectDiscoveryPort,
  runner: Reasoner,
  ask: AskUser,
  input: {
    projectPath: string;
    systemRoot: string;
    base: string;
    fix: "ask" | "auto" | "never";
    request: WorkRequest;
  },
): Promise<{ review: ReviewAnalysis; finalReview: ReviewAnalysis; verification: VerificationResult[]; reportPath: string }> {
  const result = await createVerifyGraph(discovery, runner, ask).invoke({
    ...input,
    document: "",
    answers: {},
    implementation: "",
    verification: [],
  });
  if (!result.review || !result.finalReview) throw new Error("Verification completed without a review");
  const reportPath = await writeReport(
    input.projectPath,
    "latest.md",
    report(result.review, result.verification, result.finalReview),
  );
  return {
    review: result.review,
    finalReview: result.finalReview,
    verification: result.verification,
    reportPath,
  };
}
