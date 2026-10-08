import {execFile} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {mkdir, readFile, rename, rm, writeFile} from 'node:fs/promises';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {promisify} from 'node:util';
import * as z from 'zod/v4';
import {contentHash} from './reference-index.js';
import {pendingNote, sourceSelection} from './source-state.js';

const exec = promisify(execFile);
const repository = z.string().regex(/^[\w.-]+\/[\w.-]+$/);
const sha = z.string().regex(/^[a-f0-9]{40}$/);
const uuid = z.string().uuid();
export const contributionInput = z.object({
  title: z.string().trim().min(1).max(200).refine(s => !/[\r\n]/.test(s)),
  content: z.string().trim().min(1).max(100_000),
});
const recordSchema = z.object({id: uuid, repository, base: z.literal('main'), title: z.string(),
  path: z.string(), content: z.string(), hash: z.string(), target: repository.optional(),
  baseCommit: sha.optional(), commit: sha.optional(), url: z.string().url().optional()});
type Record = z.infer<typeof recordSchema>;
export type GithubRequest = (method: 'GET' | 'POST', path: string, body?: unknown) => Promise<unknown>;
const home = () => join(homedir(), '.frontend-system', 'contributions');

export async function contributionRepository(systemRoot: string) {
  const plugin = JSON.parse(await readFile(join(systemRoot, '.codex-plugin/plugin.json'), 'utf8'));
  const match = String(plugin.repository).match(/^https:\/\/github\.com\/([\w.-]+\/[\w.-]+?)(?:\.git)?\/?$/);
  return repository.parse(match?.[1]);
}

function draftHash(record: Pick<Record, 'repository' | 'base' | 'title' | 'path' | 'content'>) {
  return contentHash(JSON.stringify([record.repository, record.base, record.title, record.path, record.content]));
}

export async function prepareKnowledgeContribution(systemRoot: string, input: z.input<typeof contributionInput>, storage = home()) {
  const note = contributionInput.parse(input);
  const id = randomUUID();
  const record = {id, repository: await contributionRepository(systemRoot), base: 'main' as const,
    title: note.title, path: `knowledge/source/contributions/${id}.md`, content: pendingNote(`${note.content}\n`)};
  const directory = join(storage, id);
  await mkdir(directory, {recursive: true, mode: 0o700});
  const hash = draftHash(record);
  await writeFile(join(directory, 'draft.json'), JSON.stringify({...record, hash}, null, 2), {flag: 'wx', mode: 0o600});
  return {id, hash, repository: record.repository, path: record.path, localDraft: join(directory, 'draft.json'),
    state: 'pending', status: 'prepared; not submitted', next: 'submit_knowledge_contribution'};
}

function githubClient(directory: string): GithubRequest {
  return async (method, path, body) => {
    const args = ['api', '--hostname', 'github.com', '--method', method, path];
    if (body !== undefined) {
      const input = join(directory, 'request.json');
      await writeFile(input, JSON.stringify(body), {mode: 0o600});
      args.push('--input', input);
    }
    try {
      const {stdout} = await exec('gh', args, {cwd: directory, timeout: 60_000, maxBuffer: 2_000_000,
        env: {...process.env, GH_HOST: 'github.com', GH_PROMPT_DISABLED: '1'}});
      return JSON.parse(stdout);
    } catch (error) {
      const failure = error as {stderr?: string; code?: string};
      throw Object.assign(new Error(failure.code === 'ENOENT' ? 'Install GitHub CLI (gh) and authenticate before submitting; draft retained.'
        : (failure.stderr?.trim().slice(0, 1200) || 'GitHub request failed; authenticate with gh auth login or retry the retained draft.')),
      {status: Number(failure.stderr?.match(/HTTP (\d{3})/)?.[1] ?? 0)});
    }
  };
}

async function optional(request: GithubRequest, path: string) {
  try { return await request('GET', path); }
  catch (error) { if ((error as {status?: number}).status === 404) return undefined; throw error; }
}

