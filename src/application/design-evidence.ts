import { investigationAssessmentSchema, validateInvestigation, investigationCitations } from "./knowledge/investigation.js";
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import * as z from 'zod/v4';
import { localPath, sha256 } from './policy.js';
import { projectFile } from './knowledge/code-triggers.js';
import { contentHash, readIndexedReference } from './knowledge/reference-index.js';
import { routeKnowledge, routingInputSchema, installedSystemRoot } from './knowledge/routing.js';
import { projectSnapshot, readProjectSource } from './project-snapshot.js';
import { FileSystemProjectDiscovery } from '../adapters/filesystem/project-discovery.js';
import { relative } from 'node:path';
import { recalledAnalysis } from './analysis-receipts.js';
import { bindProjectFacts, factReuseSchema, createFactGuardChecker } from './project-facts.js';
import { quoteLocationHint } from './source-file.js';
import {analysisReferenceSchema} from './flow-schema.js';
import {validateAnalysisReferences} from './project-flows.js';

const text = z.string().trim().min(1).max(4000);
const id = z.string().regex(/^[a-z0-9][a-z0-9._-]{0,119}$/);
export const citationSchema = z.object({ path: localPath, line: z.number().int().positive(), quote: text, hash: sha256 });
const citationInputSchema = citationSchema.extend({ hash: sha256.optional(),
  line: citationSchema.shape.line.optional().describe('Omit for an exact quote occurring once; the server resolves its line. Repeated quotes require an explicit line.'),
});
export const projectEvidenceSchema = z.object({
  version: z.literal(1),
  coverage: z.array(z.object({ path: localPath, status: z.enum(['inspected', 'pending', 'blocked', 'excluded']), reason: text })).min(1),
  statements: z.array(z.object({ id, kind: z.enum(['fact', 'interpretation', 'user-decision', 'unknown']), statement: text,
    evidence: z.array(citationInputSchema), confirmation: z.string().max(4000).default('').describe('Required when kind is user-decision: copy the supplied answer. A citation or a summary alone is not confirmation.'),
    absence: z.boolean().default(false), scope: z.array(localPath).default([]).describe('Exact inspected file paths extending the claim, e.g. src/client.ts. Not folder names, globs or semantic labels. These files also become reuse dependencies; omit when citations and reuse.dependencies already cover the claim.'), limitations: z.array(text).default([]),
    reuse: factReuseSchema.optional(),
    reuseReason: text.optional().describe('Why this code claim cannot emit a saved semantic trigger, e.g. no applicable registered signal or an untraced dependency. Omit when reuse is supplied.'),
  })).min(1),
});
export type ProjectEvidence = z.input<typeof projectEvidenceSchema>;

// Existing persisted records remain readable. New MCP analyses must make the
// reuse decision explicit instead of silently recording an unusable fact cache.
export const projectEvidenceInputSchema = projectEvidenceSchema.extend({version: z.literal(1).default(1)}).superRefine((value, context) => {
  value.statements.forEach((item, index) => {
    if (!['fact', 'interpretation'].includes(item.kind)) return;
    if (!item.reuse && !item.reuseReason) context.addIssue({code: 'custom', path: ['statements', index],
      message: `Statement ${item.id}: supply reuse with inspected dependencies and registered semantic interpretations, or reuseReason explaining why no reusable trigger is justified. Do not invent a signal.`});
    if (item.reuse && item.reuseReason) context.addIssue({code: 'custom', path: ['statements', index], message: 'Choose reuse or reuseReason, not both'});
  });
});

export async function validateCitation(root: string, citation: z.infer<typeof citationInputSchema>, snapshot?: {baseRef: string; expectedCommit: string}) {
  const content = snapshot ? (await readProjectSource(root, citation.path, snapshot.expectedCommit, snapshot.baseRef, 0, 512_000)).content
    : (await projectFile(root, citation.path)).content;
  const hash = contentHash(content);
  if ((!citation.hash && !snapshot) || (citation.hash && hash !== citation.hash)) {
    throw new Error(`Stale or invented citation: ${citation.path}; working citations need a current context receipt or full-file hash.`);
  }
  let line = citation.line;
  if (line === undefined) {
    const start = content.indexOf(citation.quote);
    if (start < 0) throw new Error(`Stale or invented citation: ${citation.path}. Use an exact quote from the inspected source.`);
    if (content.indexOf(citation.quote, start + 1) >= 0) throw new Error(`Ambiguous citation: ${citation.path}. Quote occurs more than once; supply its line or a longer unique quote. ${quoteLocationHint(content, citation.quote)}`);
    line = content.slice(0, start).split(/\r?\n/).length;
  }
  if (citation.line !== undefined && !content.split(/\r?\n/).slice(line - 1, line + 9).join('\n').includes(citation.quote.replace(/\r\n/g, '\n'))) {
    throw new Error(`Stale or invented citation: ${citation.path}:${line}. ${quoteLocationHint(content, citation.quote)} Omit line for a unique quote rather than guessing it.`);
  }
  return {...citation, line, hash};
}

