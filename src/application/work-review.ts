import { execFile } from 'node:child_process';
import { realpath } from 'node:fs/promises';
import { git } from './git-state.js';
import { workflowContext } from './workflow-store.js';

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
  const mergeBase = (await git(root, ['merge-base', base, 'HEAD'])).trim();
  const paths = (await git(root, ['diff', '--name-only', '--no-renames', '-z', mergeBase, '--'])).split('\0').filter(Boolean);
  const untracked = (await git(root, ['ls-files', '--others', '--exclude-standard', '-z'])).split('\0').filter(Boolean);
  const files = [...new Set([...paths, ...untracked])].filter(path => !path.startsWith('.frontend-system/'));
  const outsideIssue = files.filter(path => !issue.files.includes(path));
  const tracked = paths.filter(path => !path.startsWith('.frontend-system/'));
  const diff = includeDiff && tracked.length ? await git(root, ['diff', '--no-ext-diff', '--no-textconv', mergeBase, '--', ...tracked]) : '';
  const additions = includeDiff ? await Promise.all(untracked.filter(path => !path.startsWith('.frontend-system/'))
    .map(async path => untrackedDiff(root, path))) : [];
  return {planId, issueId: stepId, revisionHash: state.revision.hash, executionHash: state.executionHash,
    sourceHash: state.verification.sourceHash, verification: state.verification.status, files,
    outsideIssue, cases: issue.testCases?.map(item => ({id: item.id, scenarioId: item.scenarioId ?? null,
      method: item.method, expected: item.then, evidence: step.caseEvidence?.find(value => value.caseId === item.id) ?? null})) ?? [],
    checkIds: step.checkIds, reviewIds: step.reviewIds ?? [], feedback: step.implementationReview ?? null,
    diff: diff + additions.join('')};
}
