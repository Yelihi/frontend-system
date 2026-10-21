import { execFile } from 'node:child_process';
import { realpath } from 'node:fs/promises';
import { git } from './git-state.js';
import { readReview, workflowContext } from './workflow-store.js';
import {readPinnedFlow} from './project-flows.js';

function untrackedDiff(root: string, path: string): Promise<string> {
  return new Promise((resolve, reject) => execFile('git', ['-C', root, 'diff', '--no-index', '--', '/dev/null', path],
    {maxBuffer: 10 * 1024 * 1024}, (error, stdout, stderr) => {
      if (!error || error.code === 1) resolve(stdout);
      else reject(new Error(stderr.trim() || error.message));
    }));
}

export async function workReview(root: string, planId: string, stepId: string, base: string, includeDiff = true) {
  const top = (await git(root, ['rev-parse', '--show-toplevel'])).trim();
  if (await realpath(top) !== await realpath(root)) throw new Error('Work review requires the repository root');
  const state = await workflowContext(root, planId);
  const step = state.execution?.steps.find(item => item.id === stepId);
  const issue = state.revision.issues?.find(item => item.id === stepId);
  if (!step || !issue || !state.verification.sourceHash) throw new Error('Select an existing plan execution issue');
  const reviews = await Promise.all((step.reviewIds ?? []).map(id => readReview(root, id, planId)));
  const mergeBase = (await git(root, ['merge-base', base, 'HEAD'])).trim();
  const paths = (await git(root, ['diff', '--name-only', '--no-renames', '-z', mergeBase, '--'])).split('\0').filter(Boolean);
  const untracked = (await git(root, ['ls-files', '--others', '--exclude-standard', '-z'])).split('\0').filter(Boolean);
  const files = [...new Set([...paths, ...untracked])].filter(path => !path.startsWith('.frontend-system/'));
  const outsideIssue = files.filter(path => !issue.files.includes(path));
  const tracked = paths.filter(path => !path.startsWith('.frontend-system/'));
  const diff = includeDiff && tracked.length ? await git(root, ['diff', '--no-ext-diff', '--no-textconv', mergeBase, '--', ...tracked]) : '';
  const additions = includeDiff ? await Promise.all(untracked.filter(path => !path.startsWith('.frontend-system/'))
    .map(async path => untrackedDiff(root, path))) : [];
  const flowContracts = [];
  for (const flowId of new Set(issue.implementationTargets?.flatMap(t => t.flowTarget ? [t.flowTarget.flowId] : []))) {
    const ref = state.revision.evidence?.analysisRefs?.find(r => r.kind === 'flow' && r.id === flowId);
    if (!ref) throw new Error(`Missing pinned implementation flow: ${flowId}`);
    const flow = await readPinnedFlow(root, ref.id, ref.hash);
    for (const target of issue.implementationTargets?.filter(t => t.flowTarget?.flowId === flowId) ?? []) {
      const node = flow.nodes.find(n => n.id === target.flowTarget!.nodeId);
      const contract = node?.contracts?.find(c => c.name === target.flowTarget!.contractName);
      if (!node || !contract) throw new Error(`Missing pinned implementation contract: ${target.target}`);
      flowContracts.push({target:target.target,flowId,flowHash:ref.hash,nodeId:node.id,contract,
        architecture:node.architecture??null,state:node.state,
        checks:flow.checks?.filter(c=>c.nodes.includes(node.id))??[],
        meaning:'Approved design to compare with current code; not an automatic implementation pass'});
    }
  }
  return {planId, issueId: stepId, revisionHash: state.revision.hash, executionHash: state.executionHash,
    sourceHash: state.verification.sourceHash, verification: state.verification.status, files,
    outsideIssue, cases: issue.testCases?.map(item => ({id: item.id, scenarioId: item.scenarioId ?? null,
      method: item.method, expected: item.then, evidence: step.caseEvidence?.find(value => value.caseId === item.id) ?? null})) ?? [],
    implementationTargets: issue.implementationTargets ?? [], flowContracts, checkIds: step.checkIds,
    remaining: step.remaining, verificationFailures: state.verification.failures,
    reviews: reviews.map(review => ({id: review.id, reviewId: review.reviewId, status: review.status,
      current: review.sourceHash === state.verification.sourceHash && review.revisionHash === state.revision.hash,
      findings: review.findings, remaining: review.remaining})),
    feedback: step.implementationReview ?? null,
    diff: diff + additions.join('')};
}
