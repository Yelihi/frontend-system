import * as z from 'zod/v4';
import {localPath, sha256} from './policy.js';

export const analysisId = z.string().regex(/^[a-z0-9][a-z0-9._-]{0,99}$/);
const text = z.string().trim().min(1).max(1600);
export const flowCitation = z.object({path: localPath, quote: text, line: z.number().int().positive().optional()});
const evidence = z.array(analysisId).max(20);
const designImage = z.object({path: localPath, hash: sha256, alt: text});
export const flowTestCaseSchema = z.object({id: analysisId, scenarioId: analysisId,
  given: text, when: text, then: text, method: z.enum(['unit', 'integration', 'e2e', 'manual'])});
const outcomeKind = z.enum(['idle', 'loading', 'success', 'empty', 'error', 'cancelled', 'retry', 'custom']);
export const flowSchema = z.object({
  id: analysisId, title: text, basis: z.enum(['observed', 'proposed']),
  summary: text,
  scope: z.object({files: z.array(localPath).min(1).max(100),
    discoveryMode: z.enum(['source', 'all']).default('source').describe('source tracks new code/config/data files, not Markdown reports. Use all for Markdown-driven routes/content. Explicit files are always hashed.'),
    discoveryRoots: z.array(z.string().regex(/^(\.|[a-zA-Z0-9_@.-]+(?:\/[a-zA-Z0-9_@.-]+)*)$/)).min(1).max(20)
      .describe('Directories whose source content changes and file additions/removals invalidate the flow; use . for the whole first-party inventory. No .. segments.'),
    snapshot: z.object({baseRef: z.string(), expectedCommit: sha256.or(z.string().regex(/^[a-f0-9]{40}$/))}).optional()}),
  evidence: z.record(analysisId, flowCitation),
  designState: z.enum(['draft', 'ready']).optional().describe('New structured designs start draft; ready permits plan binding, not implementation approval.'),
  pages: z.array(z.object({node: analysisId, route: text, domain: text.optional(),
    scenes: z.array(z.object({id: analysisId, title: text, kind: outcomeKind, description: text,
      blocks: z.array(z.object({node: analysisId, role: z.enum(['heading', 'input', 'action', 'list', 'content', 'feedback', 'navigation']),
        label: text, content: z.array(text).max(12).optional(), span: z.enum(['full', 'half']).optional(),
      })).max(30).optional().describe('Ordered proposed wireframe regions; not evidence of the existing UI.'),
    })).min(1).max(20),
  })).min(1).max(80).optional(),
  navigation: z.array(z.object({id: analysisId, from: analysisId, to: analysisId,
    label: text, condition: text, evidence})).max(200).optional(),
  knowledge: z.array(z.object({id: analysisId, referenceId: analysisId, referenceHash: sha256,
    judgment: z.enum(['apply', 'keep', 'not-applicable', 'needs-context', 'needs-decision']),
    rationale: text, decisionId: analysisId.optional(), evidence,
    nodes: z.array(analysisId), edges: z.array(analysisId), scenarios: z.array(analysisId),
  })).max(80).optional().describe('Scoped learned judgments. Plan binding checks adoption and exact knowledge version; a link alone is not approval.'),
  testCases: z.array(flowTestCaseSchema).max(80).optional(),
  checks: z.array(z.object({id: analysisId, requirement: text, nodes: z.array(analysisId),
    scenarios: z.array(analysisId), testCaseIds: z.array(analysisId).min(1)})).max(80).optional(),
  nodes: z.array(z.object({id: analysisId, kind: z.enum(['page', 'component', 'store', 'cache', 'module', 'service', 'external']),
    label: text, parent: analysisId.optional(), props: z.array(text).default([]), state: z.array(text).default([]),
    events: z.array(text).default([]), lifecycle: z.array(text).default([]), evidence,
    architecture: z.object({layer: text, runtime: z.enum(['browser', 'server', 'shared', 'external']), responsibility: text}).optional(),
    contracts: z.array(z.object({kind: z.enum(['interface', 'type', 'function', 'store']),
      name: z.string().trim().min(1).max(160), path: localPath,
      signature: z.string().trim().min(1).max(4000), evidence,
    })).max(12).optional().describe('Relevant code declarations/signatures, not full implementations. Observed contracts need citations from path; proposed paths may not exist yet. Keep concrete props/state names in their existing fields.'),
  })).min(1).max(80),
  edges: z.array(z.object({id: analysisId, from: analysisId, to: analysisId,
    kind: z.enum(['call', 'read', 'write', 'subscribe', 'props', 'return', 'invalidate', 'cleanup']),
    label: text, condition: text.optional(), evidence})).max(200),
  scenarios: z.array(z.object({id: analysisId, title: text, entry: analysisId, event: text,
    category: z.enum(['event', 'lifecycle']).optional(), variant: outcomeKind.optional(),
    steps: z.array(z.object({edge: analysisId, effect: text, condition: text.optional(),
      views: z.array(z.object({page: analysisId, scene: analysisId})).min(1).optional(),
      changes: z.array(z.object({ownerNode: analysisId, field: text, before: text, after: text,
        basis: z.enum(['source', 'measured', 'proposed'])})).optional(),
    })).min(1).max(80),
    outcome: text, limitations: z.array(text).default([])})).max(20),
  design: z.object({
    stage: z.enum(['visual-review', 'detailed-design']),
    screens: z.array(z.object({id: analysisId, page: analysisId, title: text,
      reference: designImage.optional(), image: designImage,
      feedback: z.array(text).max(20).default([]),
      confirmation: z.object({evidence: analysisId, imageHash: sha256}).optional(),
      regions: z.array(z.object({node: analysisId, x: z.number().min(0).max(100), y: z.number().min(0).max(100),
        width: z.number().positive().max(100), height: z.number().positive().max(100)})).max(30).default([]),
    })).min(1).max(6),
    detailRequest: analysisId.optional().describe('Evidence quoting the user request to proceed with detailed design; visual confirmation alone is insufficient.'),
    quality: z.array(z.object({category: z.enum(['accessibility', 'performance', 'security', 'resilience', 'responsive', 'other']),
      requirement: text, verification: text, nodes: z.array(analysisId).min(1).max(20)})).max(20).default([]),
  }).optional(),
  invariants: z.array(z.object({id: analysisId, statement: text,
    authority: z.enum(['observed', 'established', 'proposed']), evidence})).default([]),
  limitations: z.array(text).min(1).max(30),
}).superRefine((flow, ctx) => {
  if (!flow.scenarios.length && flow.design?.stage !== 'visual-review' && !(flow.pages?.length && flow.designState === 'draft')) ctx.addIssue({code:'custom',message:'Event scenarios are required outside visual review',path:['scenarios']});
  if (flow.design && (flow.basis !== 'proposed' || flow.scope.snapshot)) ctx.addIssue({code:'custom',message:'Design screens require a proposed working flow',path:['design']});
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
