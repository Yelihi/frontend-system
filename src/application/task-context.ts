import { join, relative } from "node:path";

import { projectDocumentStatus } from "./project-snapshot.js";
import { buildWorkContext } from "./context/build-work-context.js";
import { KnowledgeResolver } from "./knowledge/knowledge-resolver.js";
import { RuleResolver } from "./rules/rule-resolver.js";
import { readProjectConfig, readProjectDocument, readProjectState } from "./project-store.js";
import { listPlans, sourceSnapshot, workflowContext } from "./workflow-store.js";
import type { WorkRequest } from "../domain/types.js";
import type { ProjectDiscoveryPort } from "../ports/project-discovery.port.js";
import { routeKnowledge } from './knowledge/routing.js';
import { rememberAnalysis } from './analysis-receipts.js';
import { contentHash } from './knowledge/reference-index.js';
import { readProjectEvidence } from './design-evidence.js';
import { retrieveProjectFacts } from './project-facts.js';
import {getProjectAnalysis} from './project-flows.js';

export async function taskContext(
  discovery: ProjectDiscoveryPort,
  systemRoot: string,
  projectPath: string,
  request: WorkRequest,
  planId?: string,
) {
  const profile = await discovery.discover(await discovery.createRef(projectPath));
  if (request.observations?.length) {
    const files = new Set((await discovery.listFiles(projectPath)).map((path) => relative(projectPath, path)));
    if (request.observations.some((item) => !files.has(item.path))) throw new Error("Observations must cite existing project files");
  }
  const knowledge = await new KnowledgeResolver(join(systemRoot, "references", "learned")).resolve(profile, request);
  const rules = await new RuleResolver(join(systemRoot, "mandatory-rules")).resolve(
    profile,
    request,
    knowledge.applicable,
    knowledge.gaps,
  );
  const previous = await readProjectState(projectPath);
  const current = previous ? await sourceSnapshot(projectPath) : undefined;
  const workflow = await workflowContext(projectPath, planId);
  const inspectionChanges = previous && current ? [...new Set([...Object.keys(previous.fileHashes), ...Object.keys(current)])]
    .filter((path) => previous.fileHashes[path] !== current[path]).sort() : [];
  const document = await readProjectDocument(projectPath);
  const context = await buildWorkContext(discovery, profile, request, knowledge.applicable, rules);
  const files = request.files ?? context.relevantFiles.map(({path}) => path).filter((path) => /\.[cm]?[jt]sx?$/.test(path)).slice(0, 40);
  const storedProject = await readProjectEvidence(projectPath).then(value => ({record: value.record, error: null}),
    (error: unknown) => ({record: null, error: String(error)}));
  const projectFacts = storedProject.record ? await retrieveProjectFacts(projectPath, systemRoot, storedProject.record, files, request.interpretations, request.snapshot)
    : {facts: [], interpretations: request.interpretations ?? [], guards: [], matched: 0, omitted: 0,
      authority: 'No reusable project evidence; inspect the selected scope.', unavailable: storedProject.error};
  const routing = files.length ? await routeKnowledge(projectPath, systemRoot, {
    ...(request.includeRelations !== undefined ? {includeRelations: request.includeRelations} : {}),
    files, query: [request.raw, ...request.constraints, ...(request.observations ?? []).map(({observation}) => observation)].join('\n').slice(0, 2000),
    technologies: profile.technologies.map(({name}) => name),
    requirements: request.requirements ?? [],
    interpretations: projectFacts.interpretations,
    ...(projectFacts.guards.length ? {factGuards: projectFacts.guards} : {}),
    ...(request.snapshot ? {snapshot: request.snapshot} : {}),
  }) : {status: 'not-run', reason: 'No source files selected; supply files explicitly. This is not a no-matches result.'};
  const contextId = 'hash' in routing ? await rememberAnalysis(projectPath, document ? contentHash(document) : null, routing) : null;
  return {
    projectDocumentStatus: await projectDocumentStatus(projectPath),
    inspection: { recorded: !!previous, changedFiles: inspectionChanges, needsRefresh: !previous || inspectionChanges.length > 0 },
    // Pinned policy is returned here independently of lexical knowledge search.
    workflow, plans: await listPlans(projectPath),
    routing, contextId, projectFacts,
    projectAnalysis: await getProjectAnalysis(projectPath, systemRoot, {files}),
    knowledgeSelection: { observations: request.observations ?? [], gaps: knowledge.gaps,
      inspectWith: "Routing already executed. Read relevant reference bodies; request more code or semantic discovery only for unresolved scope.",
      status: "Candidates only; inspect code and reference conditions before adoption" },
    focus: ["prepare", "inspect", "review"].includes(request.mode) ? "design" : "implementation",
    config: await readProjectConfig(projectPath),
    profile,
    context,
    document: document.slice(0, 12000), documentTruncated: document.length > 12000,
  };
}

