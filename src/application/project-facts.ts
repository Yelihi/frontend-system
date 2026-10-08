import { join, relative } from 'node:path';
import * as z from 'zod/v4';
import { FileSystemProjectDiscovery } from '../adapters/filesystem/project-discovery.js';
import { localPath, sha256 } from './policy.js';
import { interpretationSchema } from './knowledge/trigger-schema.js';
import { contentHash, readReferenceIndex, type ReferenceIndex } from './knowledge/reference-index.js';
import { projectFile } from './knowledge/code-triggers.js';
import { projectSnapshot, readProjectSource } from './project-snapshot.js';
import type { ProjectEvidence, validateProjectEvidence } from './design-evidence.js';
import { quoteLocationHint } from './source-file.js';

export const factReuseSchema = z.object({
  dependencies: z.array(localPath).min(1).max(100).describe('All local files needed for this interpretation, including callers and shared contracts. Not only its quoted line.'),
  interpretations: z.array(interpretationSchema).min(1).max(40),
});
export const factGuardSchema = z.object({
  hashes: z.record(localPath, sha256), configurationPathsHash: sha256,
  inventoryHash: sha256.optional(), signalHashes: z.record(z.string(), sha256),
});
type FactGuard = z.infer<typeof factGuardSchema>;
type Snapshot = {baseRef: string; expectedCommit: string};
const pathsHash = (paths: string[]) => contentHash(JSON.stringify([...new Set(paths)].sort()));
// Also invalidate when a configuration is added or removed. Unusual configuration
// names and transitive semantic dependencies must be explicitly declared by the host.
const configurationPaths = (paths: string[]) => paths.filter(path => /(^|\/)(package\.json|package-lock\.json|npm-shrinkwrap\.json|yarn\.lock|pnpm-lock\.yaml|bun\.lockb?|deno\.lock|(?:ts|js)config[^/]*\.json|[^/]*config\.[^/]+|\.eslintrc[^/]*)$/.test(path));
function semanticHashes(index: ReferenceIndex | undefined) {
  const definitions = new Map<string, string[]>();
  for (const entry of index?.entries ?? []) for (const trigger of entry.triggers ?? []) {
    if (trigger.kind !== 'semantic') continue;
    const values = definitions.get(trigger.value) ?? [];
    values.push(JSON.stringify([entry.id, trigger.description])); definitions.set(trigger.value, values);
  }
  return Object.fromEntries([...definitions].map(([signal, values]) => [signal, contentHash(JSON.stringify(values.sort()))]));
}
async function inventory(root: string, snapshot?: Snapshot) {
  const paths = snapshot ? (await projectSnapshot(root, snapshot.baseRef)).files
    : (await new FileSystemProjectDiscovery().listFiles(root)).map(path => relative(root, path));
  return paths.filter(path => !path.startsWith('.frontend-system/'));
}
async function source(root: string, path: string, snapshot?: Snapshot) {
  if (!snapshot) return (await projectFile(root, path)).content;
  const file = await readProjectSource(root, path, snapshot.expectedCommit, snapshot.baseRef, 0, 512_000);
  if (file.nextOffset !== null) throw new Error(`Fact dependency too large: ${path}; use a bounded scope`);
  return file.content;
}

export async function bindProjectFacts(root: string, systemRoot: string, evidence: ProjectEvidence, paths: string[], snapshot?: Snapshot) {
  const bindings: Record<string, FactGuard> = {};
  if (!evidence.statements.some(item => item.reuse)) return bindings;
  const index = await readReferenceIndex(join(systemRoot, 'references/learned'));
  if (!index) throw new Error('Publish knowledge before binding reusable facts');
  const signals = new Set(index.entries.flatMap(entry => entry.triggers ?? []).filter(item => item.kind === 'semantic').map(item => item.value));
  const signalHashes = semanticHashes(index);
  const inspected = new Set(evidence.coverage.filter(item => item.status === 'inspected').map(item => item.path));
  const configs = configurationPaths(paths);
  const contents = new Map<string, string>();
  const read = async (path: string) => {
    if (!contents.has(path)) contents.set(path, await source(root, path, snapshot));
    return contents.get(path)!;
  };
  for (const item of evidence.statements) {
    if (!item.reuse) continue;
    if (!['fact', 'interpretation'].includes(item.kind)) throw new Error('Only cited code facts or interpretations can emit reusable triggers');
    const dependencies = new Set([...item.reuse.dependencies, ...item.evidence.map(cite => cite.path), ...(item.scope ?? [])]);
    const uninspected = [...dependencies].filter(path => !inspected.has(path));
    if (uninspected.length) throw new Error(`Statement ${item.id}: reusable fact dependencies must have inspected coverage. Missing or uninspected: ${uninspected.join(', ')}. Dependencies include reuse.dependencies, citation paths and scope. Use exact file paths, not folder names, globs or semantic labels. Inspect actual dependencies before marking coverage; do not remove necessary files just to pass.`);
    for (const cite of item.evidence) {
      if (cite.hash && contentHash(await read(cite.path)) !== cite.hash) throw new Error('Fact citation changed during dependency binding; repeat scoped inspection');
    }
    for (const interpretation of item.reuse.interpretations) {
      if (!signals.has(interpretation.signal)) throw new Error(`Unknown semantic trigger: ${interpretation.signal}`);
      if (!dependencies.has(interpretation.path)) throw new Error(`Reusable interpretation must quote a declared, inspected dependency: ${item.id}, ${interpretation.path} is not declared. Inspect and declare the dependency before reuse.`);
      const content = await read(interpretation.path);
      if (!content.split(/\r?\n/).slice(interpretation.line - 1, interpretation.line + 9).join('\n').includes(interpretation.evidence)) {
        throw new Error(`Reusable interpretation must quote a declared, inspected dependency: ${item.id}, ${interpretation.path}:${interpretation.line}. ${quoteLocationHint(content, interpretation.evidence)}`);
      }
    }
    bindings[item.id] = {hashes: Object.fromEntries(await Promise.all([...new Set([...dependencies, ...configs])].sort().map(async path => [path, contentHash(await read(path))]))),
      configurationPathsHash: pathsHash(configs), ...(item.absence ? {inventoryHash: pathsHash(paths)} : {}),
      signalHashes: Object.fromEntries(item.reuse.interpretations.map(value => [value.signal, signalHashes[value.signal]!]))};
  }
  return bindings;
}

