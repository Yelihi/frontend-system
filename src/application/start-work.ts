import { FileSystemProjectDiscovery } from '../adapters/filesystem/project-discovery.js';
import { beginAttempt, saveExecution, workflowContext } from './workflow-store.js';
import { runProjectChecks, summarizeChecks } from './run-capabilities.js';

/** Start only a new, already approved execution; all original write guards still run. */
export async function startWork(root: string, options: {
  planId: string; revisionHash: string; stepId: string;
  kind: 'setup' | 'implement' | 'refactor' | 'verify';
}) {
  const state = await workflowContext(root, options.planId);
  if (state.execution) throw new Error('Execution already exists; resume it with begin_work_attempt, never reset it');
  if (!state.revision.approved || state.revision.hash !== options.revisionHash) {
    throw new Error('Start requires the exact current approved revision');
  }
  const issues = state.revision.issues;
  const first = issues?.find(issue => issue.id === options.stepId);
  if (!first || first.dependsOn.length) throw new Error('Select an approved issue without incomplete dependencies');
  const execution = await saveExecution(root, {
    revisionHash: options.revisionHash, kind: options.kind, status: 'in-progress',
    steps: issues!.map(({id}) => ({id, status: 'pending', checkIds: [], remaining: []})),
    note: 'Initialized from the approved issue contracts.',
  }, null, options.planId);
  // Each existing operation retains its own lock and freshness checks. If one fails,
  // retain the accepted earlier record and return its identity for safe resumption.
  try {
    const attempt = await beginAttempt(root, options.stepId, execution.hash, options.planId);
    try {
      const discovery = new FileSystemProjectDiscovery();
      const profile = await discovery.discover(await discovery.createRef(root));
      const baseline = await runProjectChecks(profile, {planId: options.planId, stage: 'baseline', attemptId: attempt.id});
      return {status: 'started' as const, executionHash: execution.hash, attempt, baseline: summarizeChecks(baseline),
        next: 'Review baseline failures before editing. Retain attempt.id and baseline.id for verification and checkpoints; final passing checks and semantic reviews are still required.'};
    } catch (error) {
      return {status: 'baseline-error' as const, executionHash: execution.hash, attempt, error: String(error),
        next: 'Execution and attempt are saved. Resolve the baseline error and run baseline checks with this attempt; do not initialize again.'};
    }
  } catch (error) {
    return {status: 'attempt-error' as const, executionHash: execution.hash, error: String(error),
      next: 'Execution is saved. Inspect current workflow and resolve the cause before begin_work_attempt; do not initialize again.'};
  }
}
