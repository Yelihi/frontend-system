import assert from 'node:assert/strict';
import {mkdtemp, rm, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import test from 'node:test';
import {projectFile, PROJECT_SOURCE_MAX_BYTES} from '../src/application/source-file.js';
import {projectSnapshot, readProjectSourceFile, readProjectSources} from '../src/application/project-snapshot.js';
import {git} from '../src/application/git-state.js';
import {validateCitation} from '../src/application/design-evidence.js';

test('working and pinned source reads share an 8 MiB byte budget without widening model windows', async () => {
  const root = await mkdtemp(join(tmpdir(), 'fs-source-limit-'));
  try {
    const body = 'a'.repeat(PROJECT_SOURCE_MAX_BYTES - 3) + '끝';
    assert.equal(Buffer.byteLength(body), PROJECT_SOURCE_MAX_BYTES);
    await writeFile(join(root, 'package-lock.json'), body);
    assert.equal((await projectFile(root, 'package-lock.json')).content, body);
    await git(root, ['init', '-b', 'main']);
    await git(root, ['add', '.']);
    await git(root, ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '-m', 'Boundary']);
    const commit = (await projectSnapshot(root)).commit!;
    assert.equal((await readProjectSourceFile(root, 'package-lock.json', commit)).content, body);
    assert.equal((await validateCitation(root, {path:'package-lock.json', quote:'끝'}, {baseRef:'main', expectedCommit:commit})).line, 1);
    const window = await readProjectSources(root, ['package-lock.json'], commit);
    assert.equal(window.files[0]!.content.length, 6000);
    assert.equal(window.files[0]!.nextOffset, 6000);
    await writeFile(join(root, 'package-lock.json'), body + 'x');
    await assert.rejects(projectFile(root, 'package-lock.json'), /8 MiB.*package-lock\.json/);
    // The old snapshot remains valid even when working files exceed the budget.
    assert.equal((await readProjectSourceFile(root, 'package-lock.json', commit)).content, body);
    await git(root, ['add', '.']);
    await git(root, ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '-m', 'Over budget']);
    const next = (await projectSnapshot(root)).commit!;
    await assert.rejects(readProjectSourceFile(root, 'package-lock.json', next), /8 MiB.*package-lock\.json/);
    await assert.rejects(readProjectSourceFile(root, 'package-lock.json', commit), /Main changed/);
  } finally { await rm(root, {recursive:true, force:true}); }
});