export async function validateProjectEvidence(root: string, evidence: ProjectEvidence, baseRef: string, commit: string | null) {
  const parsed = projectEvidenceSchema.parse(evidence);
  const snapshot = await projectSnapshot(root, baseRef);
  if (snapshot.commit !== commit) throw new Error('Project baseline changed');
  const inventory = commit ? snapshot.files.filter((path) => !path.startsWith('.frontend-system/'))
    : (await new FileSystemProjectDiscovery().listFiles(root)).map((path) => relative(root, path)).filter((path) => !path.startsWith('.frontend-system/'));
  const covered = new Map(parsed.coverage.map((item) => [item.path, item]));
  if (covered.size !== parsed.coverage.length || inventory.some((path) => !covered.has(path)) || parsed.coverage.some(({path}) => !inventory.includes(path))) throw new Error(`Coverage must account for the whole baseline inventory. Missing: ${inventory.filter((path) => !covered.has(path)).join(', ') || 'none'}; outside baseline: ${parsed.coverage.filter(({path}) => !inventory.includes(path)).map(({path}) => path).join(', ') || 'none'}. Working requirements are not main facts. Duplicate paths are invalid.`);
  if (new Set(parsed.statements.map(({id}) => id)).size !== parsed.statements.length) throw new Error('Duplicate statement IDs');
  for (const item of parsed.statements) {
    if (['fact', 'interpretation'].includes(item.kind) && !item.evidence.length) throw new Error('Code claims require citations');
    if (item.kind === 'user-decision' && !item.confirmation) throw new Error(`Statement ${item.id}: user-decision requires confirmation containing the supplied answer. Patch that field in the analysis draft; do not reinterpret the decision or invent consent.`);
    if (item.absence && (!item.scope.length || item.scope.some((path) => covered.get(path)?.status !== 'inspected'))) throw new Error('Absence claims require an inspected scope');
    if (item.absence && !item.limitations.length) throw new Error('Absence claims must state unresolved edges and scope limitations');
    for (const citation of item.evidence) {
      if (covered.get(citation.path)?.status !== 'inspected') throw new Error('Citation must belong to inspected coverage');
      Object.assign(citation, await validateCitation(root, citation, commit ? {baseRef, expectedCommit: commit} : undefined));
    }
  }
  const factBindings = await bindProjectFacts(root, installedSystemRoot(), parsed, inventory, commit ? {baseRef, expectedCommit: commit} : undefined);
  return { ...parsed, factBindings, baseRef, commit, baselineHash: commit ? snapshot.sourceHash : contentHash(JSON.stringify(await workingInventory(root))),
    completeness: parsed.coverage.some(({status}) => status === 'pending' || status === 'blocked') ? 'partial' : 'accounted',
    authority: 'Code citations checked; interpretation and coverage judgments belong to the host' };
}

async function workingInventory(root: string) {
  const files = await new FileSystemProjectDiscovery().listFiles(root);
  return Promise.all(files.filter((path) => !relative(root, path).startsWith('.frontend-system/')).sort().map(async (path) => [relative(root, path), contentHash(await readFile(path, 'utf8'))]));
}

export async function readProjectEvidence(root: string) {
  const document = await readFile(join(root, '.frontend-system/project.md'), 'utf8').catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'ENOENT') throw new Error('Initial project baseline missing: inspect get_project_snapshot and save_project_context before binding a plan, then renew get_work_context. If baseline writes are prohibited, deliver an unbound draft; do not claim a saved or enforced plan.');
    throw error;
  });
  const match = /<!-- fs-project-evidence ([a-f0-9]{64}) -->/.exec(document);
  if (!match) throw new Error('Project context has no structured evidence; refresh it');
  const raw = await readFile(join(root, '.frontend-system/evidence', `project-${match[1]}.json`), 'utf8');
  if (contentHash(raw) !== match[1]) throw new Error('Project evidence changed');
  const stored = JSON.parse(raw) as Awaited<ReturnType<typeof validateProjectEvidence>>;
  projectEvidenceSchema.parse(stored);
  return { hash: match[1]!, documentHash: contentHash(document), record: stored };
}

