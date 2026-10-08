import test from 'node:test';
import assert from 'node:assert/strict';
import {boundReadWindows} from '../src/application/read-windows.js';

function windows(lengths: number[], offset = 0, limit = 12000) {
  return lengths.map((length, id) => ({id, hash: `unchanged-${id}`, totalCharacters: length,
    content: String(id % 10).repeat(length).slice(offset, offset + limit), nextOffset: offset + limit < length ? offset + limit : null}));
}

test('mixed-size batches fit complete content instead of forcing avoidable continuation reads', () => {
  const input = windows([3000, 9000, 9000]);
  const result = boundReadWindows(input, 0);
  assert.deepEqual(result, input);
  assert.ok(result.every(file => file.nextOffset === null));
  assert.deepEqual(boundReadWindows(windows([6000, ...Array<number>(19).fill(500)]), 0).map(file => file.nextOffset), Array(20).fill(null));
});

test('large batches stay bounded, preserve metadata/order and reconstruct all windows without gaps', () => {
  const lengths = [100, 50000, 32000, 4000, 0];
  const input = windows(lengths);
  const before = structuredClone(input);
  const first = boundReadWindows(input, 0);
  assert.equal(first.reduce((sum, file) => sum + file.content.length, 0), 24000);
  assert.deepEqual(input, before, 'Do not mutate source windows');
  for (const [id, file] of first.entries()) {
    assert.equal(file.id, id); assert.equal(file.hash, input[id]!.hash);
    assert.equal(file.totalCharacters, lengths[id]);
    let content = file.content, offset = file.nextOffset;
    while (offset !== null) {
      const next = boundReadWindows(windows([lengths[id]!], offset), offset)[0]!;
      // The generic fixture's single entry has id=0; compare window lengths and offsets here.
      assert.equal(next.content.length, Math.min(12000, lengths[id]! - offset));
      content += String(id % 10).repeat(next.content.length); offset = next.nextOffset;
    }
    assert.equal(content, String(id % 10).repeat(lengths[id]!));
  }
  assert.deepEqual(boundReadWindows(windows([40000, 40000], 5, 7), 5).map(file => [file.content.length, file.nextOffset]), [[7, 12], [7, 12]]);
  assert.equal(boundReadWindows(windows([2], 10), 10)[0]!.nextOffset, null);
  assert.deepEqual(boundReadWindows([], 0), []);
});
