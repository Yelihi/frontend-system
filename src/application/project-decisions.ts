import * as z from 'zod/v4';
import { lstat, readFile, readdir, realpath } from 'node:fs/promises';
import { join } from 'node:path';
import { contentHash, terms } from './knowledge/reference-index.js';
import { localPath } from './policy.js';
import { readProjectRecord, saveProjectRecord } from './workflow-store.js';

const statement = z.string().trim().min(1).max(1200);
const decisionId = z.string().regex(/^[a-z0-9][a-z0-9-]{0,79}$/);
export const projectDecisionSchema = z.strictObject({
  version: z.literal(1), id: decisionId, status: z.enum(['active', 'superseded']),
  title: statement, decision: statement, confirmation: statement,
  conditions: z.array(statement).min(1).max(12), exclusions: z.array(statement).max(12),
  scope: z.array(statement).min(1).max(12), triggers: z.array(statement).min(1).max(20),
  entrypoints: z.array(localPath).max(20), preserve: z.array(statement).max(12),
  avoid: z.array(statement).max(12), reconsiderWhen: statement,
  verification: z.array(statement).min(1).max(12), sources: z.array(statement).min(1).max(12),
});
export type ProjectDecision = z.infer<typeof projectDecisionSchema>;

export async function saveProjectDecision(root: string, input: ProjectDecision, expectedHash: string | null) {
  const decision = projectDecisionSchema.parse(input);
  const existing = await lstat(join(root, '.frontend-system', 'decisions', `${decision.id}.md`))
    .catch((error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') return null;
      throw error;
    });
  if (existing && !existing.isFile()) throw new Error('Project decision must be a regular file');
  return saveProjectRecord(root, 'decisions', decision.id, JSON.stringify(decision, null, 2), expectedHash);
}

export async function readProjectDecision(root: string, id: string) {
  decisionId.parse(id);
  const path = join(root, '.frontend-system', 'decisions', `${id}.md`);
  if (!(await lstat(path)).isFile()) throw new Error('Project decision must be a regular file');
  const raw = (await readProjectRecord(root, 'decisions', id, 0, 10000)).content;
  return {decision: projectDecisionSchema.parse(JSON.parse(raw)), hash: contentHash(raw)};
}

export async function searchProjectDecisions(root: string, input: {request: string; files?: string[]; technologies?: string[]}) {
  const query = new Set(terms([input.request, ...(input.files ?? []), ...(input.technologies ?? [])].join(' ')));
  const directory = join(root, '.frontend-system', 'decisions');
  const actual = await realpath(directory).catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'ENOENT') return null;
    throw error;
  });
  if (actual && actual !== join(await realpath(root), '.frontend-system', 'decisions')) {
    throw new Error('Project decision directory cannot traverse symlinks');
  }
  const names = await readdir(directory).catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'ENOENT') return [] as string[];
    throw error;
  });
  const candidates: Array<{id: string; title: string; hash: string; reasons: string[]; conditions: string[]; exclusions: string[]; entrypoints: string[]}> = [];
  let legacy = 0;
  for (const name of names.sort()) {
    if (!name.endsWith('.md') || !decisionId.safeParse(name.slice(0, -3)).success) continue;
    const info = await lstat(join(directory, name));
    if (!info.isFile() || info.size > 64_000) throw new Error(`Invalid project decision file: ${name}`);
    const raw = await readFile(join(directory, name), 'utf8');
    if (!raw.trimStart().startsWith('{')) {legacy++; continue;}
    const decision = projectDecisionSchema.parse(JSON.parse(raw));
    if (decision.id !== name.slice(0, -3)) throw new Error(`Decision ID does not match filename: ${name}`);
    if (decision.status !== 'active') continue;
    const signals = [...decision.triggers, ...decision.scope, ...decision.entrypoints];
    const reasons = signals.filter(value => terms(value).some(term => query.has(term)));
    if (!reasons.length) continue;
    candidates.push({id: decision.id, title: decision.title, hash: contentHash(raw), reasons,
      conditions: decision.conditions, exclusions: decision.exclusions, entrypoints: decision.entrypoints});
  }
  candidates.sort((a, b) => b.reasons.length - a.reasons.length || a.id.localeCompare(b.id));
  return {candidates: candidates.slice(0, 12), legacy,
    authority: 'Retrieval candidates only. Inspect the complete decision, current code and exclusions before applying.'};
}
