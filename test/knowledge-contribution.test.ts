import assert from 'node:assert/strict';
import {mkdir, mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import test from 'node:test';
import {prepareKnowledgeContribution, submitKnowledgeContribution, type GithubRequest} from '../src/application/knowledge/contribution.js';

const base = 'a'.repeat(40), tree = 'b'.repeat(40), commit = 'c'.repeat(40);
function github(push: boolean, failPull = false) {
  const calls: Array<{method: string; path: string; body: unknown}> = [];
  let branch = false, pull = false, closed = false;
  const request: GithubRequest = async (method, path, body) => {
    calls.push({method, path, body});
    if (path === 'user') return {login: 'contributor'};
    if (path === 'repos/Yelihi/frontend-system') return {full_name: 'Yelihi/frontend-system', permissions: {push}};
    if (path.endsWith('/forks')) return {full_name: 'contributor/frontend-system'};
    if (path === 'repos/contributor/frontend-system') return {fork: true, source: {full_name: 'Yelihi/frontend-system'}};
    if (path.includes('/git/ref/heads/knowledge/')) {
      if (!branch) throw Object.assign(new Error('Missing ref'), {status: 404});
      return {object: {sha: commit}};
    }
    if (path.endsWith('/git/ref/heads/main')) return {object: {sha: base}};
    if (path.endsWith(`/git/commits/${base}`)) return {tree: {sha: tree}};
    if (path.endsWith('/git/trees')) return {sha: tree};
    if (path.endsWith('/git/commits')) return {sha: commit};
    if (path.endsWith('/git/refs')) {branch = true; return {};}
    const pr = {html_url: 'https://github.com/Yelihi/frontend-system/pull/123', state: closed ? 'closed' : 'open', head: {sha: commit}};
    if (method === 'GET' && path.includes('/pulls?')) return pull ? [pr] : [];
    if (path.endsWith('/pulls')) {
      pull = true;
      if (failPull) {failPull = false; throw new Error('Response lost after GitHub created the PR');}
      return pr;
    }
    throw new Error(`Unexpected request: ${method} ${path}`);
  };
  return {request, calls, close: () => {closed = true; branch = false;}};
}

for (const push of [true, false]) test(`knowledge contribution uses official repository, push permission=${push}, and resumes without duplicate PRs`, async () => {
  const root = await mkdtemp(join(tmpdir(), 'fs-contribution-'));
  try {
    await mkdir(join(root, '.codex-plugin'));
    await writeFile(join(root, '.codex-plugin/plugin.json'), JSON.stringify({repository: 'https://github.com/Yelihi/frontend-system'}));
    const storage = join(root, 'user-state');
    const draft = await prepareKnowledgeContribution(root, {title: 'Ownership', content: '---\nstate: active\n---\nPreserve caller-owned input. `$(not-a-command)`'}, storage);
    const saved = JSON.parse(await readFile(draft.localDraft, 'utf8'));
    assert.match(saved.content, /state: pending/);
    assert.match(saved.content, /\$\(not-a-command\)/);
    const fake = github(push, true);
    const first = await submitKnowledgeContribution(root, draft.id, draft.hash, storage, fake.request);
    assert.equal(first.status, 'blocked');
    const second = await submitKnowledgeContribution(root, draft.id, draft.hash, storage, fake.request);
    assert.ok(second.status === 'submitted');
    assert.equal(second.url, 'https://github.com/Yelihi/frontend-system/pull/123');
    assert.equal(fake.calls.filter(call => call.path.endsWith('/pulls') && call.method === 'POST').length, 1);
    assert.equal(fake.calls.filter(call => call.path.endsWith('/forks')).length, push ? 0 : 1);
    const writes = fake.calls.filter(call => call.method === 'POST');
    const writtenTree = writes.find(call => call.path.endsWith('/git/trees'))!.body as {tree: Array<{path: string; content: string}>};
    assert.deepEqual(writtenTree.tree.map(entry => entry.path), [draft.path]);
    assert.equal(writtenTree.tree[0]!.content, saved.content);
    assert.ok(writes.every(call => !call.path.includes('/merge') && !call.path.includes('/releases')));
    const refs = writes.find(call => call.path.endsWith('/git/refs'))!.body as {ref: string};
    assert.equal(refs.ref, `refs/heads/knowledge/${draft.id}`);
    fake.close();
    const closed = await submitKnowledgeContribution(root, draft.id, draft.hash, storage, fake.request);
    assert.ok(closed.status === 'submitted');
    assert.equal(closed.pullState, 'closed');
    assert.equal(fake.calls.filter(call => call.path.endsWith('/git/refs')).length, 1, 'Retrying a merged PR does not recreate its deleted branch');
    await assert.rejects(submitKnowledgeContribution(root, draft.id, '0'.repeat(64), storage, fake.request), /Contribution changed/);
    saved.path = '.github/workflows/attack.yml';
    await writeFile(draft.localDraft, JSON.stringify(saved));
    await assert.rejects(submitKnowledgeContribution(root, draft.id, draft.hash, storage, fake.request), /Contribution changed/);
  } finally {await rm(root, {recursive: true, force: true});}
});

test('authentication failure retains the exact draft, and a foreign fork cannot receive it', async () => {
  const root = await mkdtemp(join(tmpdir(), 'fs-contribution-auth-'));
  try {
    await mkdir(join(root, '.codex-plugin'));
    await writeFile(join(root, '.codex-plugin/plugin.json'), JSON.stringify({repository: 'https://github.com/Yelihi/frontend-system'}));
    const draft = await prepareKnowledgeContribution(root, {title: 'Evidence', content: 'An unreviewed experience.'}, root);
    const before = await readFile(draft.localDraft, 'utf8');
    const blocked = await submitKnowledgeContribution(root, draft.id, draft.hash, root, async () => {throw new Error('Authentication required');});
    assert.equal(blocked.status, 'blocked');
    assert.equal(await readFile(draft.localDraft, 'utf8'), before);
    const fake = github(false);
    const result = await submitKnowledgeContribution(root, draft.id, draft.hash, root, async (method, path, body) => {
      if (path === 'repos/contributor/frontend-system') return {fork: true, source: {full_name: 'unrelated/project'}};
      return fake.request(method, path, body);
    });
    assert.equal(result.status, 'blocked');
    assert.ok(!fake.calls.some(call => call.path.endsWith('/git/trees')));
  } finally {await rm(root, {recursive: true, force: true});}
});
