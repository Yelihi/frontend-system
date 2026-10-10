import { createHash } from 'node:crypto';
import { realpath } from 'node:fs/promises';
import * as z from 'zod/v4';
import { changedFiles, git } from './git-state.js';

const commit = z.string().regex(/^[a-f0-9]{40,64}$/);
export const prScopeSchema = z.strictObject({
  base: z.string().min(1).refine(value => !value.startsWith('-') && !value.includes('\0')),
  baseCommit: commit, mergeBase: commit, headCommit: commit,
  diffHash: z.string().regex(/^[a-f0-9]{64}$/),
});
export type PrScope = z.infer<typeof prScopeSchema>;

export async function prScope(root: string, base: string) {
  prScopeSchema.shape.base.parse(base);
  const top = (await git(root, ['rev-parse', '--show-toplevel'])).trim();
  if (await realpath(top) !== await realpath(root)) throw new Error('PR review requires the repository root, not a package subdirectory');
  const baseCommit = (await git(root, ['rev-parse', '--verify', `${base}^{commit}`])).trim();
  const headCommit = (await git(root, ['rev-parse', '--verify', 'HEAD^{commit}'])).trim();
  const mergeBase = (await git(root, ['merge-base', baseCommit, headCommit])).trim();
  const diff = await git(root, ['diff', '--binary', '--no-ext-diff', '--no-textconv', mergeBase, headCommit, '--']);
  const files = (await git(root, ['diff', '--name-only', '--no-renames', '-z', mergeBase, headCommit, '--']))
    .split('\0').filter(path => path && path !== '.frontend-system' && !path.startsWith('.frontend-system/')).sort();
  const scope = prScopeSchema.parse({base, baseCommit, mergeBase, headCommit,
    diffHash: createHash('sha256').update(diff).digest('hex')});
  return {scope, files, dirtyFiles: await changedFiles(root)};
}

export function samePrScope(left: PrScope | undefined, right: PrScope): boolean {
  return !!left && Object.keys(prScopeSchema.shape).every(key => left[key as keyof PrScope] === right[key as keyof PrScope]);
}