const judgment = z.object({ investigation: investigationAssessmentSchema.optional().describe('Required for apply/keep/not-applicable when the candidate has an investigation specification; read its questions with read_learned_knowledge. A rationale or grouped dismissal cannot replace these findings.'), referenceId: id, decision: z.enum(['apply', 'keep', 'not-applicable', 'needs-context', 'needs-decision']), rationale: text });
const recordedDesignEvidenceSchema = z.object({
  version: z.literal(1), projectHash: sha256,
  analysisRefs: z.array(analysisReferenceSchema).max(100).optional(),
  // Routing loads project evidence too; resolve the shared schema after ESM initialization.
  routes: z.array(z.object({ input: z.lazy(() => routingInputSchema), hash: sha256, judgments: z.array(judgment) })).min(1).max(100),
  decisions: z.array(z.object({ id, question: text, evidence: z.array(citationSchema).min(1), knowledgeIds: z.array(id),
    options: z.array(z.object({ id, description: text, cost: text })).min(1), selected: id.nullable(),
    status: z.enum(['resolved', 'open', 'excluded']), authority: z.enum(['user', 'existing', 'model']), confirmation: z.string().max(4000).default('').describe('For a resolved user or existing decision, quote the supplied answer or established contract. Citations do not replace confirmation. Keep unanswered open choices unconfirmed; never fabricate consent.'),
    rationale: text, reconsiderWhen: text, ruleIds: z.array(text), issueIds: z.array(id),
  })).min(1),
});
const decisionInput = recordedDesignEvidenceSchema.shape.decisions.element.omit({status: true, selected: true})
  .extend({evidence: z.array(citationInputSchema).min(1)});
// Missing selection means unresolved, never permission to choose on the user's behalf.
// Keep common fields once in the wire schema; enforce conditional selection on
// the server as well as documenting it for callers. No user choice is inferred.
const decisionInputSchema = decisionInput.extend({
  status: z.enum(['resolved', 'open', 'excluded']),
  selected: id.nullable().default(null).describe('Required option ID for resolved; omit or null for open/excluded.'),
}).superRefine((value, context) => {
  if ((value.status === 'resolved') !== (value.selected !== null)) context.addIssue({code: 'custom', path: ['selected'],
    message: 'Resolved decisions require an option ID; open/excluded decisions require null or omission.'});
});
export const designEvidenceSchema = recordedDesignEvidenceSchema.extend({
  version: z.literal(1).default(1), projectHash: sha256.optional(),
  routes: z.array(z.union([
    recordedDesignEvidenceSchema.shape.routes.element,
    z.strictObject({contextId: sha256, judgments: z.array(judgment),
      dismissed: z.array(z.strictObject({referenceIds: z.array(id).min(1), rationale: text})).default([])}),
  ])).min(1).max(100),
  decisions: z.array(decisionInputSchema).min(1),
});
export type DesignEvidence = z.input<typeof designEvidenceSchema>;
export const boundEvidenceSchema = recordedDesignEvidenceSchema.extend({
  referenceHashes: z.record(z.string(), sha256), sourceHashes: z.record(z.string(), sha256),
  configHashes: z.record(z.string(), sha256), projectRecordHash: sha256,
  requirementHashes: z.record(z.string(), sha256).optional(),
});
export type BoundEvidence = z.infer<typeof boundEvidenceSchema>;

export const decisionUpdatesSchema = z.array(z.strictObject({
  id,
  changes: z.strictObject({
    status: z.enum(['resolved', 'open', 'excluded']).optional(), selected: id.nullable().optional(),
    confirmation: text.optional(), rationale: text.optional(), knowledgeIds: z.array(id).optional(),
    ruleIds: z.array(text).optional(), issueIds: z.array(id).optional(),
    evidence: z.array(citationInputSchema).min(1).optional(),
  }).refine(value => Object.keys(value).length > 0, 'Supply changed fields'),
})).min(1).max(100);
export type DecisionUpdates = z.input<typeof decisionUpdatesSchema>;

