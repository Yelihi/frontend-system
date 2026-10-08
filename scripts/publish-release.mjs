import {execFile} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {promisify} from 'node:util';
import {checkReleaseReadiness} from '../dist/src/application/release-manifest.js';

const exec = promisify(execFile);
const run = async (command, args) => (await exec(command, args, {maxBuffer: 2_000_000})).stdout.trim();
const digest = async path => createHash('sha256').update(await readFile(path)).digest('hex');
const version = process.argv[2];
const env = process.env;
if (env.GITHUB_EVENT_NAME !== 'workflow_dispatch' || env.GITHUB_REF !== 'refs/heads/main' ||
  env.GITHUB_REPOSITORY !== 'Yelihi/frontend-system' || env.GITHUB_ACTOR !== 'Yelihi' || env.GITHUB_TRIGGERING_ACTOR !== 'Yelihi') throw new Error('Release runs only from an explicit official main workflow_dispatch');
const manifest = await checkReleaseReadiness(process.cwd());
if (manifest.pluginVersion !== version) throw new Error('Requested version does not match the built release manifest');
const commit = await run('git', ['rev-parse', 'HEAD']);
if (commit !== env.GITHUB_SHA || await run('git', ['status', '--porcelain', '--untracked-files=no']))
  throw new Error('Release requires the exact tested clean commit');
const tag = `v${version}`;
const repo = env.GITHUB_REPOSITORY;
const channel = await run('git', ['ls-remote', '--heads', 'origin', 'refs/heads/release']);
if (channel) {
  const previous = channel.split(/\s/)[0];
  await run('git', ['fetch', 'origin', 'release']);
  await run('git', ['merge-base', '--is-ancestor', previous, commit]);
  if (previous !== commit) {
    const oldVersion = JSON.parse(await run('git', ['show', `${previous}:package.json`])).version;
    const a = version.split('.').map(Number), b = oldVersion.split('.').map(Number);
    const different = a.findIndex((value, i) => value !== b[i]);
    if (different < 0 || a[different] < b[different]) throw new Error('A new release commit must increase the plugin version');
  }
}
const packagePath = `dist/release/frontend-system-${version}.tgz`;
const checksums = `${await digest(packagePath)}  frontend-system-${version}.tgz\n${await digest('release-manifest.json')}  release-manifest.json\n`;
await writeFile('dist/release/SHA256SUMS', checksums);
await writeFile('dist/release/notes.md', `FS ${version}\n\nCommit: ${commit}\nKnowledge index: ${manifest.knowledgeIndexHash}\n\nPublished by an explicit maintainer workflow. Knowledge PR merge and sync alone do not release this version.\n`);
const remoteTag = await run('git', ['ls-remote', '--tags', 'origin', `refs/tags/${tag}`, `refs/tags/${tag}^{}`]);
if (remoteTag) {
  const rows = remoteTag.split('\n');
  const target = (rows.find(row => row.endsWith('^{}')) ?? rows[0]).split(/\s/)[0];
  if (target !== commit) throw new Error('Release tag already points at a different commit; never overwrite it');
} else {
  await run('git', ['tag', tag, commit]);
  await run('git', ['push', 'origin', `refs/tags/${tag}`]);
}
let release;
try { release = JSON.parse(await run('gh', ['api', `repos/${repo}/releases/tags/${tag}`])); }
catch (error) { if (!String(error.stderr).includes('HTTP 404')) throw error; }
if (!release) {
  await run('gh', ['release', 'create', tag, '--repo', repo, '--verify-tag', '--draft', '--title', tag, '--notes-file', 'dist/release/notes.md']);
}
if (!release || release.draft) {
  await run('gh', ['release', 'upload', tag, '--repo', repo, packagePath, 'release-manifest.json', 'dist/release/SHA256SUMS', '--clobber']);
  await run('gh', ['release', 'edit', tag, '--repo', repo, '--draft=false', '--latest']);
} else {
  // A retry after publication must verify immutable assets, never replace them.
  await mkdir('dist/release/verify', {recursive: true});
  await run('gh', ['release', 'download', tag, '--repo', repo, '--dir', 'dist/release/verify',
    '--pattern', 'SHA256SUMS', '--pattern', `frontend-system-${version}.tgz`, '--pattern', 'release-manifest.json', '--clobber']);
  if (await readFile('dist/release/verify/SHA256SUMS', 'utf8') !== checksums ||
    await digest(`dist/release/verify/frontend-system-${version}.tgz`) !== await digest(packagePath) ||
    await digest('dist/release/verify/release-manifest.json') !== await digest('release-manifest.json'))
    throw new Error('Published release checksums differ; refusing to replace assets');
}
// Fast-forward only. PRs/main pushes cannot move the installation channel.
await run('git', ['push', 'origin', `${commit}:refs/heads/release`]);
console.log(`Published ${tag} (${commit}) and advanced the release channel.`);
