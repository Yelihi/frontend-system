import * as z from 'zod/v4';

const text = z.string().trim().min(1).max(1200);
const id = z.string().regex(/^[a-z0-9][a-z0-9._-]*$/);
export const investigationSchema = z.object({
  version: z.literal(1),
  questions: z.array(z.object({
    id, kind: z.enum(['code', 'intent']), role: z.enum(['applicability', 'exclusion', 'context']),
    instruction: text,
  })).min(2).max(12),
  preserve: z.array(text).min(1).max(10),
  alternatives: z.array(z.object({ option: text, tradeoff: text })).min(1).max(5),
  onMissing: text,
}).superRefine((value, context) => {
  if (new Set(value.questions.map(q => q.id)).size !== value.questions.length)
    context.addIssue({ code: 'custom', message: 'Duplicate investigation question IDs' });
  for (const role of ['applicability', 'exclusion']) if (!value.questions.some(q => q.role === role))
    context.addIssue({ code: 'custom', message: `Investigation needs an explicit ${role} question` });
});

const citation = z.object({ path: text, line: z.number().int().positive(), quote: text });
export const investigationAssessmentSchema = z.object({
  findings: z.array(z.object({
    questionId: id, status: z.enum(['supported', 'refuted', 'unknown']),
    basis: z.enum(['code', 'inference', 'owner', 'unknown']), rationale: text,
    citations: z.array(citation).max(8), confirmation: text.optional().describe('Required for basis owner: exact substring of a cited supplied answer/contract. A paraphrase is not confirmation; keep unknown without owner evidence.'),
  })).min(1).max(12),
  action: z.enum(['recommend', 'repair', 'ask', 'inspect', 'keep']),
  authority: z.object({ basis: z.enum(['approved-contract', 'existing-behavior']), citation }).optional(),
  limitations: z.array(text).min(1).max(10),
});
export type Investigation = z.infer<typeof investigationSchema>;
export type InvestigationAssessment = z.infer<typeof investigationAssessmentSchema>;

// Pure contract checks. Quotes are checked separately against the routed, hashed
// scope. Neither a schema nor a quote proves the host's interpretation is true.
export function validateInvestigation(spec: Investigation | undefined, decision: string, raw?: InvestigationAssessment) {
  if (!spec) {
    if (raw) throw new Error('Knowledge has no investigation specification; do not invent completed investigation');
    return;
  }
  if (!raw) {
    if (['needs-context', 'needs-decision'].includes(decision)) return;
    throw new Error('Investigation findings required before adoption, retention or exclusion');
  }
  const assessment = investigationAssessmentSchema.parse(raw);
  const byId = new Map(assessment.findings.map(f => [f.questionId, f]));
  if (byId.size !== assessment.findings.length || byId.size !== spec.questions.length || spec.questions.some(q => !byId.has(q.id)))
    throw new Error('Address every investigation question exactly once; unknown is a valid finding');
  for (const q of spec.questions) {
    const f = byId.get(q.id)!;
    if (f.status === 'unknown') {
      if (f.basis !== 'unknown') throw new Error(`Question ${q.id}: Unknown findings must retain unknown basis`);
      continue;
    }
    if (f.basis === 'unknown' || !f.citations.length) throw new Error(`Question ${q.id}: Known investigation findings require scoped citations`);
    if (q.kind === 'intent' && f.basis !== 'owner') throw new Error(`Question ${q.id}: Intent questions require supplied owner or established contract evidence; otherwise keep unknown`);
    if (f.basis === 'owner' && (!f.confirmation || !f.citations.some(c => c.quote.includes(f.confirmation!))))
      throw new Error(`Question ${q.id}: Owner findings require confirmation contained in a cited answer or contract`);
  }
  const unknown = assessment.findings.some(f => f.status === 'unknown');
  const excluded = spec.questions.some(q => q.role === 'exclusion' && byId.get(q.id)!.status === 'supported');
  const applicable = spec.questions.filter(q => q.role === 'applicability').every(q => byId.get(q.id)!.status === 'supported');
  if (decision === 'apply' && (unknown || excluded || !applicable)) {
    const unknownIds=assessment.findings.filter(f=>f.status==='unknown').map(f=>f.questionId);
    const exclusionIds=spec.questions.filter(q=>q.role==='exclusion' && byId.get(q.id)!.status==='supported').map(q=>q.id);
    const unmetIds=spec.questions.filter(q=>q.role==='applicability' && byId.get(q.id)!.status!=='supported').map(q=>q.id);
    throw new Error(`Cannot apply knowledge with unknown, excluded or unmet investigation conditions. Unknown: ${unknownIds.join(', ') || 'none'}; supported exclusions: ${exclusionIds.join(', ') || 'none'}; unmet applicability: ${unmetIds.join(', ') || 'none'}. Recheck the scoped evidence or retain a pending/excluded judgment; do not flip findings just to pass.`);
  }
  if (decision === 'not-applicable' && !excluded && !spec.questions.some(q => q.role === 'applicability' && byId.get(q.id)!.status === 'refuted'))
    throw new Error('Exclusion needs a supported exclusion or refuted applicability condition');
  if (decision === 'keep' && unknown && !excluded) throw new Error('Unresolved investigation must remain needs-context or needs-decision');
  const actions: Record<string, string[]> = { apply: ['recommend', 'repair'], keep: ['keep'], 'not-applicable': ['keep'], 'needs-context': ['inspect'], 'needs-decision': ['ask'] };
  if (!actions[decision]?.includes(assessment.action)) throw new Error('Investigation action must match the recorded decision');
  if (assessment.action === 'repair' && !assessment.authority) throw new Error('Direct repair needs a cited existing behavior or approved contract; it does not grant execution permission');
}

export function investigationCitations(assessment?: InvestigationAssessment) {
  return assessment ? [...assessment.findings.flatMap(f => f.citations), ...(assessment.authority ? [assessment.authority.citation] : [])] : [];
}
