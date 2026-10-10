import { FileSystemProjectDiscovery } from '../adapters/filesystem/project-discovery.js';
import { policyFailures, requiredScripts } from './policy.js';
import { prScope, samePrScope } from './pr-scope.js';
import { readCheckRecord, readReview, sourceSnapshot, verifyReviews, workflowContext } from './workflow-store.js';

// Reuse completed work and semantic evidence; this gate never starts another model.
export async function checkPrReadiness(root: string, planId: string | undefined, base: string) {
  const changes = await prScope(root, base);
  const state = await workflowContext(root, planId);
  const failures: string[] = [];
  if (changes.dirtyFiles.length) failures.push('Commit the intended changes before the final PR review; working tree/index is dirty');
  if (!changes.files.length) failures.push('No product changes against the PR merge base');
  if (state.verification.status !== 'verified') failures.push(`Execution is ${state.verification.status}; finish current approved work first`);
  failures.push(...state.verification.failures);
  const policy = state.revision.policy;
  const sourceHash = state.verification.sourceHash;
  if (!policy) failures.push('An approved verification policy is required');
  if (policy) {
    const discovery = new FileSystemProjectDiscovery();
    const profile = await discovery.discover(await discovery.createRef(root));
    failures.push(...policyFailures(policy, profile.scripts, await sourceSnapshot(root)));
    for (const id of ['pr-safety', 'pr-scope']) {
      const requirement = policy.reviews.find(review => review.id === id);
      if (!requirement?.ruleIds.length) failures.push(`Plan must define ${id} with explicit applicable rules`);
    }
  }
  const checkId = state.verification.finalCheckId;
  if (!checkId) failures.push('Missing final check record');
  else {
    const check = await readCheckRecord(root, checkId, planId);
    if (check.purpose !== 'verification' || !check.stable || check.sourceHash !== sourceHash || check.revisionHash !== state.revision.hash
      || !check.results.length || check.results.some(result => result.status !== 'passed' || !result.passed)
      || (policy && requiredScripts(policy).some(script => !check.results.some(result => result.capability === script && result.status === 'passed')))) {
      failures.push('Final checks are incomplete, failed or stale');
    }
  }
  const reviews = await Promise.all(state.verification.reviewIds.map(id => readReview(root, id, planId)));
  if (policy && sourceHash && state.revision.hash) {
    try {await verifyReviews(root, reviews, policy, state.revision.hash, sourceHash, planId);}
    catch (error) {failures.push(error instanceof Error ? error.message : String(error));}
  }
  for (const id of ['pr-safety', 'pr-scope']) {
    const current = reviews.filter(review => review.reviewId === id && review.status === 'passed' && !review.remaining.length
      && review.revisionHash === state.revision.hash && review.sourceHash === sourceHash && samePrScope(review.prScope, changes.scope));
    if (!current.length) failures.push(`Missing passing ${id} review for this exact PR base/head`);
    if (id === 'pr-scope') {
      const covered = new Set(current.flatMap(review => review.findings.flatMap(finding => finding.files)));
      const missing = changes.files.filter(path => !covered.has(path));
      if (missing.length) failures.push(`PR scope review omitted changed files: ${missing.join(', ')}`);
    }
  }
  const finalChanges = await prScope(root, base);
  if (!samePrScope(changes.scope, finalChanges.scope) || finalChanges.dirtyFiles.length) failures.push('PR source changed during readiness check');
  return {status: failures.length ? 'blocked' : 'ready', failures: [...new Set(failures)], ...changes,
    planId: planId ?? null, revisionHash: state.revision.hash, finalCheckId: checkId,
    authority: 'Local evidence gate, including host judgments; not proof of no bugs/security issues, a GitHub status check, or permission to create/merge a PR'};
}
