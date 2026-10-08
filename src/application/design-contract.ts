import type { BoundEvidence } from './design-evidence.js';
import type { VerificationPolicy } from './policy.js';

export function designContractFailures(evidence: BoundEvidence | undefined, policy: VerificationPolicy | undefined, issues: Array<{id: string; files: string[]}> | undefined): string[] {
  if (!evidence) return ['Evidence-based plans require project analysis, routing judgments and decisions'];
  const errors: string[] = [];
  const decisions = evidence.decisions;
  if (new Set(decisions.map(({id}) => id)).size !== decisions.length) errors.push('Duplicate decisions');
  if (evidence.routes.some((route) => route.judgments.some(({decision}) => decision.startsWith('needs-')))) errors.push('Resolve pending knowledge judgments');
  for (const route of evidence.routes) for (const item of route.judgments) {
    if (item.decision === 'apply' && !decisions.some((decision) => decision.status === 'resolved' && decision.knowledgeIds.includes(item.referenceId))) errors.push(`Adopted knowledge lacks a decision: ${item.referenceId}`);
  }
  for (const item of decisions) {
    if (new Set(item.options.map(({id}) => id)).size !== item.options.length) errors.push(`Duplicate options: ${item.id}`);
    if (item.status === 'open' || (item.status === 'resolved' && !item.options.some(({id}) => id === item.selected))) errors.push(`Unresolved decision: ${item.id}`);
    if (item.status === 'excluded' && (item.ruleIds.length || item.issueIds.length || item.selected)) errors.push(`Excluded decision cannot authorize work: ${item.id}`);
    if (item.authority !== 'model' && !item.confirmation) errors.push(`Missing supplied decision evidence: ${item.id}`);
    if (item.ruleIds.some((id) => !policy?.rules.some((rule) => rule.id === id)) || item.issueIds.some((id) => !issues?.some((issue) => issue.id === id))) errors.push(`Unknown contract links: ${item.id}`);
  }
  for (const rule of policy?.rules ?? []) {
    const owners = decisions.filter(item => item.status === 'resolved' && item.ruleIds.includes(rule.id));
    if (!owners.length) errors.push(`Rule lacks a decision: ${rule.id}`);
    // The model can choose mechanisms, but must not originate mandatory domain
    // outcomes. Declared layer/authority still require semantic review: this is
    // not an automatic interpretation of a natural-language contract.
    if (rule.layer === 'domain' && rule.obligation === 'required' && !owners.some(item => item.authority !== 'model' && item.confirmation))
      errors.push(`Required domain rule needs supplied or established domain authority: ${rule.id}. Link the existing contract when it already specifies this outcome; otherwise keep the new outcome open. Model discretion cannot establish domain requirements.`);
  }
  for (const issue of issues ?? []) if (!decisions.some((item) => item.status === 'resolved' && item.issueIds.includes(issue.id))) errors.push(`Issue lacks a decision: ${issue.id}`);
  return errors;
}
