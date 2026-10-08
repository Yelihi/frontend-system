import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import { readFile, realpath, stat } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";

// Diagnostic only: never choose an occurrence or change a failed evidence check.
export function quoteLocationHint(content: string, quote: string): string {
  if (!quote) return 'No nonempty exact quote supplied.';
  const lines: number[] = [];
  let offset = content.indexOf(quote);
  while (offset >= 0 && lines.length < 10) {
    lines.push(content.slice(0, offset).split(/\r?\n/).length);
    offset = content.indexOf(quote, offset + 1);
  }
  return lines.length ? `Exact quote starts at line(s): ${lines.join(', ')}${offset >= 0 ? ' (more omitted)' : ''}. Confirm the intended occurrence; locations do not validate its meaning.`
    : 'Exact quote not found in the inspected version.';
}

async function projectSourcePath(root: string, path: string) {
  if (isAbsolute(path)) throw new Error("Expected a project-relative file");
  const base = await realpath(root);
  const absolute = await realpath(resolve(base, path));
  const rel = relative(base, absolute);
  if (!rel || rel.startsWith("..") || isAbsolute(rel) || rel.split(/[\\/]/).some((part) =>
    ["node_modules", ".git", ".frontend-system"].includes(part))) throw new Error("File outside project source scope");
  return {absolute, path:rel.replaceAll('\\', '/')};
}

export async function projectFileHash(root: string, path: string) {
  const source = await projectSourcePath(root, path);
  const hash = createHash('sha256');
  let bytes = 0;
  for await (const chunk of createReadStream(source.absolute)) { hash.update(chunk); bytes += chunk.length; }
  return {hash:hash.digest('hex'), bytes};
}

export async function projectFile(root: string, path: string) {
  const {absolute, path:local} = await projectSourcePath(root, path);
  if ((await stat(absolute)).size > 512_000) throw new Error("File exceeds 512 KB inspection budget");
  return { absolute, path: local, content: await readFile(absolute, "utf8") };
}