export function summarizeWorkflow(state: Awaited<ReturnType<typeof workflowContext>>) {
  const { revision, execution, ...rest } = state;
  return { ...rest,
    next: !revision.approved || revision.drifted
      ? 'Before product/test edits, record the evidence-backed plan and actual user approval through fs-plan. A supplied plan document alone is not an approved MCP revision. Read-only requests do not authorize creating records.'
      : !execution
        ? revision.planId && revision.issues?.length
          ? 'Before product/test edits, start_work with this planId/revisionHash and a dependency-free approved stepId. It initializes pending issues, reserves an attempt and records baseline checks using the existing guards. Review its status and failures; partial errors retain saved records. For custom baseline selection use save_execution, begin_work_attempt and run_project_checks separately.'
          : 'Before product/test edits, save_execution with pending approved issue IDs and expectedHash:null, then begin_work_attempt with its returned execution hash. Capture baseline checks under this planId before edits.'
        : execution.status === 'complete' && !state.needsRevalidation
          ? 'Execution is recorded complete. Report current verification and limitations; do not reroute solely to finish.'
          : 'Resume the recorded steps. Before editing a pending step, use begin_work_attempt with the current executionHash; retain its attemptId for checks/review and save completion only after verification.',
    revision: { planId: revision.planId, hash: revision.hash, version: revision.version,
      approved: revision.approved, drifted: revision.drifted,
      contractVersion: revision.contractVersion ?? 1, evidenceStatus: revision.evidenceStatus,
      decisions: revision.evidence?.decisions.map(({id, status, selected}) => ({id, status, selected})) ?? [],
      policy: revision.policy ? { version: revision.policy.version,
        ruleIds: revision.policy.rules.map(({ id }) => id), checkIds: revision.policy.checks.map(({ id }) => id),
        reviewIds: revision.policy.reviews.map(({ id }) => id),
        reviews: revision.policy.reviews.map(({id, ruleIds}) => ({id, ruleIds})) } : null,
      issueIds: revision.issues?.map(({ id }) => id) ?? [] },
    execution: execution ? { ...execution, steps: execution.steps.map(({ title: _title, files: _files, dependsOn: _deps, requiredCheckIds: _required, ...step }) => {
      void _title; void _files; void _deps; void _required; return step;
    }) } : null,
    details: "get_revision for approved contracts/policy; detail: full for complete workflow context",
  };
}