export function createFactGuardChecker(root: string, systemRoot: string, snapshot?: Snapshot) {
  // Request-local only: share IO across facts, never reuse freshness across calls.
  let state: Promise<{paths: string[]; signalHashes: Record<string, string>}> | undefined;
  const hashes = new Map<string, Promise<string>>();
  return async (guard: FactGuard) => {
    state ??= Promise.all([inventory(root, snapshot), readReferenceIndex(join(systemRoot, 'references/learned'))])
      .then(([paths, index]) => ({paths, signalHashes: semanticHashes(index)}));
    const {paths, signalHashes} = await state;
    const failures: string[] = [];
    if (pathsHash(configurationPaths(paths)) !== guard.configurationPathsHash) failures.push('Configuration inventory changed');
    if (guard.inventoryHash && pathsHash(paths) !== guard.inventoryHash) failures.push('Absence scope inventory changed');
    for (const [signal, hash] of Object.entries(guard.signalHashes)) {
      if (signalHashes[signal] !== hash) failures.push(`Knowledge trigger changed: ${signal}; reconsider saved meaning`);
    }
    for (const [path, hash] of Object.entries(guard.hashes)) {
      try {
        if (!hashes.has(path)) hashes.set(path, source(root, path, snapshot).then(contentHash));
        if (await hashes.get(path) !== hash) failures.push(`Fact dependency changed: ${path}`);
      } catch { failures.push(`Fact dependency unavailable: ${path}`); }
    }
    return failures;
  };
}

export async function retrieveProjectFacts(root: string, systemRoot: string, record: Awaited<ReturnType<typeof validateProjectEvidence>>, files: string[], explicit: z.input<typeof interpretationSchema>[] = [], snapshot?: Snapshot) {
  const selected = new Set(files);
  const matches = record.statements.filter(item => [...item.evidence.map(cite => cite.path), ...item.scope, ...(item.reuse?.dependencies ?? [])].some(path => selected.has(path)));
  const facts = [];
  const interpretations: z.input<typeof interpretationSchema>[] = [...explicit];
  const guards: FactGuard[] = [];
  const check = createFactGuardChecker(root, systemRoot, snapshot);
  const key = (value: z.input<typeof interpretationSchema>) => JSON.stringify([value.path, value.line, value.signal]);
  const meanings = new Map<string, Set<string>>();
  for (const item of matches) for (const value of item.reuse?.interpretations ?? []) {
    const values = meanings.get(key(value)) ?? new Set<string>();
    values.add(JSON.stringify([value.evidence, value.interpretation])); meanings.set(key(value), values);
  }
  for (const item of matches.slice(0, 20)) {
    const binding = record.factBindings?.[item.id];
    const reasons = item.reuse && binding ? await check(binding) : ['No reusable dependency binding; inspect before emitting semantic triggers'];
    let reused = 0;
    if (!reasons.length && item.reuse && binding) {
      for (const interpretation of item.reuse.interpretations.filter(value => selected.has(value.path))) {
        // An explicit interpretation overrides the same location/signal; never combine conflicting versions.
        if (explicit.some(value => value.path === interpretation.path && value.line === interpretation.line && value.signal === interpretation.signal)) continue;
        if ((meanings.get(key(interpretation))?.size ?? 0) > 1) { reasons.push('Conflicting saved interpretations; supply a current host interpretation'); continue; }
        if (interpretations.some(value => key(value) === key(interpretation))) continue;
        if (interpretations.length >= 40) { reasons.push('Interpretation limit reached; narrow file scope'); break; }
        interpretations.push(interpretation); reused++;
      }
      if (reused) guards.push(binding);
    }
    facts.push({id: item.id, kind: item.kind, statement: item.statement,
      status: reasons.length ? 'needs-review' : 'current', reasons, reusedTriggers: reused,
      evidence: item.evidence.map(({path, line, hash}) => ({path, line, hash})), limitations: item.limitations});
  }
  return {facts, interpretations, guards, matched: matches.length, omitted: Math.max(0, matches.length - 20),
    authority: 'Saved host interpretations, checked against declared dependencies; not a semantic proof or permission to adopt knowledge. Inspect needs-review facts and any undeclared context.'};
}