export async function updateDesignDecisions(root: string, current: BoundEvidence, input?: DecisionUpdates, routes?: DesignEvidence['routes']) {
  const updates = input ? decisionUpdatesSchema.parse(input) : [];
  const ids = new Set(updates.map(update => update.id));
  if (ids.size !== updates.length || updates.some(update => !current.decisions.some(decision => decision.id === update.id))) throw new Error('Decision updates require unique existing IDs');
  const decisions = current.decisions.map(decision => {
    const changes = updates.find(update => update.id === decision.id)?.changes;
    if (!changes) return decision;
    const next = {...decision, ...changes};
    if (next.authority === 'user' && next.status === 'resolved' && (next.selected !== decision.selected || next.status !== decision.status) && !changes.confirmation) {
      throw new Error('Changing a user selection requires the new supplied answer; previous confirmation cannot authorize it');
    }
    if (next.status !== 'resolved') next.selected = null;
    if (next.status === 'resolved' && !next.options.some(option => option.id === next.selected)) throw new Error('Selection must identify an existing decision option');
    return next;
  });
  // Rebind against current routing, citations and knowledge; a small write is not a bypass.
  return bindDesignEvidence(root, designEvidenceSchema.parse({...current, ...(routes ? {routes} : {}), decisions}));
}

export async function bindDesignEvidence(root: string, input: DesignEvidence, systemRoot = installedSystemRoot()): Promise<BoundEvidence> {
  const parsed = designEvidenceSchema.parse(input);
  const analysisErrors = await validateAnalysisReferences(root, systemRoot, parsed.analysisRefs ?? [], true);
  if (analysisErrors.length) throw new Error(analysisErrors.join('; '));
  const issueIds = new Set(parsed.decisions.flatMap(d => d.issueIds));
  if (parsed.analysisRefs?.some(r => r.issueIds.some(id => !issueIds.has(id)))) throw new Error('Analysis references must link to decision-owned issue IDs');
  const project = await readProjectEvidence(root);
  const routes = await Promise.all(parsed.routes.map(async (route) => {
    if (!('contextId' in route)) {
      if (!parsed.projectHash) throw new Error('Legacy route input requires projectHash; prefer contextId from get_work_context');
      return route;
    }
    const receipt = await recalledAnalysis(root, route.contextId);
    if (receipt.projectHash !== project.documentHash) throw new Error('Project document changed; call get_work_context after saving project context');
    return {input: receipt.route.request, hash: receipt.route.hash, judgments: [...route.judgments,
      ...route.dismissed.flatMap(({referenceIds, rationale}) => referenceIds.map((referenceId) => ({referenceId, decision: 'not-applicable' as const, rationale, investigation: undefined})))]};
  }));
  if (parsed.projectHash && project.documentHash !== parsed.projectHash) throw new Error('Project document changed; reread before designing');
  const references: Record<string, string> = {}, sources: Record<string, string> = {}, configs: Record<string, string> = {}, requirements: Record<string, string> = {};
  for (const route of routes) {
    if (route.input.snapshot) throw new Error('Plan routes must inspect the current working tree');
    const current = await routeKnowledge(root, systemRoot, route.input);
    if (current.hash !== route.hash) throw new Error('Routing evidence changed; repeat scoped analysis');
    const choices = new Map(route.judgments.map((item) => [item.referenceId, item]));
    if (choices.size !== route.judgments.length || choices.size !== current.candidates.length || current.candidates.some(({id}) => !choices.has(id))) throw new Error(`Review every retrieved candidate exactly once. Missing: ${current.candidates.filter(({id}) => !choices.has(id)).map(({id}) => id).join(', ') || 'none'}; unknown: ${[...choices.keys()].filter((id) => !current.candidates.some((candidate) => candidate.id === id)).join(', ') || 'none'}. Duplicated judgments are invalid; explicit grouped dismissals are allowed.`);
    for (const candidate of current.candidates) {
      if (candidate.review === 'uncertain' && choices.get(candidate.id)!.decision === 'apply') throw new Error('Uncertain knowledge cannot be adopted');
      const {entry} = await readIndexedReference(join(systemRoot, 'references/learned'), candidate.id, 0, 1);
      const choice = choices.get(candidate.id)!;
      try { validateInvestigation(entry.investigation, choice.decision, choice.investigation); }
      catch (error) { throw new Error(`Candidate ${candidate.id}: ${error instanceof Error ? error.message : String(error)}`); }
      for (const citation of investigationCitations(choice.investigation)) {
        const hash = current.inspection.analysis.hashes[citation.path] ?? current.requirements[citation.path]
          ?? route.input.factGuards?.find(guard => citation.path in guard.hashes)?.hashes[citation.path];
        if (!hash) throw new Error(`Investigation must cite routed source or pinned requirement: ${citation.path}`);
        await validateCitation(root, { ...citation, hash });
      }
      references[candidate.id] = contentHash(JSON.stringify(entry));
    }
    Object.assign(sources, current.inspection.analysis.hashes);
    for (const guard of route.input.factGuards ?? []) Object.assign(sources, guard.hashes);
    Object.assign(configs, current.inspection.analysis.configHashes);
    Object.assign(requirements, current.requirements);
  }
  for (const decision of parsed.decisions) {
    for (const citation of decision.evidence) {
      const inspectedHash = sources[citation.path] ?? requirements[citation.path];
      if (!inspectedHash || (citation.hash && inspectedHash !== citation.hash)) throw new Error(`Decision must cite routed source or a pinned requirement: ${citation.path}. Add code to get_work_context.files, or documents to requirements. Then pass the new contextId and explicit candidate judgments in save_revision.evidenceRoutes alongside decisionUpdates (or replace evidence). Refreshing context alone does not change stored routes. Include all sources/documents still cited by retained decisions. Available: ${Object.keys({...sources, ...requirements}).join(', ')}`);
      citation.hash = inspectedHash;
      Object.assign(citation, await validateCitation(root, citation));
    }
    if (decision.knowledgeIds.some((id) => !references[id])) throw new Error('Decision references unrouted knowledge');
  }
  return boundEvidenceSchema.parse({ ...parsed, projectHash: project.documentHash, routes, referenceHashes: references, sourceHashes: sources, configHashes: configs, requirementHashes: requirements, projectRecordHash: project.hash });
}

