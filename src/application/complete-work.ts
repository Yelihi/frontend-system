import { FileSystemProjectDiscovery } from '../adapters/filesystem/project-discovery.js';
import { saveExecution, saveReview, workflowContext, type reviewInputSchema } from './workflow-store.js';
import { runProjectChecks, summarizeChecks } from './run-capabilities.js';
import type * as z from 'zod/v4';

/** A single-issue convenience path. Human/model findings remain explicit; guards are unchanged. */
export async function completeWork(root: string, options: {
  planId: string; expectedHash: string; attemptId: string; baselineCheckId?: string | undefined;
  reviews: Array<z.input<typeof reviewInputSchema>>;
}) {
  const state = await workflowContext(root, options.planId);
  const execution = state.execution;
  const policy = state.revision.policy;
  if (!execution || state.executionHash !== options.expectedHash || !state.revision.approved || !policy
    || execution.revisionHash !== state.revision.hash) throw new Error('Reread the exact current approved execution before completing');
  if (execution.steps.length !== 1 || execution.status === 'complete') throw new Error('Combined completion is for one unfinished issue; use individual tools for other executions');
  const step = execution.steps[0]!;
  const ids = new Set(options.reviews.map(review => review.reviewId));
  if (ids.size !== options.reviews.length || ids.size !== policy.reviews.length || policy.reviews.some(review => !ids.has(review.id))) {
    throw new Error(`Supply every approved semantic review exactly once: ${policy.reviews.map(review => review.id).join(', ') || 'none'}`);
  }
  if (options.reviews.some(review => review.stepId !== step.id || review.attemptId !== options.attemptId
    || review.status !== 'passed' || review.remaining.length)) throw new Error('Completion requires explicit passing reviews for this step/attempt with no remaining work');
  const discovery = new FileSystemProjectDiscovery();
  const profile = await discovery.discover(await discovery.createRef(root));
  const checked = await runProjectChecks(profile, {planId: options.planId, stage: 'delivery', attemptId: options.attemptId});
  const check = summarizeChecks(checked);
  if (!checked.stable || !checked.coverage?.allRequiredPassed || checked.results.some(result => result.status !== 'passed')) {
    return {status: 'checks-failed' as const, check, reviewIds: [], next: 'Execution is not complete. Inspect failures and repair under the recorded attempt budget.'};
  }
  const reviewIds: string[] = [];
  try {
    for (const review of options.reviews) reviewIds.push((await saveReview(root, review, options.planId)).id);
    const baselineCheckId = options.baselineCheckId ?? execution.baselineCheckId;
    const saved = await saveExecution(root, {
      ...execution, status: 'complete', finalCheckId: checked.id,
      ...(baselineCheckId ? {baselineCheckId} : {}),
      steps: [{...step, status: 'complete', remaining: [], checkIds: [checked.id], reviewIds, attemptId: options.attemptId}],
      note: 'Host declared the approved single issue ready; delivery checks, explicit semantic reviews and completion guards accepted.',
    }, options.expectedHash, options.planId);
    return {status: 'complete' as const, executionHash: saved.hash, check, reviewIds,
      next: 'Completion was accepted on the current source. Report the checks and actual scope limitations; no extra status/routing call is required.'};
  } catch (error) {
    return {status: 'incomplete' as const, check, reviewIds, error: String(error),
      next: 'Keep these accepted records. Inspect current workflow and resolve the cause using the individual tools; completion was not accepted.'};
  }
}
