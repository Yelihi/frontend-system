import assert from 'node:assert/strict';
import test from 'node:test';
import { htmlCaptureManifest } from '../src/application/knowledge/html-capture.js';

test('HTML inventory identifies every static code block and marks interactive tabs unverified', () => {
  const staticPage = '<main><h1>Guide</h1><h2>Before</h2><pre><code>a &lt; b</code></pre>' +
    '<h2>After</h2><pre><code>const named = a &lt; b;</code></pre></main>';
  const manifest = htmlCaptureManifest(staticPage);
  assert.deepEqual(manifest.sections, ['Guide', 'Before', 'After']);
  assert.deepEqual(manifest.codeExamples.map(({location, section}) => [location, section]),
    [['code-1', 'Before'], ['code-2', 'After']]);
  assert.notEqual(manifest.codeExamples[0]!.hash, manifest.codeExamples[1]!.hash);
  assert.equal(manifest.interactive, false);
  assert.equal(htmlCaptureManifest(staticPage.replace('<h2>After</h2>', '<div role="tablist"><button role="tab">After</button></div><h2>After</h2>')).interactive, true);
  assert.throws(() => htmlCaptureManifest('<html><body><pre>code</pre></body></html>'), /no main\/article/);
  assert.throws(() => htmlCaptureManifest(`<main>${'<h2>Section</h2>'.repeat(101)}</main>`), /exceeds 100/);
});
