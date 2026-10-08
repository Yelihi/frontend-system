// Scores independent review records; does not judge source code or invent provider usage.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export function scoreJourney(manifest, journey) {
  assert.equal(manifest.version, 3);
  const { hash, ...definition } = manifest;
  assert.equal(hash, createHash('sha256').update(JSON.stringify(definition)).digest('hex'), 'Manifest changed');
  assert.ok(manifest.stages.length > 0);
  assert.equal(new Set(manifest.stages.map(({ id }) => id)).size, manifest.stages.length);
  assert.equal(journey.manifestHash, manifest.hash);
  assert.ok(['plain', 'fs'].includes(journey.arm));
  assert.ok(['equal-information', 'interactive'].includes(journey.track));
  assert.ok(journey.model && journey.replica);
  assert.equal(journey.stages.length, manifest.stages.length, 'Record missing/blocked stages too');
  const count = (value) => { assert.ok(Number.isInteger(value) && value >= 0); return value; };
  const rows = journey.stages.map((stage, index) => {
    const contract = manifest.stages[index];
    assert.equal(stage.id, contract.id);
    assert.match(stage.sourceHash, /^[a-f0-9]{64}$/);
    assert.ok(['complete', 'blocked', 'timeout', 'not-run'].includes(stage.status));
    assert.deepEqual(Object.keys(stage.criteria).sort(), Object.keys(contract.criteria).sort());
    assert.ok(Object.keys(contract.criteria).length > 0);
    let earned = 0, maximum = 0, unverified = 0, requiredPassed = true;
    for (const [id, criterion] of Object.entries(contract.criteria)) {
      assert.ok(criterion.weight > 0 && Number.isFinite(criterion.weight));
      assert.equal(typeof criterion.required, 'boolean');
      const review = stage.criteria[id];
      assert.ok(['passed', 'failed', 'unverified'].includes(review.status));
      assert.ok(Array.isArray(review.evidence));
      if (review.status !== 'unverified') assert.ok(review.evidence.length && review.evidence.every((item) => typeof item === 'string' && item.trim()));
      maximum += criterion.weight;
      if (review.status === 'passed') earned += criterion.weight;
      if (review.status === 'unverified') unverified += criterion.weight;
      if (criterion.required && review.status !== 'passed') requiredPassed = false;
    }
    const usage = stage.usage;
    if (usage !== null) {
      count(usage.input); count(usage.cachedInput); count(usage.output);
      assert.ok(usage.cachedInput <= usage.input);
    }
    assert.equal(typeof stage.functionalPassed, 'boolean');
    assert.ok(Array.isArray(stage.functionalEvidence));
    if (stage.functionalPassed) assert.ok(stage.functionalEvidence.length);
    return { id: stage.id, status: stage.status, qualityEarned: earned, qualityMaximum: maximum, unverifiedWeight: unverified,
      eligible: stage.status === 'complete' && stage.functionalPassed && requiredPassed && unverified === 0,
      totalTokens: usage === null ? null : usage.input + usage.output,
      nonCachedInput: usage === null ? null : usage.input - usage.cachedInput,
      repairRounds: count(stage.repairRounds), productEditRounds: count(stage.productEditRounds),
      checkRuns: count(stage.checkRuns), questions: count(stage.questions),
      userSeconds: stage.userSeconds === null ? null : count(stage.userSeconds) };
  });
  const sum = (key) => rows.some((row) => row[key] === null) ? null : rows.reduce((total, row) => total + row[key], 0);
  return { model: journey.model, arm: journey.arm, track: journey.track, replica: journey.replica, stages: rows,
    eligible: rows.every((row) => row.eligible), totalTokens: sum('totalTokens'), nonCachedInput: sum('nonCachedInput'),
    repairRounds: sum('repairRounds'), productEditRounds: sum('productEditRounds'), checkRuns: sum('checkRuns'),
    questions: sum('questions'), userSeconds: sum('userSeconds') };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [manifestPath, journeyPath] = process.argv.slice(2);
  assert.ok(manifestPath && journeyPath, 'Usage: node score.mjs manifest.json journey.json');
  console.log(JSON.stringify(scoreJourney(JSON.parse(await readFile(manifestPath, 'utf8')),
    JSON.parse(await readFile(journeyPath, 'utf8'))), null, 2));
}
