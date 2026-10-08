import type { readRevision } from './workflow-store.js';
import { designContractFailures } from './design-contract.js';
import { policyProtectionFailures } from './policy.js';
import { contentHash, type ReferenceIndex } from './knowledge/reference-index.js';

type Revision = Awaited<ReturnType<typeof readRevision>>;

// Detail selection must not hide unresolved obligations from the host.
export function revisionDiagnostics(revision: Revision) {
  return {
    contractDiagnostics: revision.contractVersion === 2 ? designContractFailures(revision.evidence, revision.policy, revision.issues)
      .concat(revision.policy ? policyProtectionFailures(revision.policy) : []) : [],
    diagnosticsScope: 'Stored contract links only; approval still checks current evidence, sources, scripts and guards. This receipt is not approval.',
  };
}

// This is an audit of recorded links, never a counterfactual measure of benefit.
// Changed metadata is deliberately withheld: it is not the historical knowledge.
export function revisionInfluence(revision: Revision, index: ReferenceIndex | null | undefined, offset: number, limit: number) {
  const evidence = revision.evidence;
  const ids = [...new Set([
    ...Object.keys(evidence?.referenceHashes ?? {}),
    ...(evidence?.routes.flatMap(route => route.judgments.map(item => item.referenceId)) ?? []),
  ])].sort();
  return {
    planId: revision.planId, hash: revision.hash, detail: 'influence',
    evidenceStatus: revision.evidenceStatus,
    authority: 'Recorded provenance and host judgments, not proof of correct applicability or causal improvement. Metadata matching does not verify current source bodies or code; use evidenceStatus and current scoped review.',
    knowledge: ids.slice(offset, offset + limit).map(id => {
      const entry = index?.entries.find(item => item.id === id);
      const expectedHash = evidence?.referenceHashes[id];
      const metadataStatus = !entry ? 'missing' : !expectedHash ? 'unbound'
        : contentHash(JSON.stringify(entry)) === expectedHash ? 'matched' : 'changed';
      return {
        id, metadataStatus, recordedMetadataHash: expectedHash ?? null,
        metadata: metadataStatus === 'matched' && entry ? {
          title: entry.title, path: entry.path, contentHash: entry.contentHash,
          sources: entry.sources, conditions: entry.conditions, exclusions: entry.exclusions,
          checks: entry.checks ?? [],
        } : null,
        judgments: evidence?.routes.flatMap(route => route.judgments
          .filter(item => item.referenceId === id).map(item => ({
            routeHash: route.hash, files: route.input.files,
            // Explicitly labeled host interpretation; not a reconstructed AST match.
            hostInterpretations: route.input.interpretations, ...item,
          }))) ?? [],
        decisions: evidence?.decisions.filter(decision => decision.knowledgeIds.includes(id)) ?? [],
      };
    }),
    decisionsWithoutKnowledge: evidence?.decisions.filter(decision => !decision.knowledgeIds.length)
      .map(({id, question, status}) => ({id, question, status})) ?? [],
    total: ids.length, nextOffset: offset + limit < ids.length ? offset + limit : null,
  };
}

// Only transport representations change. Persistence, hashes and gates use the full revision.
export function revisionReceipt(revision: Revision) {
  return {
    planId: revision.planId, hash: revision.hash, version: revision.version,
    approved: revision.approved, drifted: revision.drifted,
    contractVersion: revision.contractVersion, evidenceStatus: revision.evidenceStatus,
    decisions: revision.evidence?.decisions.map(({id, status, selected}) => ({id, status, selected})) ?? [],
    ruleIds: revision.policy?.rules.map(({id}) => id) ?? [],
    issueIds: revision.issues?.map(({id}) => id) ?? [],
    ...revisionDiagnostics(revision),
    readWith: 'get_revision: contract for plan/policy/issues, decisions for editing choices, full only for raw routing evidence. Reuse already read contracts while hash is unchanged.',
  };
}

export function revisionWindow(revision: Revision, offset: number, limit: number, detail: 'contract' | 'decisions' | 'full') {
  if (detail === 'decisions') return {
    ...revisionReceipt(revision),
    decisions: revision.evidence?.decisions ?? [],
    routeJudgments: revision.evidence?.routes.map(({hash, judgments}) => ({hash, judgments})) ?? [],
    detail, updateWith: 'Use save_revision.decisionUpdates by ID. For new documents or changed routing also provide evidenceRoutes:[{contextId,judgments}] from fresh get_work_context. This replaces stored routes and preserves untouched decisions. Include all still-cited files/documents. Omit unchanged content/policy/issues. Full detail is not needed.',
  };
  const lines = revision.content.split('\n');
  const { evidence, ...contract } = revision;
  return {
    ...contract, ...revisionDiagnostics(revision), ...(detail === 'full' ? {evidence} : {}),
    content: lines.slice(offset, offset + limit).join('\n'),
    totalLines: lines.length, nextOffset: offset + limit < lines.length ? offset + limit : null,
    detail, evidenceReadWith: 'get_revision(detail: decisions) for editing choices/citations; full only for debugging raw routing snapshots',
  };
}
