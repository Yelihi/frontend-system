import {createHash} from 'node:crypto';
import {readFile, readdir, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {readReferenceIndex} from './knowledge/reference-index.js';
import {knowledgeStatus, validateKnowledgeSync} from './knowledge/catalog.js';

const metadataFiles = ['package.json', '.codex-plugin/plugin.json', '.claude-plugin/plugin.json'];
const marketplaceFiles = ['.agents/plugins/marketplace.json', '.claude-plugin/marketplace.json'];
const hash = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
const readJson = async (root: string, path: string) => JSON.parse(await readFile(join(root, path), 'utf8'));
export function releaseVersion(value: string) {
  if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(value) || !value.split('.').every(part => Number.isSafeInteger(Number(part)))) throw new Error('Release version must be MAJOR.MINOR.PATCH without a prefix or leading zeroes');
  return value;
}

export async function installedReleaseIdentity(root: string) {
  const body = await readFile(join(root, 'release-manifest.json'), 'utf8');
  const manifest = JSON.parse(body);
  return {pluginVersion: manifest.pluginVersion, knowledgeIndexHash: manifest.knowledgeIndexHash,
    manifestHash: hash(body), knowledgeCount: manifest.knowledge.length,
    authority: 'Identity of installed build files; not proof of a GitHub release or a changed project decision'};
}

export async function setReleaseVersion(root: string, version: string) {
  releaseVersion(version);
  const files = await Promise.all(metadataFiles.map(async path => ({path, value: await readJson(root, path)})));
  const lock = await readJson(root, 'package-lock.json');
  for (const {value} of files) value.version = version;
  lock.version = version;
  lock.packages[''].version = version;
  for (const {path, value} of [...files, {path: 'package-lock.json', value: lock}])
    await writeFile(join(root, path), `${JSON.stringify(value, null, 2)}\n`);
}

export async function createReleaseManifest(root: string) {
  const metadata = await Promise.all(metadataFiles.map(path => readJson(root, path)));
  const version = releaseVersion(metadata[0].version);
  if (metadata.some(value => value.version !== version)) throw new Error('Package/Codex/Claude versions differ');
  const lock = await readJson(root, 'package-lock.json');
  if (lock.version !== version || lock.packages[''].version !== version) throw new Error('Lockfile version differs');
  for (const path of marketplaceFiles) {
    const marketplace = await readJson(root, path);
    const plugin = marketplace.plugins.find((entry: {name: string}) => entry.name === 'frontend-system');
    if (plugin?.source?.ref !== 'release' || plugin.source.url !== 'https://github.com/Yelihi/frontend-system.git')
      throw new Error(`Marketplace must use the official release branch: ${path}`);
  }
  const paths = ['package.json', '.mcp.json'];
  const visit = async (directory: string) => {
    for (const entry of await readdir(join(root, directory), {withFileTypes: true})) {
      // npm pack excludes these local editor/OS files even inside included directories.
      if (entry.name === '.DS_Store' || /^\..*\.swp$/.test(entry.name)) continue;
      const path = `${directory}/${entry.name}`;
      if (entry.isSymbolicLink()) throw new Error(`Release file must not be a symlink: ${path}`);
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile()) paths.push(path);
    }
  };
  for (const directory of ['bundle', 'skills', 'references', 'mandatory-rules', '.codex-plugin', '.claude-plugin', '.agents/plugins']) await visit(directory);
  const files: Record<string, string> = {};
  for (const path of paths.sort()) files[path] = hash(await readFile(join(root, path)));
  const index = await readReferenceIndex(join(root, 'references/learned'));
  if (!index) throw new Error('Release requires a published knowledge index');
  const knowledge = [...index.entries].sort((a, b) => a.id.localeCompare(b.id)).map(entry => ({
    id: entry.id, contentHash: entry.contentHash, metadataHash: hash(JSON.stringify(entry)), sources: entry.sources,
  }));
  return {schemaVersion: 1, pluginVersion: version, channel: 'release',
    knowledgeIndexHash: files['references/learned/index.json'], knowledge, files};
}

export async function checkReleaseManifest(root: string) {
  const expected = await createReleaseManifest(root);
  const actual = await readJson(root, 'release-manifest.json');
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('Release manifest differs from built files; rebuild and review the changes');
  return expected;
}

export async function checkReleaseReadiness(root: string) {
  const manifest = await checkReleaseManifest(root);
  await validateKnowledgeSync(root, []);
  const status = await knowledgeStatus(root);
  const used = new Set(manifest.knowledge.flatMap(entry => Object.keys(entry.sources)));
  const blocked = status.unpublished.filter(id => used.has(id));
  if (blocked.length || status.affectedReferences.length)
    throw new Error(`Release has unsynced knowledge: ${blocked.join(', ')}; affected references: ${status.affectedReferences.join(', ')}`);
  return manifest;
}
