import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, symlink, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';
import { readRevisionDraft } from '../src/application/revision-draft.js';

test('revision draft transport is bounded JSON confined to the project draft directory', async () => {
  const root = await mkdtemp(join(tmpdir(), 'fs-draft-'));
  try {
    const folder = join(root, '.frontend-system/drafts');
    await mkdir(folder, {recursive: true});
    await writeFile(join(folder, 'valid.json'), '{"content":"Unapproved draft"}');
    assert.deepEqual((await readRevisionDraft(root, '.frontend-system/drafts/valid.json')).input, {content: 'Unapproved draft'});
    await assert.rejects(readRevisionDraft(root, '../outside.json'), /must be/);
    await writeFile(join(root, 'outside.json'), '{}');
    await symlink(join(root, 'outside.json'), join(folder, 'link.json'));
    await assert.rejects(readRevisionDraft(root, '.frontend-system/drafts/link.json'), /outside/);
    await writeFile(join(folder, 'large.json'), ' '.repeat(512_001));
    await assert.rejects(readRevisionDraft(root, '.frontend-system/drafts/large.json'), /512 KB/);
    await writeFile(join(folder, 'bad.json'), 'not JSON');
    await assert.rejects(readRevisionDraft(root, '.frontend-system/drafts/bad.json'), SyntaxError);
  } finally { await rm(root, {recursive: true, force: true}); }
});
