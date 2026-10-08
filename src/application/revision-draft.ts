import { readFile, realpath, stat } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import { contentHash } from './knowledge/reference-index.js';

// An editable transport for unapproved input, never a revision or executable file.
export async function readRevisionDraft(root: string, path: string) {
  if (!/^\.frontend-system\/drafts\/[a-z0-9][a-z0-9._-]*\.json$/.test(path)) {
    throw new Error('Draft file must be .frontend-system/drafts/<name>.json');
  }
  const base = await realpath(root);
  const file = await realpath(resolve(base, path));
  const local = relative(base, file).replaceAll('\\', '/');
  if (!/^\.frontend-system\/drafts\/[a-z0-9][a-z0-9._-]*\.json$/.test(local)) {
    throw new Error('Draft file resolves outside the project draft directory');
  }
  const info = await stat(file);
  if (!info.isFile() || info.size > 512_000) throw new Error('Draft must be a regular JSON file of at most 512 KB');
  const content = await readFile(file, 'utf8');
  if (Buffer.byteLength(content) > 512_000) throw new Error('Draft exceeds 512 KB');
  return {input: JSON.parse(content) as unknown, source: {path, hash: contentHash(content)}};
}
