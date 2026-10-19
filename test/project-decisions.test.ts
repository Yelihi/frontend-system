import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { readProjectDecision, saveProjectDecision, searchProjectDecisions } from '../src/application/project-decisions.js';
import { saveProjectRecord } from '../src/application/workflow-store.js';

test('project decisions persist, route as candidates and preserve legacy notes', async () => {
  const root = await mkdtemp(join(tmpdir(), 'fs-project-decision-'));
  try {
    await saveProjectRecord(root, 'decisions', 'old-review', '# Historical review', null);
    const decision = {version: 1 as const, id: 'private-query-auth', status: 'active' as const,
      title: 'Reuse authentication for private queries', decision: 'Call requireUser before repository access',
      confirmation: 'Owner: reuse the existing authentication function',
      conditions: ['Private user data with session authentication'], exclusions: ['Public resource queries'],
      scope: ['server resource queries'], triggers: ['query', 'authentication', 'resource'],
      entrypoints: ['src/auth.ts'], preserve: ['Unauthenticated calls never reach storage'],
      avoid: ['Copying session validation into each query'], reconsiderWhen: 'Authentication changes',
      verification: ['Unauthenticated request does not call repository'], sources: ['PR review 173']};
    const saved = await saveProjectDecision(root, decision, null);
    const selected = await searchProjectDecisions(root, {request: 'new private resource query', files: ['src/new-query.ts']});
    assert.equal(selected.legacy, 1);
    assert.equal(selected.candidates[0]?.id, decision.id);
    assert.deepEqual(selected.candidates[0]?.exclusions, ['Public resource queries']);
    assert.equal((await readProjectDecision(root, decision.id)).hash, saved.hash);
    await assert.rejects(saveProjectDecision(root, decision, null), /changed/);
    await saveProjectDecision(root, {...decision, status: 'superseded'}, saved.hash);
    assert.deepEqual((await searchProjectDecisions(root, {request: 'resource query'})).candidates, []);
  } finally {await rm(root, {recursive: true, force: true});}
});