export { designContractFailures } from './design-contract.js';

export async function evidenceFreshness(root: string, evidence: BoundEvidence, checkSources: boolean, systemRoot = installedSystemRoot()) {
  const errors: string[] = await validateAnalysisReferences(root, systemRoot, evidence.analysisRefs ?? [], checkSources);
  const checkFacts = createFactGuardChecker(root, systemRoot);
  if (checkSources) for (const route of evidence.routes) for (const guard of route.input.factGuards ?? []) {
    errors.push(...await checkFacts(guard));
  }
  try {
    const project = await readProjectEvidence(root);
    if (project.documentHash !== evidence.projectHash || project.hash !== evidence.projectRecordHash) errors.push('Project explanation changed; review linked decisions');
    const snapshot = await projectSnapshot(root, project.record.baseRef);
    const baselineHash = snapshot.commit ? snapshot.sourceHash : contentHash(JSON.stringify(await workingInventory(root)));
    // Uncommitted baselines necessarily change during implementation; working source checks apply before starting.
    if ((snapshot.commit || checkSources) && baselineHash !== project.record.baselineHash) errors.push('Project baseline changed; refresh explanation');
    const scoped = new Set(evidence.routes.flatMap(({input}) => input.files));
    if (project.record.coverage.some(({path, status}) => scoped.has(path) && ['pending', 'blocked'].includes(status))) errors.push('Plan scope contains unreviewed project areas');
  } catch (error) { errors.push(String(error)); }
  for (const [id, hash] of Object.entries(evidence.referenceHashes)) {
    try { if (contentHash(JSON.stringify((await readIndexedReference(join(systemRoot, 'references/learned'), id, 0, 1)).entry)) !== hash) errors.push(`Linked knowledge changed: ${id}`); }
    catch { errors.push(`Linked knowledge unavailable: ${id}`); }
  }
  for (const [path, hash] of Object.entries({...evidence.requirementHashes, ...(checkSources ? {...evidence.sourceHashes, ...evidence.configHashes} : {})})) {
    try { if (contentHash(await readFile(join(root, path), 'utf8')) !== hash) errors.push(`Analysis source changed: ${path}`); }
    catch { errors.push(`Analysis source missing: ${path}`); }
  }
  return errors;
}
