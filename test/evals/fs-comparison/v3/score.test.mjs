import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { scoreJourney } from './score.mjs';

test('quality cannot hide functional failure, missing stages or missing usage', () => {
  const manifest = { version: 3, stages: ['initial', 'change', 'repair'].map((id) => ({ id,
    criteria: { ownership: { weight: 1, required: true } } })) };
  manifest.hash = createHash('sha256').update(JSON.stringify(manifest)).digest('hex');
  const journey = { manifestHash: manifest.hash, model: 'synthetic-not-a-model-result', replica: 1, arm: 'fs', track: 'interactive',
    stages: manifest.stages.map(({ id }) => ({ id, sourceHash: 'a'.repeat(64), status: 'complete',
      functionalPassed: true, functionalEvidence: ['external-check.json'],
      criteria: { ownership: { status: 'passed', evidence: ['blind-review.json'] } },
      usage: { input: 100, cachedInput: 60, output: 20 }, repairRounds: 1, productEditRounds: 2,
      checkRuns: 3, questions: 1, userSeconds: null })) };
  assert.equal(scoreJourney(manifest, journey).totalTokens, 360);
  assert.equal(scoreJourney(manifest, journey).eligible, true);
  journey.stages[1].functionalPassed = false;
  journey.stages[2].usage = null;
  const failed = scoreJourney(manifest, journey);
  assert.equal(failed.eligible, false);
  assert.equal(failed.totalTokens, null);
  assert.equal(failed.stages[1].qualityEarned, 1);
  journey.stages[0].criteria.ownership.status = 'unverified';
  assert.equal(scoreJourney(manifest, journey).stages[0].unverifiedWeight, 1);
  journey.stages.pop();
  assert.throws(() => scoreJourney(manifest, journey), /missing\/blocked/);
});
