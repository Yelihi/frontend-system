import { Annotation, END, START, StateGraph } from "@langchain/langgraph";

import type { ProjectAnalysis, ProjectProfile, ProjectState } from "../domain/types.js";
import type { ProjectDiscoveryPort } from "../ports/project-discovery.port.js";
import { changedFiles } from "../application/git-state.js";
import { readProjectDocument, readProjectState } from "../application/project-store.js";

export interface InspectInput {
  rootPath: string;
  overall: boolean;
}

export interface InspectAnalysisInput {
  profile: ProjectProfile;
  existingDocument: string;
  changedFiles: string[];
  overall: boolean;
  previous?: ProjectAnalysis;
  answers?: Record<string, string>;
}

export type InspectAnalyzer = (input: InspectAnalysisInput) => Promise<ProjectAnalysis>;
export type AskUser = (question: string, reason: string) => Promise<string>;

const InspectState = Annotation.Root({
  rootPath: Annotation<string>(),
  overall: Annotation<boolean>(),
  profile: Annotation<ProjectProfile | undefined>(),
  priorState: Annotation<ProjectState | undefined>(),
  existingDocument: Annotation<string>(),
  changedFiles: Annotation<string[]>(),
  draft: Annotation<ProjectAnalysis | undefined>(),
  answers: Annotation<Record<string, string>>(),
  analysis: Annotation<ProjectAnalysis | undefined>(),
});

export function createInspectGraph(
  discovery: ProjectDiscoveryPort,
  analyze: InspectAnalyzer,
  ask: AskUser,
) {
  return new StateGraph(InspectState)
    .addNode("discover", async (state) => {
      const profile = await discovery.discover(await discovery.createRef(state.rootPath));
      const priorState = await readProjectState(state.rootPath);
      const changes = priorState?.analyzedCommit
        ? await changedFiles(state.rootPath, priorState.analyzedCommit).catch(() => [])
        : [...profile.paths.manifests, ...profile.paths.configFiles, ...profile.paths.sourceDirectories];
      return {
        profile,
        priorState,
        existingDocument: await readProjectDocument(state.rootPath),
        changedFiles: changes,
      };
    })
    .addNode("analyze", async (state) => {
      if (!state.profile) throw new Error("Project discovery did not produce a profile");
      const draft = await analyze({
        profile: state.profile,
        existingDocument: state.existingDocument,
        changedFiles: state.changedFiles,
        overall: state.overall,
      });
      return { draft, analysis: state.overall || !draft.questions.length ? draft : undefined };
    })
    .addNode("ask", async (state) => {
      const answers: Record<string, string> = {};
      for (const question of state.draft?.questions ?? []) {
        answers[question.id] = await ask(question.question, question.reason);
      }
      return { answers };
    })
    .addNode("finalize", async (state) => {
      if (!state.profile || !state.draft) throw new Error("Inspection draft is missing");
      return {
        analysis: await analyze({
          profile: state.profile,
          existingDocument: state.existingDocument,
          changedFiles: state.changedFiles,
          overall: state.overall,
          previous: state.draft,
          answers: state.answers,
        }),
      };
    })
    .addEdge(START, "discover")
    .addEdge("discover", "analyze")
    .addConditionalEdges("analyze", (state) => state.analysis ? END : "ask")
    .addEdge("ask", "finalize")
    .addEdge("finalize", END)
    .compile();
}

export async function inspectProject(
  discovery: ProjectDiscoveryPort,
  analyze: InspectAnalyzer,
  ask: AskUser,
  input: InspectInput,
): Promise<{ profile: ProjectProfile; analysis: ProjectAnalysis }> {
  const result = await createInspectGraph(discovery, analyze, ask).invoke({
    ...input,
    existingDocument: "",
    changedFiles: [],
    answers: {},
  });
  if (!result.profile || !result.analysis) throw new Error("Inspection completed without analysis");
  return { profile: result.profile, analysis: result.analysis };
}

