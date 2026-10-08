import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {mkdir, mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {promisify} from 'node:util';
import test from 'node:test';
import {checkReleaseManifest, checkReleaseReadiness, createReleaseManifest, releaseVersion, setReleaseVersion} from '../src/application/release-manifest.js';
import {addKnowledgeNote} from '../src/application/knowledge/catalog.js';
import {contentHash} from '../src/application/knowledge/reference-index.js';

const exec = promisify(execFile);
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'fs-release-'));
  for (const directory of ['.codex-plugin', '.claude-plugin', '.agents/plugins', 'bundle', 'skills', 'references/learned', 'mandatory-rules'])
    await mkdir(join(root, directory), {recursive: true});
  for (const path of ['package.json', '.codex-plugin/plugin.json', '.claude-plugin/plugin.json'])
    await writeFile(join(root, path), JSON.stringify({name: 'frontend-system', version: '1.2.3'}));
  await writeFile(join(root, 'package-lock.json'), JSON.stringify({version: '1.2.3', packages: {'': {version: '1.2.3'}}}));
  await writeFile(join(root, '.mcp.json'), '{}');
  const marketplace = {plugins: [{name: 'frontend-system', source: {ref: 'release', url: 'https://github.com/Yelihi/frontend-system.git'}}]};
  for (const path of ['.agents/plugins/marketplace.json', '.claude-plugin/marketplace.json']) await writeFile(join(root, path), JSON.stringify(marketplace));
  await writeFile(join(root, 'references/learned/index.json'), JSON.stringify({version: 3, entries: [], outcomes: []}));
  await writeFile(join(root, 'bundle/mcp.js'), 'export {};');
  await writeFile(join(root, 'release-manifest.json'), JSON.stringify(await createReleaseManifest(root)));
  return root;
}

test('release manifest binds runtime and knowledge, enforces versions and stable installation channel', async () => {
  const root = await fixture();
  try {
    const first = await checkReleaseReadiness(root);
    assert.equal(first.pluginVersion, '1.2.3');
    assert.deepEqual(await createReleaseManifest(root), first, 'No timestamps or ambient checkout state');
    await writeFile(join(root, 'references/.guide.md.swp'), 'Local editor recovery data');
    await writeFile(join(root, 'references/.DS_Store'), 'Local directory metadata');
    assert.deepEqual(await checkReleaseManifest(root), first, 'npm-excluded local files must not enter the manifest');
    await writeFile(join(root, 'bundle/mcp.js'), 'export const changed = true;');
    await assert.rejects(checkReleaseManifest(root), /manifest differs/);
    await setReleaseVersion(root, '1.3.0');
    assert.equal((await createReleaseManifest(root)).pluginVersion, '1.3.0');
    const lock = JSON.parse(await readFile(join(root, 'package-lock.json'), 'utf8'));
    assert.equal(lock.packages[''].version, '1.3.0');
    await writeFile(join(root, '.codex-plugin/plugin.json'), JSON.stringify({version: '1.2.0'}));
    await assert.rejects(createReleaseManifest(root), /versions differ/);
    await setReleaseVersion(root, '1.3.0');
    const path = join(root, '.agents/plugins/marketplace.json');
    await writeFile(path, (await readFile(path, 'utf8')).replace('release', 'main'));
    await assert.rejects(createReleaseManifest(root), /official release branch/);
    assert.throws(() => releaseVersion('v1.0.0'), /MAJOR/);
    assert.throws(() => releaseVersion('01.0.0'), /MAJOR/);
  } finally {await rm(root, {recursive: true, force: true});}
});