export function summarizeTaskContext(state: Awaited<ReturnType<typeof taskContext>>, knownContextId?: string) {
  const { profile, document, workflow, routing, context } = state;
  const previousIds = new Set(workflow.revision.evidence?.routes.flatMap(({judgments}) => judgments.map(({referenceId}) => referenceId)) ?? []);
  const currentIds = new Set('candidates' in routing ? routing.candidates.map(({id}) => id) : []);
  const candidateChanges = workflow.revision.evidence && 'candidates' in routing ? {
    added: [...currentIds].filter(id => !previousIds.has(id)),
    absentFromThisContext: [...previousIds].filter(id => !currentIds.has(id)),
    meaning: 'Compared with all stored revision routes. Judge this context using only its candidates; absence may mean different scope, not deleted knowledge. No previous judgment is automatically adopted.',
  } : undefined;
  const needsProjectEvidence = 'unavailable' in state.projectFacts;
  const needsMainRefresh = ['missing', 'stale', 'pending', 'failed'].includes(state.projectDocumentStatus.status);
  return { projectDocumentStatus: state.projectDocumentStatus,
    planPrerequisites: {projectAnalysis: needsProjectEvidence || needsMainRefresh ? 'required' : 'recorded',
      meaning: 'Prerequisites for saving a plan, not authorization to write during a read-only request.'},
    inspection: {recorded: state.inspection.recorded, changedFiles: state.inspection.changedFiles,
      meaning: 'Working inspection delta; use projectDocumentStatus to decide whether main context needs refreshing.'},
    workflow: summarizeWorkflow(workflow), plans: state.plans, contextId: state.contextId,
    projectAnalysis: state.projectAnalysis,
    projectFacts: {facts: state.projectFacts.facts, matched: state.projectFacts.matched, omitted: state.projectFacts.omitted,
      authority: state.projectFacts.authority, ...('unavailable' in state.projectFacts ? {unavailable: state.projectFacts.unavailable} : {})},
    routing: 'candidates' in routing ? {status: routing.status, hash: routing.hash,
      ...(candidateChanges ? {candidateChanges} : {}),
      files: Object.keys(routing.inspection.analysis.hashes), requirements: Object.keys(routing.requirements),
      warnings: routing.inspection.analysis.warnings,
      ...(routing.inspection.analysis.relations ? {relations: routing.inspection.analysis.relations} : {}),
      ...(knownContextId === state.contextId ? {
        reused: true, candidateCount: routing.candidates.length,
        readWith: 'Reuse candidate metadata and discovery from this contextId. Omit knownContextId to receive them again.',
      } : {reused: false,
      candidates: routing.candidates.map(({id, title, review, conditions, exclusions, reasons, investigation, investigationStatus}) => ({id, title, review, conditions, exclusions, reasons,
        investigationStatus, investigation: investigation ? {questions: investigation.questions.length, readWith: "read_learned_knowledge"} : null,
        locations: [...new Set(routing.inspection.candidates.find((item) => item.id === id)?.matches.map((match) => `${match.path}:${match.line}`) ?? [])]})),
      scopeSearch: routing.scopeSearch, structureSearch: routing.structureSearch,
      semanticDiscovery: {entries: routing.discovery.entries.map(({id, triggers, conditions, exclusions}) => {
        // Candidate metadata is already in this response. Only share it when the
        // values really match; a second retrieval may carry different conditions.
        const candidate = routing.candidates.find(item => item.id === id);
        const same = candidate && JSON.stringify(candidate.conditions) === JSON.stringify(conditions)
          && JSON.stringify(candidate.exclusions) === JSON.stringify(exclusions);
        return same ? {id, triggers, applicabilityFrom: 'routing.candidates (same id)'} : {id, triggers, conditions, exclusions};
      }),
        domains: routing.discovery.domains, total: routing.discovery.total, nextOffset: routing.discovery.nextOffset, queryLimit: routing.discovery.queryLimit,
        coverage: 'Query shortlist, not exhaustive semantic coverage. For an inspected relationship missing here, use discover_knowledge_triggers with its domain or concrete symptoms before concluding no matching signal.'},
      }),
    } : routing,
    context: { relevantFiles: context.relevantFiles, projectConstraints: context.projectConstraints,
      applicableRules: context.applicableRules.filter((rule) => rule.source !== 'knowledge'),
      knowledgeGaps: state.knowledgeSelection.gaps },
    next: needsProjectEvidence || needsMainRefresh
      ? 'Before save_revision, inspect/refresh main project evidence with get_project_snapshot and save_project_context (expectedCommit=snapshot.commit, expectedHash=snapshot.documentHash). Reuse already inspected unchanged source. Then refresh get_work_context because saving project.md invalidates this contextId. Read-only requests may report this prerequisite without writing.'
      : 'Read relevant bodies. Save evidence.routes with contextId and explicit judgments; citations use path/line/quote. requirements are separately pinned documents. Full detail is available on request; do not repeat inspection without new evidence.',
    profile: { project: profile.project, technologies: profile.technologies, scripts: profile.scripts,
      architecture: profile.architecture, inventory: profile.inventory },
    document: { available: !!document, readWith: "get_project_document" },
  };
}
