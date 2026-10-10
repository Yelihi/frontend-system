import { basename, dirname, extname, join } from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as z from 'zod/v4';
import { contentHash, readReferenceIndex, searchReferenceIndex, readIndexedReference } from './reference-index.js';
import { triggerInspectionSchema } from './trigger-schema.js';
import { inspectCodeKnowledge, discoverKnowledgeTriggers } from './trigger-review.js';
import { projectFile } from './code-triggers.js';
import { readProjectSourceFile } from '../project-snapshot.js';
import { factGuardSchema, createFactGuardChecker } from '../project-facts.js';

export const routingInputSchema = triggerInspectionSchema.extend({ query: z.string().trim().min(1).max(2000), requirements: z.array(z.string().min(1)).max(40).optional(), factGuards: z.array(factGuardSchema).max(20).optional() });
export type RoutingInput = z.input<typeof routingInputSchema>;

export function installedSystemRoot() {
  let path = dirname(fileURLToPath(import.meta.url));
  while (!existsSync(join(path, 'references/learned/index.json'))) {
    const parent = dirname(path);
    if (parent === path) throw new Error('Installed knowledge index not found');
    path = parent;
  }
  return path;
}

export async function routeKnowledge(root: string, systemRoot: string, input: RoutingInput) {
  const request = routingInputSchema.parse(input);
  const learned = join(systemRoot, 'references/learned');
  const index = await readReferenceIndex(learned);
  if (!index) throw new Error('Publish a knowledge index before routing');
  const checkFacts = createFactGuardChecker(root, systemRoot, request.snapshot);
  for (const guard of request.factGuards ?? []) {
    const failures = await checkFacts(guard);
    if (failures.length) throw new Error(`Saved project facts changed; refresh scoped context: ${failures.join('; ')}`);
  }
  const { elapsedMs, ...inspection } = await inspectCodeKnowledge(root, systemRoot, request);
  // "Implement the plan" carries no domain vocabulary. Names from the inspected
  // scope can retrieve candidates, but never manufacture semantic code signals.
  const scopeQuery = [...new Set(Object.keys(inspection.analysis.hashes)
    .map(path => basename(path, extname(path))))].sort().join(' ').slice(0, 600);
  // The internal discovery query has a smaller budget than the public work request.
  // Preserve both hints; full request/scope lexical searches below remain independent.
  const requestHint = request.query.slice(0, Math.max(300, 600 - scopeQuery.length - (scopeQuery ? 1 : 0)));
  const discoveryQuery = [requestHint, scopeQuery.slice(0, Math.max(0, 599 - requestHint.length))].filter(Boolean).join(' ');
  const discovery = await discoverKnowledgeTriggers(systemRoot, {
    query: discoveryQuery, technologies: request.technologies,
  });
  const lexical = searchReferenceIndex(index, request.query, request.technologies, 10);
  const scopeMatches = scopeQuery ? searchReferenceIndex(index, scopeQuery, request.technologies, 10) : [];
  // Bridge observed structural seeds to older semantic-only metadata. These are
  // retrieval hints, never evidence that a conditional recommendation applies.
  const structureQuery = inspection.analysis.signals.some(signal => signal.kind === 'syntax' && signal.value === 'parameter-dispatch')
    ? '분기 branch dispatch' : '';
  const structureMatches = structureQuery ? searchReferenceIndex(index, structureQuery, request.technologies, 5) : [];
  const requirements: Record<string, string> = {};
  for (const path of request.requirements ?? []) {
    const file = request.snapshot
      ? await readProjectSourceFile(root, path, request.snapshot.expectedCommit, request.snapshot.baseRef)
      : await projectFile(root, path);
    requirements[file.path] = contentHash(file.content);
  }
  const ids = [...new Set([...inspection.candidates.map(({ id }) => id), ...lexical.map(({ id }) => id), ...scopeMatches.map(({id}) => id), ...structureMatches.map(({id}) => id)])];
  const candidates = await Promise.all(ids.map(async (id) => {
    const { entry } = await readIndexedReference(learned, id, 0, 1);
    return { id, contentHash: entry.contentHash, title: entry.title, review: entry.review,
      conditions: entry.conditions, exclusions: entry.exclusions, checks: entry.checks ?? [],
      investigation: entry.investigation ?? null, investigationStatus: entry.investigation ? "pending" : "legacy-checklist",
      reasons: [inspection.candidates.some((item) => item.id === id) ? 'code-trigger' : '',
        lexical.some((item) => item.id === id) ? 'request-search' : '',
        scopeMatches.some(item => item.id === id) ? 'scope-search' : '',
        structureMatches.some(item => item.id === id) ? 'structure-search' : ''].filter(Boolean),
      readWith: 'read_learned_knowledge' };
  }));
  const payload = { request, inspection, discovery, candidates, requirements,
    structureSearch: {query: structureQuery, candidateCount: structureMatches.length,
      authority: 'Observed syntax used for retrieval only; inspect callers and applicability. Not a defect, complete investigation or authorization.'},
    scopeSearch: {query: scopeQuery, candidateCount: scopeMatches.length,
      authority: 'File-name retrieval hints only, not semantic signals or applicable rules. Read code and reference conditions; an absent shortlist entry does not prove irrelevance.'},
    status: candidates.length ? 'candidates' : 'no-matches',
    authority: 'Candidate retrieval executed; applicability and domain meaning require evidence-backed review' };
  if (contentHash(JSON.stringify(await readReferenceIndex(learned))) !== inspection.knowledgeHash) throw new Error('Knowledge changed during routing');
  return { ...payload, hash: contentHash(JSON.stringify(payload)), elapsedMs };
}
