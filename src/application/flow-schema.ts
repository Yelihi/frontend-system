import * as z from 'zod/v4';
import {localPath, sha256} from './policy.js';

export const analysisId = z.string().regex(/^[a-z0-9][a-z0-9._-]{0,99}$/);
const text = z.string().trim().min(1).max(1600);
export const flowCitation = z.object({path: localPath, quote: text, line: z.number().int().positive().optional()});
const evidence = z.array(analysisId).max(20);
export const flowSchema = z.object({
  id: analysisId, title: text, basis: z.enum(['observed', 'proposed']),
  summary: text,
  scope: z.object({files: z.array(localPath).min(1).max(100),
    discoveryMode: z.enum(['source', 'all']).default('source').describe('source tracks new code/config/data files, not Markdown reports. Use all for Markdown-driven routes/content. Explicit files are always hashed.'),
    discoveryRoots: z.array(z.string().regex(/^(\.|[a-zA-Z0-9_@.-]+(?:\/[a-zA-Z0-9_@.-]+)*)$/)).min(1).max(20)
      .describe('Directories whose source content changes and file additions/removals invalidate the flow; use . for the whole first-party inventory. No .. segments.'),
    snapshot: z.object({baseRef: z.string(), expectedCommit: sha256.or(z.string().regex(/^[a-f0-9]{40}$/))}).optional()}),
  evidence: z.record(analysisId, flowCitation),
  nodes: z.array(z.object({id: analysisId, kind: z.enum(['page', 'component', 'store', 'cache', 'module', 'service', 'external']),
    label: text, parent: analysisId.optional(), props: z.array(text).default([]), state: z.array(text).default([]),
    events: z.array(text).default([]), lifecycle: z.array(text).default([]), evidence})).min(1).max(80),
  edges: z.array(z.object({id: analysisId, from: analysisId, to: analysisId,
    kind: z.enum(['call', 'read', 'write', 'subscribe', 'props', 'return', 'invalidate', 'cleanup']),
    label: text, condition: text.optional(), evidence})).max(200),
  scenarios: z.array(z.object({id: analysisId, title: text, entry: analysisId, event: text,
    steps: z.array(z.object({edge: analysisId, effect: text, condition: text.optional()})).min(1).max(80),
    outcome: text, limitations: z.array(text).default([])})).min(1).max(20),
  invariants: z.array(z.object({id: analysisId, statement: text,
    authority: z.enum(['observed', 'established', 'proposed']), evidence})).default([]),
  limitations: z.array(text).min(1).max(30),
});
export type ProjectFlow = z.infer<typeof flowSchema>;
export const findingSchema = z.object({
  id: analysisId, title: text, flow: z.object({id: analysisId, hash: sha256}),
  kind: z.enum(['violation', 'choice', 'hypothesis']),
  status: z.enum(['open', 'deferred', 'planned', 'resolved', 'dismissed']),
  observation: text, consequence: text, evidence: z.array(flowCitation).min(1).max(12),
  knowledgeIds: z.array(analysisId).default([]),
  alternatives: z.array(z.object({id: analysisId, description: text, cost: text})).min(1).max(6),
  question: text.optional(), authority: flowCitation.optional().describe('A violation needs a cited established requirement. This does not authorize edits.'),
  resolution: z.object({summary: text, method: z.enum(['static-review', 'executed-check', 'owner-decision']),
    evidence: z.array(flowCitation).min(1), reconsiderWhen: text}).optional(),
});
export const analysisReferenceSchema = z.object({kind: z.enum(['flow', 'finding']), id: analysisId, hash: sha256,
  issueIds: z.array(analysisId).min(1)});
export type AnalysisReference = z.infer<typeof analysisReferenceSchema>;
export const analysisWriteSchema = z.object({
  expectedHash: sha256.nullable(),
  record: z.discriminatedUnion('kind', [z.object({kind: z.literal('flow'), data: flowSchema}), z.object({kind: z.literal('finding'), data: findingSchema})]),
});