/** Publishes exactly one pending Markdown file; never reads the caller's Git origin. */
export async function submitKnowledgeContribution(systemRoot: string, id: string, expectedHash: string,
  storage = home(), request?: GithubRequest) {
  uuid.parse(id);
  const directory = join(storage, id);
  const file = join(directory, 'draft.json');
  await mkdir(join(directory, 'submit.lock')); // Serializes retries for this local draft.
  try {
    const record = recordSchema.parse(JSON.parse(await readFile(file, 'utf8')));
    if (record.id !== id || record.hash !== expectedHash || draftHash(record) !== expectedHash ||
      record.repository !== await contributionRepository(systemRoot) ||
      record.path !== `knowledge/source/contributions/${id}.md` || sourceSelection(record.content) !== 'pending')
      throw new Error('Contribution changed; prepare and inspect the exact pending draft before submission');
    const api = request ?? githubClient(directory);
    const save = async () => {
      await writeFile(`${file}.tmp`, JSON.stringify(record, null, 2), {mode: 0o600});
      await rename(`${file}.tmp`, file);
    };
    try {
      const user = z.object({login: z.string().regex(/^[\w-]+$/)}).parse(await api('GET', 'user'));
      const upstream = z.object({full_name: repository, permissions: z.object({push: z.boolean()}).optional()})
        .parse(await api('GET', `repos/${record.repository}`));
      if (upstream.full_name.toLowerCase() !== record.repository.toLowerCase()) throw new Error('Unexpected upstream repository');
      if (!record.target) {
        if (upstream.permissions?.push) record.target = record.repository;
        else {
          const fork = z.object({full_name: repository}).parse(await api('POST', `repos/${record.repository}/forks`, {}));
          if (fork.full_name.split('/')[0] !== user.login) throw new Error('Fork must belong to the authenticated contributor');
          record.target = fork.full_name;
        }
        await save();
      }
      if (record.target !== record.repository) {
        if (record.target.split('/')[0] !== user.login) throw new Error('Retry with the original GitHub account');
        const fork = z.object({fork: z.literal(true), source: z.object({full_name: repository})})
          .parse(await api('GET', `repos/${record.target}`));
        if (fork.source.full_name.toLowerCase() !== record.repository.toLowerCase()) throw new Error('Target is not a fork of the official FS repository');
      }
      const branch = `knowledge/${id}`;
      const target = `repos/${record.target}`;
      const head = `${record.target.split('/')[0]}:${branch}`;
      const pullSchema = z.object({html_url: z.string().url(), state: z.enum(['open', 'closed']), head: z.object({sha})});
      const pulls = z.array(pullSchema).parse(await api('GET', `repos/${record.repository}/pulls?state=all&head=${encodeURIComponent(head)}&base=main`));
      if (pulls.length > 1) throw new Error('Multiple matching PRs; inspect before resubmitting');
      const finish = async (pull: z.infer<typeof pullSchema>) => {
        if (pull.head.sha !== record.commit || !pull.html_url.startsWith(`https://github.com/${record.repository}/pull/`))
          throw new Error('Contribution PR changed or has an unexpected URL; inspect before resubmitting');
        record.url = pull.html_url;
        await save();
        return {status: 'submitted' as const, id, url: pull.html_url, pullState: pull.state, repository: record.repository, state: 'pending'};
      };
      if (pulls[0]) return await finish(pulls[0]); // Do not recreate an auto-deleted branch after PR merge.
      const existing = await optional(api, `${target}/git/ref/heads/${branch}`);
      if (existing) {
        const ref = z.object({object: z.object({sha})}).parse(existing);
        if (!record.commit || ref.object.sha !== record.commit) throw new Error('Contribution branch changed; refusing to overwrite it');
      } else {
        if (!record.commit) {
          const base = z.object({object: z.object({sha})}).parse(await api('GET', `repos/${record.repository}/git/ref/heads/main`));
          const commit = z.object({tree: z.object({sha})}).parse(await api('GET', `repos/${record.repository}/git/commits/${base.object.sha}`));
          const tree = z.object({sha}).parse(await api('POST', `${target}/git/trees`, {base_tree: commit.tree.sha,
            tree: [{path: record.path, mode: '100644', type: 'blob', content: record.content}]}));
          const created = z.object({sha}).parse(await api('POST', `${target}/git/commits`, {
            message: `knowledge: ${record.title}`, tree: tree.sha, parents: [base.object.sha]}));
          record.baseCommit = base.object.sha;
          record.commit = created.sha;
          await save();
        }
        await api('POST', `${target}/git/refs`, {ref: `refs/heads/${branch}`, sha: record.commit});
      }
      const pull = pullSchema.parse(await api('POST', `repos/${record.repository}/pulls`, {
        title: `knowledge: ${record.title}`, base: 'main', head,
        body: `Adds one pending knowledge note: ${record.path}\n\nSource content is unreviewed. Merging this PR does not activate knowledge, sync references, or release the plugin.\n\nDraft: ${record.hash}`,
      }));
      return await finish(pull);
    } catch (error) {
      return {status: 'blocked' as const, id, localDraft: file, hash: record.hash,
        message: error instanceof Error ? error.message : String(error), next: 'Retry submit_knowledge_contribution with the same id/hash after resolving the error; do not create another draft.'};
    }
  } finally { await rm(join(directory, 'submit.lock'), {recursive: true, force: true}); }
}