test('manual publication script rejects automatic events and reuses an exact release on retry', async () => {
  const root = await fixture();
  const script = resolve('scripts/publish-release.mjs');
  try {
    await mkdir(join(root, 'bin'));
    await mkdir(join(root, 'dist/release'), {recursive: true});
    await writeFile(join(root, 'dist/release/frontend-system-1.2.3.tgz'), 'fixture artifact');
    const state = join(root, 'remote.json');
    await writeFile(state, JSON.stringify({calls: []}));
    const fake = `#!${process.execPath}
const fs=require('node:fs');const path=require('node:path');
const file=process.env.FAKE_REMOTE;const s=JSON.parse(fs.readFileSync(file,'utf8'));
const a=process.argv.slice(2), cmd=path.basename(process.argv[1]), head=process.env.GITHUB_SHA;
s.calls.push([cmd,...a]);let out='', code=0;
if(cmd==='git') {
 if(a[0]==='rev-parse') out=head;
 else if(a[0]==='ls-remote') out=a.includes('--heads') ? (s.channel ? s.channel+' refs/heads/release' : '') : (s.tag ? s.tag+' refs/tags/v1.2.3' : '');
 else if(a[0]==='show') out=JSON.stringify({version:'1.2.3'});
 else if(a[0]==='push') {if(a[2].includes('refs/heads/release'))s.channel=head;else s.tag=head;}
} else {
 if(a[0]==='api') {if(!s.release){process.stderr.write('HTTP 404');code=1;}else out=JSON.stringify(s.release);}
 else if(a[1]==='create') s.release={draft:true};
 else if(a[1]==='upload') {s.sums=fs.readFileSync('dist/release/SHA256SUMS','utf8');s.artifact=fs.readFileSync('dist/release/frontend-system-1.2.3.tgz','utf8');s.manifest=fs.readFileSync('release-manifest.json','utf8');}
 else if(a[1]==='edit') s.release.draft=false;
 else if(a[1]==='download') {fs.writeFileSync('dist/release/verify/SHA256SUMS',s.sums);fs.writeFileSync('dist/release/verify/frontend-system-1.2.3.tgz',s.artifact);fs.writeFileSync('dist/release/verify/release-manifest.json',s.manifest);}
}
fs.writeFileSync(file,JSON.stringify(s));process.stdout.write(out);process.exit(code);
`;
    for (const cmd of ['git', 'gh']) await writeFile(join(root, 'bin', cmd), fake, {mode: 0o755});
    const env = {...process.env, PATH: `${join(root, 'bin')}:${process.env.PATH}`, FAKE_REMOTE: state,
      GITHUB_ACTOR: 'Yelihi', GITHUB_TRIGGERING_ACTOR: 'Yelihi', GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_REF: 'refs/heads/main', GITHUB_REPOSITORY: 'Yelihi/frontend-system', GITHUB_SHA: 'a'.repeat(40)};
    await assert.rejects(exec(process.execPath, [script, '1.2.3'], {cwd: root, env: {...env, GITHUB_EVENT_NAME: 'push'}}), /explicit official main/);
    assert.deepEqual(JSON.parse(await readFile(state, 'utf8')).calls, []);
    await exec(process.execPath, [script, '1.2.3'], {cwd: root, env});
    await exec(process.execPath, [script, '1.2.3'], {cwd: root, env});
    const published = JSON.parse(await readFile(state, 'utf8'));
    assert.equal(published.channel, env.GITHUB_SHA);
    assert.equal(published.release.draft, false);
    assert.equal(published.calls.filter((call: string[]) => call[0] === 'gh' && call[2] === 'create').length, 1);
    assert.equal(published.calls.filter((call: string[]) => call[0] === 'gh' && call[2] === 'upload').length, 1);
    await assert.rejects(exec(process.execPath, [script, '1.2.3'], {cwd: root, env: {...env, GITHUB_SHA: 'b'.repeat(40)}}), /increase the plugin version/);
    published.artifact = 'Changed published asset';
    await writeFile(state, JSON.stringify(published));
    await assert.rejects(exec(process.execPath, [script, '1.2.3'], {cwd: root, env}), /Published release checksums differ/);
  } finally {await rm(root, {recursive: true, force: true});}
});

test('pending originals do not block releases until unsynced knowledge enters distributed references', async () => {
  const root = await fixture();
  try {
    const note = await addKnowledgeNote(root, {title: 'Incoming PR', content: 'An unreviewed idea.'});
    await checkReleaseReadiness(root);
    const body = 'Unreviewed derived knowledge.';
    await writeFile(join(root, 'references/learned/idea.md'), body);
    await writeFile(join(root, 'references/learned/index.json'), JSON.stringify({version: 3, entries: [{
      id: 'idea', kind: 'concept', title: 'Idea', summary: body, path: 'idea.md', contentHash: contentHash(body),
      keywords: [], domains: [], technologies: [], excludedTechnologies: [], conditions: [], exclusions: [],
      evidenceKind: 'experience', review: 'reviewed', sources: {[note.document.id]: note.document.contentHash}, related: [],
      routing: {mode: 'deferred', reason: 'Not reviewed'},
    }], outcomes: [{sourceId: note.document.id, sourceHash: note.document.contentHash, action: 'deferred', reason: 'Needs review'}]}));
    await writeFile(join(root, 'release-manifest.json'), JSON.stringify(await createReleaseManifest(root)));
    await checkReleaseManifest(root);
    await assert.rejects(checkReleaseReadiness(root), /unsynced knowledge/);
  } finally {await rm(root, {recursive: true, force: true});}
});
