import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, realpath, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parse } from 'parse5';
import * as z from 'zod/v4';

type Node = { nodeName: string; childNodes?: Node[]; attrs?: Array<{name: string; value: string}>; value?: string };
const digest = (value: string) => createHash('sha256').update(value).digest('hex');
const text = (node: Node): string => node.nodeName === '#text' ? node.value ?? ''
  : (node.childNodes ?? []).map(text).join('');
const attribute = (node: Node, name: string) => node.attrs?.find(item => item.name === name)?.value;

export function htmlCaptureManifest(html: string) {
  const document = parse(html) as unknown as Node;
  const find = (node: Node, tag: string): Node | undefined => node.nodeName === tag ? node
    : (node.childNodes ?? []).map(child => find(child, tag)).find(Boolean);
  const main = find(document, 'main') ?? find(document, 'article');
  if (!main) throw new Error('HTML has no main/article content; inspect it in a browser');
  const sections: string[] = [];
  const codeExamples: Array<{location: string; hash: string; section: string}> = [];
  let section = '';
  let interactive = false;
  const visit = (node: Node) => {
    if (attribute(node, 'role') === 'tablist' || attribute(node, 'role') === 'tab' ||
      attribute(node, 'aria-controls') || node.nodeName === 'input' && attribute(node, 'type') === 'radio') interactive = true;
    if (/^h[1-6]$/.test(node.nodeName)) {
      section = text(node).replace(/\s+/g, ' ').trim();
      if (section) sections.push(section);
    }
    if (node.nodeName === 'pre') {
      const code = text(node).replace(/\r\n/g, '\n').trim();
      if (code) codeExamples.push({location: `code-${codeExamples.length + 1}`, hash: digest(code), section});
      return;
    }
    if (node.nodeName === 'script' || node.nodeName === 'style') return;
    for (const child of node.childNodes ?? []) visit(child);
  };
  visit(main);
  if (sections.length > 100 || codeExamples.length > 100)
    throw new Error('HTML inventory exceeds 100 sections or code blocks; select a narrower source');
  return {sections, codeExamples, interactive};
}

const recordSchema = z.object({
  url: z.url(), finalUrl: z.url(), checkedAt: z.iso.date(), bodyHash: z.string().regex(/^[a-f0-9]{64}$/),
  manifest: z.object({sections: z.array(z.string()), codeExamples: z.array(z.object({
    location: z.string(), hash: z.string(), section: z.string(),
  })), interactive: z.boolean()}), manifestHash: z.string().regex(/^[a-f0-9]{64}$/),
});
export type HtmlCapture = z.infer<typeof recordSchema>;

async function capturePath(root: string, id: string) {
  if (!/^[a-z0-9][a-z0-9._-]*$/.test(id)) throw new Error('Invalid source ID');
  const folder = join(root, 'knowledge/.cache/html-captures');
  await mkdir(folder, {recursive: true});
  const canonical = join(await realpath(root), 'knowledge/.cache/html-captures');
  if (await realpath(folder) !== canonical) throw new Error('HTML capture directory must not traverse symlinks');
  return join(canonical, `${id}.json`);
}

export async function saveHtmlCapture(root: string, id: string, url: string, finalUrl: string, html: string) {
  const manifest = htmlCaptureManifest(html);
  const record = recordSchema.parse({url, finalUrl, checkedAt: new Date().toISOString().slice(0, 10),
    bodyHash: digest(html), manifest, manifestHash: digest(JSON.stringify(manifest))});
  const path = await capturePath(root, id), temp = `${path}.${randomUUID()}.tmp`;
  try {
    await writeFile(temp, JSON.stringify(record), {flag: 'wx', mode: 0o600});
    await rename(temp, path);
  } finally { await rm(temp, {force: true}); }
  return record;
}

export async function readHtmlCapture(root: string, id: string): Promise<HtmlCapture> {
  const path = await capturePath(root, id);
  if (await realpath(path) !== path) throw new Error('HTML capture must not be a symlink');
  const record = recordSchema.parse(JSON.parse(await readFile(path, 'utf8')));
  if (record.manifestHash !== digest(JSON.stringify(record.manifest))) throw new Error('HTML capture manifest changed');
  return record;
}
