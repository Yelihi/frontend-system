import { git } from './git-state.js';
import { FileSystemProjectDiscovery } from '../adapters/filesystem/project-discovery.js';
import { policyFailures, requiredScripts } from './policy.js';
import { prScope, samePrScope } from './pr-scope.js';
import { readCheckRecord, readReview, sourceSnapshot, verifyStep, verifyReviews, workflowContext } from './workflow-store.js';

// Reuse completed work and semantic evidence; this gate never starts another model.
export async function checkPrReadiness(root: string, planId: string | undefined, base: string, stepId?: string) {
  const changes = await prScope(root, base);
  const state = await workflowContext(root, planId);
  const failures: string[] = [];
  if (changes.dirtyFiles.length) failures.push('Commit the intended changes before the final PR review; working tree/index is dirty');
  if (!changes.files.length) failures.push('No product changes against the PR merge base');
  const step = stepId ? state.execution?.steps.find(item => item.id === stepId) : undefined;
  if (stepId) {
    if (!step || step.status !== 'complete' || step.remaining.length || !state.revision.approved
      || state.execution?.revisionHash !== state.revision.hash) failures.push('Select a completed issue from the current approved execution');
    if (state.execution?.steps.some(item => item.id !== stepId && item.status === 'running')) failures.push('Finish one issue at a time');
    if (step && changes.files.some(path => !step.files.includes(path))) failures.push('PR contains files outside the selected issue contract');
  }
  const branch = (await git(root, ['branch', '--show-current'])).trim();
  const baseBranch = (await git(root, ['rev-parse', '--symbolic-full-name', base])).trim().replace(/^refs\/(heads\/|remotes\/[^/]+\/)/, '');
  if (!branch || ['main', 'master', baseBranch].includes(branch)) failures.push('PR requires a separate issue branch, not the target branch or detached HEAD');
  if (!stepId && state.verification.status !== 'verified') failures.push(`Execution is ${state.verification.status}; finish current approved work first`);
  failures.push(...state.verification.failures);
  const policy = state.revision.policy;
  const sourceHash = state.verification.sourceHash;
  if (!policy) failures.push('An approved verification policy is required');
  let e2eScripts: string[] = [];
  if (policy) {
    const discovery = new FileSystemProjectDiscovery();
    const profile = await discovery.discover(await discovery.createRef(root));
    e2eScripts = Object.entries(profile.scripts).filter(([name, command]) =>
      !/(^|:)(watch|dev|update|fix|ui)(:|$)/.test(name) &&
      (/(^|:)(e2e|playwright|cypress)(:|$)/.test(name) || /\b(playwright\s+test|cypress\s+run)\b/.test(command)))
      .map(([name]) => name);
    failures.push(...policyFailures(policy, profile.scripts, await sourceSnapshot(root)));
    for (const id of ['pr-safety', 'pr-scope']) {
      const requirement = policy.reviews.find(review => review.id === id);
      if (!requirement?.ruleIds.length) failures.push(`Plan must define ${id} with explicit applicable rules`);
    }
  }
  const checkId = stepId ? step?.checkIds.at(-1) : state.verification.finalCheckId;
  if (!checkId) failures.push('Missing final check record');
  else {
    const check = await readCheckRecord(root, checkId, planId);
    if (check.purpose !== 'verification' || !check.stable || check.sourceHash !== sourceHash || check.revisionHash !== state.revision.hash
      || (stepId && check.attemptId !== step?.attemptId)
      || !check.results.length || check.results.some(result => result.status !== 'passed' || !result.passed)
      || (policy && requiredScripts(policy).some(script => !check.results.some(result => result.capability === script && result.status === 'passed')))) {
      failures.push('Final checks are incomplete, failed or stale');
    }
  }
  const reviewIds = stepId ? step?.reviewIds ?? [] : state.verification.reviewIds;
  const reviews = await Promise.all(reviewIds.map(id => readReview(root, id, planId)));
  if (policy && sourceHash && state.revision.hash) {
    try {
      if (stepId && step) await verifyStep(root, step, policy, state.revision.hash, sourceHash, planId);
      else await verifyReviews(root, reviews, policy, state.revision.hash, sourceHash, planId);
    } catch (error) {failures.push(error instanceof Error ? error.message : String(error));}
  }
  let delivery: (typeof reviews)[number]["delivery"];
  for (const id of ['pr-safety', 'pr-scope']) {
    const current = reviews.filter(review => review.reviewId === id && review.status === 'passed' && !review.remaining.length
      && review.revisionHash === state.revision.hash && review.sourceHash === sourceHash && samePrScope(review.prScope, changes.scope));
    if (!current.length) failures.push(`Missing passing ${id} review for this exact PR base/head`);
    if (id === 'pr-scope') {
      const covered = new Set(current.flatMap(review => review.findings.flatMap(finding => finding.files)));
      const missing = changes.files.filter(path => !covered.has(path));
      if (missing.length) failures.push(`PR scope review omitted changed files: ${missing.join(', ')}`);
      delivery = current.at(-1)?.delivery;
      if (!delivery) failures.push('Missing developer test instructions and unit/lint/types/E2E delivery mapping on pr-scope review');
      else {
        const scripts = [...new Set([delivery.checks.unit, delivery.checks.lint, delivery.checks.types, ...delivery.checks.e2e, ...e2eScripts])];
        if (!policy || scripts.some(script => !requiredScripts(policy).includes(script))) failures.push('Delivery checks must be required policy scripts, including existing E2E');
        if (e2eScripts.some(script => !delivery!.checks.e2e.includes(script))) failures.push('Delivery mapping omitted existing E2E scripts');
        const snapshot = await sourceSnapshot(root);
        if (delivery.manual.some(item => item.fixture && !snapshot[item.fixture])) failures.push('Developer test fixture is missing from project source');
      }
    }
  }
  const finalChanges = await prScope(root, base);
  if (!samePrScope(changes.scope, finalChanges.scope) || finalChanges.dirtyFiles.length) failures.push('PR source changed during readiness check');
  return {status: failures.length ? 'blocked' : 'ready', failures: [...new Set(failures)], ...changes,
    stepId: stepId ?? null, branch, delivery: delivery ?? null, planId: planId ?? null, revisionHash: state.revision.hash, finalCheckId: checkId,
    authority: 'Local evidence gate, including host judgments; not proof of no bugs/security issues, a GitHub status check, or permission to create/merge a PR'};
}
