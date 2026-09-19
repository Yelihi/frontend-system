import assert from 'node:assert/strict';
import test from 'node:test';
import { createOrderSubmitter } from '../src/domain/orders.js';

test('duplicate submission is rejected; failure preserves retry and success clears error', async () => {
  let finish;
  let calls = 0;
  const states = [];
  const submit = createOrderSubmitter(() => {
    calls++;
    return new Promise((resolve, reject) => { finish = { resolve, reject }; });
  }, state => states.push(state));
  await assert.rejects(submit(0), /positive integer/);
  await assert.rejects(submit(1.5), /positive integer/);
  assert.equal(calls, 0);
  const first = submit(1);
  assert.equal(await submit(1), false);
  assert.equal(calls, 1);
  finish.reject(new Error('Network failed'));
  assert.equal(await first, false);
  assert.equal(states.at(-1).error, 'Network failed');
  assert.equal(states.at(-1).pending, false);
  const retry = submit(1);
  assert.equal(states.at(-1).error, '');
  finish.resolve();
  assert.equal(await retry, true);
  assert.equal(calls, 2);
  assert.deepEqual(states.at(-1), { pending: false, error: '', submitted: true });
});
