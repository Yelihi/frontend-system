import {readFile, readdir, realpath} from 'node:fs/promises';
import {join, relative, resolve} from 'node:path';
import * as z from 'zod/v4';
import {FileSystemProjectDiscovery} from '../adapters/filesystem/project-discovery.js';
import {atomic, directory, locked} from './workflow-store.js';
import {projectFile, projectFileHash, quoteLocationHint} from './source-file.js';
import {projectSnapshot, readProjectSourceFile} from './project-snapshot.js';
import {contentHash, readReferenceIndex, readIndexedReference} from './knowledge/reference-index.js';
import {analysisId, analysisWriteSchema, flowSchema, findingSchema, type AnalysisReference, type ProjectFlow} from './flow-schema.js';

const envelope = z.object({version: z.union([z.literal(1), z.literal(2)]), record: analysisWriteSchema.shape.record,
  hashes: z.record(z.string(), z.string()), inventoryHash: z.string(), inventoryMode: z.enum(['source','all']).default('all'), roots: z.array(z.string()),
  discoveryHashes: z.record(z.string(), z.string()).optional(),
  knowledgeHashes: z.record(z.string(), z.string()), createdAt: z.string()});
type Envelope = z.infer<typeof envelope>;
const config = (path: string) => /(^|\/)(package\.json|[^/]*lock[^/]*|[^/]*config\.[^/]+|\.eslintrc[^/]*)$/.test(path);
async function inventory(root: string) {
  return (await new FileSystemProjectDiscovery().listFiles(root)).map(p => relative(root, p).replaceAll('\\', '/')).sort();
}
const inRoots = (path: string, roots: string[]) => roots.some(r => r === '.' || path === r || path.startsWith(`${r}/`));
const structuralSource = (path: string) => /\.(?:[cm]?[jt]sx?|vue|svelte|astro|html?|css|s[ac]ss|less|mdx|json|ya?ml|toml|graphql|gql|wasm)$/i.test(path);
// ponytail: broad content invalidation; add reverse-dependency tracking only if unrelated reanalysis becomes costly.
const discoveryFiles = (paths: string[], roots: string[], mode: 'source'|'all') => paths.filter(p => config(p) || (inRoots(p, roots) && (mode === 'all' || structuralSource(p)))).sort();
const inventoryHash = (paths: string[], roots: string[], mode: 'source'|'all') => contentHash(JSON.stringify(discoveryFiles(paths, roots, mode)));
async function readEnvelope(root: string, kind: 'flow' | 'finding', id: string, hash?: string) {
  analysisId.parse(id);
  if (hash && !/^[a-f0-9]{64}$/.test(hash)) throw new Error('Invalid analysis hash');
  const path = join(resolve(root), '.frontend-system/analysis', ...(hash ? ['history', `${hash}.json`] : [kind, `${id}.json`]));
  const actual = await realpath(path);
  if (actual !== join(await realpath(root), '.frontend-system/analysis', ...(hash ? ['history', `${hash}.json`] : [kind, `${id}.json`]))) throw new Error('Analysis records cannot traverse symlinks');
  const raw = await readFile(actual, 'utf8');
  const record = envelope.parse(JSON.parse(raw));
  if (record.record.kind !== kind || record.record.data.id !== id || (hash && contentHash(raw) !== hash)) throw new Error('Analysis identity/hash mismatch');
  return {hash: contentHash(raw), ...record};
}
async function code(root: string, path: string, snapshot?: ProjectFlow['scope']['snapshot']) {
  if (!snapshot) return (await projectFile(root, path)).content;
  const file = await readProjectSourceFile(root, path, snapshot.expectedCommit, snapshot.baseRef);
  return file.content;
}
function validateGraph(flow: ProjectFlow) {
  const nodes = new Map(flow.nodes.map(n => [n.id, n]));
  const edges = new Map(flow.edges.map(e => [e.id, e]));
  for (const [kind, items] of Object.entries({nodes:flow.nodes, edges:flow.edges, scenarios:flow.scenarios, invariants:flow.invariants})) {
    const seen = new Set<string>(), duplicates = new Set<string>();
    for (const {id} of items) { if (seen.has(id)) duplicates.add(id); seen.add(id); }
    if (duplicates.size) throw new Error(`Duplicate flow IDs in ${kind}: ${[...duplicates].join(', ')}. Update existing entries by ID instead of appending them.`);
  }
  for (const node of flow.nodes) {
    const visited = new Set([node.id]); let parent = node.parent;
    while (parent) {
      if (!nodes.has(parent) || visited.has(parent)) throw new Error('Invalid or cyclic flow containment');
      visited.add(parent); parent = nodes.get(parent)!.parent;
    }
  }
  for (const item of [...flow.nodes, ...flow.edges, ...flow.invariants]) {
    if (flow.basis === 'observed' && !item.evidence.length) throw new Error('Observed graph elements require evidence');
    if (item.evidence.some(id => !flow.evidence[id])) throw new Error('Unknown flow evidence ID');
  }
  for (const edge of flow.edges) if (!nodes.has(edge.from) || !nodes.has(edge.to)) throw new Error('Unknown flow edge endpoint');
  for (const scenario of flow.scenarios) if (!nodes.has(scenario.entry) || scenario.steps.some(s => !edges.has(s.edge))) throw new Error('Unknown scenario node/edge');
  if (flow.scope.discoveryRoots.some(r => r.split('/').some(p => p === '..'))) throw new Error('Invalid discovery root');
}
async function checkQuotes(root: string, citations: Array<{path: string; line?: number | undefined; quote: string}>, files: string[], snapshot?: ProjectFlow['scope']['snapshot']) {
  const texts = new Map<string, string>();
  for (const c of citations) {
    if (!files.includes(c.path)) throw new Error(`Citation outside declared scope: ${c.path}`);
    if (!texts.has(c.path)) texts.set(c.path, await code(root, c.path, snapshot));
    const body = texts.get(c.path)!;
    const start = body.indexOf(c.quote);
    const lines = body.split(/(?<=\n)/);
    const lineStart = c.line ? lines.slice(0, c.line - 1).join('').length : 0;
    const occurrence = c.line ? body.indexOf(c.quote, lineStart) : start;
    if (start < 0 || (c.line && (c.line > lines.length || occurrence < lineStart || occurrence >= lineStart + lines[c.line - 1]!.length))) {
      throw new Error(`Analysis quote not found at the declared line: ${c.path}. ${quoteLocationHint(body, c.quote)}`);
    }
    if (!c.line && body.indexOf(c.quote, start + 1) >= 0) throw new Error(`Ambiguous quote; supply line: ${c.path}`);
    c.line ??= body.slice(0, start).split(/\r?\n/).length;
  }
  return Object.fromEntries([...texts].map(([path, body]) => [path, contentHash(body)]));
}
// Request-scoped memoization only: a later tool call always rereads current files.
function freshnessScan(root: string, systemRoot: string, snapshot?: ProjectFlow['scope']['snapshot']) {
  const stats = {inventoryReads:0, sourceReads:0, sourceBytes:0};
  let paths: Promise<string[]> | undefined;
  const hashes = new Map<string, Promise<string>>();
  let index: ReturnType<typeof readReferenceIndex> | undefined;
  const knowledge = new Map<string, Promise<unknown>>();
  return {
    stats,
    inventory: () => paths ??= (stats.inventoryReads++, snapshot ? projectSnapshot(root, snapshot.baseRef).then(value => {
      if (value.commit !== snapshot.expectedCommit) throw new Error('Project baseline changed');
      return value.files;
    }) : inventory(root)),
    hash: (path: string) => {
      if (!hashes.has(path)) hashes.set(path, (async () => {
        stats.sourceReads++;
        if (snapshot) {
          const content = await code(root, path, snapshot);
          stats.sourceBytes += Buffer.byteLength(content);
          return contentHash(content);
        }
        const result = await projectFileHash(root, path);
        stats.sourceBytes += result.bytes;
        return result.hash;
      })());
      return hashes.get(path)!;
    },
    index: () => index ??= readReferenceIndex(join(systemRoot, 'references/learned')),
    knowledge: (id: string) => {
      if (!knowledge.has(id)) knowledge.set(id, readIndexedReference(join(systemRoot, 'references/learned'), id, 0, 1));
      return knowledge.get(id)!;
    },
  };
}

// Baseline reports validate immutable records against main, not a differing worktree.
export async function readBaselineRecords(root: string, systemRoot: string, refs: Array<{kind:'flow'|'finding'; id:string; hash:string}>, snapshot: NonNullable<ProjectFlow['scope']['snapshot']>) {
  const scan = freshnessScan(root, systemRoot, snapshot);
  const records = [];
  for (const ref of refs) {
    const stored = await readEnvelope(root, ref.kind, ref.id, ref.hash);
    const flow = stored.record.kind === 'flow' ? stored.record.data
      : flowSchema.parse((await readEnvelope(root, 'flow', stored.record.data.flow.id, stored.record.data.flow.hash)).record.data);
    if (flow.basis !== 'observed' || flow.scope.snapshot?.baseRef !== snapshot.baseRef || flow.scope.snapshot.expectedCommit !== snapshot.expectedCommit) {
      throw new Error(`Baseline report requires observed records from the same snapshot: ${ref.id}`);
    }
    const freshness = await analysisFreshness(root, stored, systemRoot, scan);
    if (freshness.status !== 'current') throw new Error(`Baseline record is stale: ${ref.id}: ${freshness.reasons.join('; ')}`);
    records.push(stored);
  }
  return records;
}
export async function analysisFreshness(root: string, stored: Envelope, systemRoot: string, scan = freshnessScan(root, systemRoot)) {
  const reasons: string[] = [];
  const paths = await scan.inventory();
  if (inventoryHash(paths, stored.roots, stored.inventoryMode) !== stored.inventoryHash) reasons.push('Discovery/configuration inventory changed');
  if (!stored.discoveryHashes) reasons.push('Legacy analysis lacks discovery content coverage; reanalyze before reuse');
  const dependencies = {...stored.discoveryHashes, ...stored.hashes};
  for (const [path, hash] of Object.entries(dependencies)) {
    const role = path in stored.hashes ? 'dependency' : 'discovery source';
    try { if (await scan.hash(path) !== hash) reasons.push(`Changed ${role}: ${path}`); }
    catch { reasons.push(`Missing ${role}: ${path}`); }
  }
  const index = Object.keys(stored.knowledgeHashes).length ? await scan.index() : undefined;
  for (const [id, hash] of Object.entries(stored.knowledgeHashes)) {
    const entry = index?.entries.find(e => e.id === id);
    if (!entry || contentHash(JSON.stringify(entry)) !== hash) reasons.push(`Changed knowledge: ${id}`);
    else try { await scan.knowledge(id); }
    catch { reasons.push(`Changed or unavailable knowledge body: ${id}`); }
  }
  if (stored.record.kind === 'finding') {
    try { if ((await readEnvelope(root, 'flow', stored.record.data.flow.id)).hash !== stored.record.data.flow.hash) reasons.push('Linked flow changed'); }
    catch { reasons.push('Linked flow unavailable'); }
  }
  return {status: reasons.length ? 'stale' as const : 'current' as const, reasons,
    meaning: 'Declared dependency and discovery-content freshness, not semantic correctness or complete runtime coverage'};
}

export async function saveProjectAnalysis(root: string, systemRoot: string, input: z.input<typeof analysisWriteSchema>) {
  const parsed = analysisWriteSchema.parse(input);
  return locked(root, async () => {
    let previous: Awaited<ReturnType<typeof readEnvelope>> | undefined;
    try { previous = await readEnvelope(root, parsed.record.kind, parsed.record.data.id); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    if ((previous?.hash ?? null) !== parsed.expectedHash) throw new Error('Analysis changed; read current hash before updating');
    const initialPaths = await inventory(root);
    let quoteHashes: Record<string, string> = {};
    let flow: ProjectFlow;
    const knowledgeHashes: Record<string, string> = {};
    if (parsed.record.kind === 'flow') { flow = flowSchema.parse(parsed.record.data); validateGraph(flow); parsed.record.data = flow; }
    else {
      const finding = findingSchema.parse(parsed.record.data); parsed.record.data = finding;
      const linked = await readEnvelope(root, 'flow', finding.flow.id);
      if (linked.hash !== finding.flow.hash) throw new Error('Finding must reference the current flow hash');
      flow = flowSchema.parse(linked.record.data);
      const freshness = await analysisFreshness(root, linked, systemRoot, freshnessScan(root, systemRoot, flow.scope.snapshot));
      if (freshness.status !== 'current') throw new Error(`Refresh stale flow before saving finding: ${freshness.reasons.join('; ')}`);
      if (finding.kind === 'violation' && !finding.authority) throw new Error('Violation needs an established requirement citation');
      if (['resolved', 'dismissed'].includes(finding.status) && !finding.resolution) throw new Error('Closing a finding requires resolution evidence and reconsideration condition');
      quoteHashes = await checkQuotes(root, [...finding.evidence, ...(finding.authority ? [finding.authority] : []), ...finding.resolution?.evidence ?? []], flow.scope.files, flow.scope.snapshot);
      const index = await readReferenceIndex(join(systemRoot, 'references/learned'));
      for (const id of finding.knowledgeIds) {
        const entry = index?.entries.find(e => e.id === id);
        if (!entry) throw new Error(`Unknown finding knowledge: ${id}`);
        await readIndexedReference(join(systemRoot, 'references/learned'), id, 0, 1);
        knowledgeHashes[id] = contentHash(JSON.stringify(entry));
      }
    }
    const flowQuoteHashes = await checkQuotes(root, Object.values(flow.evidence), flow.scope.files, flow.scope.snapshot);
    const paths = flow.scope.snapshot ? (await projectSnapshot(root, flow.scope.snapshot.baseRef)).files : await inventory(root);
    const discovered = discoveryFiles(paths, flow.scope.discoveryRoots, flow.scope.discoveryMode);
    const files = [...new Set([...flow.scope.files, ...discovered])];
    const hashes: Record<string,string> = {};
    for (const p of files) hashes[p] = flow.scope.snapshot ? contentHash(await code(root, p, flow.scope.snapshot)) : (await projectFileHash(root, p)).hash;
    for (const quoted of [quoteHashes, flowQuoteHashes]) for (const [path, hash] of Object.entries(quoted)) {
      if (hashes[path] !== hash) throw new Error('Source changed during analysis capture; reread before saving');
    }
    if (!flow.scope.snapshot && inventoryHash(initialPaths, flow.scope.discoveryRoots, flow.scope.discoveryMode) !== inventoryHash(await inventory(root), flow.scope.discoveryRoots, flow.scope.discoveryMode)) throw new Error('Inventory changed during analysis capture');
    const discoveryHashes = Object.fromEntries(discovered.map(p => [p, hashes[p]!]));
    const directHashes = Object.fromEntries([...new Set([...flow.scope.files, ...paths.filter(config)])].map(p => [p, hashes[p]!]));
    const record: Envelope = {version: 2, record: parsed.record, hashes: directHashes, discoveryHashes, inventoryHash: inventoryHash(paths, flow.scope.discoveryRoots, flow.scope.discoveryMode), inventoryMode: flow.scope.discoveryMode, roots: flow.scope.discoveryRoots,
      knowledgeHashes, createdAt: new Date().toISOString()};
    if (previous && JSON.stringify({...record, createdAt: null}) === JSON.stringify({version: previous.version, record: previous.record, hashes: previous.hashes, discoveryHashes: previous.discoveryHashes, inventoryHash: previous.inventoryHash, inventoryMode: previous.inventoryMode, roots: previous.roots, knowledgeHashes: previous.knowledgeHashes, createdAt: null})) {
      return {id: parsed.record.data.id, kind: parsed.record.kind, hash: previous.hash, status: 'unchanged',
        authority: 'Identical analysis and dependency versions retained; no approval or main refresh'};
    }
    const raw = JSON.stringify(record); const hash = contentHash(raw);
    // Store immutable versions first; plans pin these, not mutable latest projections.
    await atomic(join(await directory(root, 'analysis/history'), `${hash}.json`), raw);
    await atomic(join(await directory(root, `analysis/${parsed.record.kind}`), `${parsed.record.data.id}.json`), raw);
    const links: string[] = [];
    for (const kind of ['flow', 'finding'] as const) {
      const folder = await directory(root, `analysis/${kind}`);
      for (const name of (await readdir(folder)).filter(n => n.endsWith('.json')).sort()) {
        const stored = await readEnvelope(root, kind, name.slice(0, -5));
        const data = stored.record.data;
        links.push(`- [${kind}/${data.id}](${kind}/${data.id}.json) — ${'basis' in data ? data.basis : data.status}`);
      }
    }
    await atomic(join(await directory(root, 'analysis'), 'index.md'),
      '# Working flow and finding index\n\nNot the main baseline. Query get_project_analysis for current dependency freshness. Resolved/dismissed records retain history.\n\n' + links.join('\n') + '\n');
    return {id: parsed.record.data.id, kind: parsed.record.kind, hash, status: 'saved',
      authority: 'Host analysis recorded; no execution, approval, or automatic project.md refresh'};
  });
}
export async function getProjectAnalysis(root: string, systemRoot: string, options: {kind?: 'flow' | 'finding' | undefined; ids?: string[] | undefined; files?: string[] | undefined; full?: boolean | undefined; offset?: number | undefined; limit?: number | undefined} = {}) {
  const selected: Array<{kind:'flow'|'finding'; id:string; stored:Awaited<ReturnType<typeof readEnvelope>>}> = [];
  for (const kind of options.kind ? [options.kind] : ['flow', 'finding'] as const) {
    let names: string[];
    try { names = await readdir(join(root, '.frontend-system/analysis', kind)); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue; throw error; }
    for (const name of names.filter(n => n.endsWith('.json')).sort()) {
      const id = name.slice(0, -5);
      if (options.ids && !options.ids.includes(id)) continue;
      const stored = await readEnvelope(root, kind, id);
      if (options.files?.length && !options.files.some(p => p in stored.hashes || inRoots(p, stored.roots))) continue;
      selected.push({kind, id, stored});
    }
  }
  const offset = options.offset ?? 0, limit = options.limit ?? 10;
  const scan = freshnessScan(root, systemRoot);
  const rows: Array<Record<string, unknown>> = [];
  for (const {kind,id,stored} of selected.slice(offset, offset + limit)) {
    const freshness = await analysisFreshness(root, stored, systemRoot, scan);
    const data = stored.record.data;
    rows.push({kind, id, hash:stored.hash, title:data.title, freshness,
      ...('basis' in data ? {basis:data.basis, scenarios:data.scenarios.map(s => ({id:s.id,event:s.event}))} : {status:data.status, observation:data.observation}),
      ...(options.full ? {data} : {})});
  }
  return {records:rows, total:selected.length, nextOffset:offset + limit < selected.length ? offset + limit : null, scan:scan.stats,
    authority: 'Recorded host interpretation; inspect stale/unknown edges. Proposed flows are not implementation facts.'};
}
export async function validateAnalysisReferences(root: string, systemRoot: string, refs: AnalysisReference[], checkSources: boolean) {
  const errors: string[] = [];
  const scan = freshnessScan(root, systemRoot);
  for (const ref of refs) {
    try {
      const stored = await readEnvelope(root, ref.kind, ref.id, ref.hash);
      if (checkSources) {
        if ((await readEnvelope(root, ref.kind, ref.id)).hash !== ref.hash) errors.push(`Analysis version changed: ${ref.id}`);
        errors.push(...(await analysisFreshness(root, stored, systemRoot, scan)).reasons.map(r => `${ref.id}: ${r}`));
      }
    } catch (error) { errors.push(`Analysis reference unavailable: ${ref.id}: ${String(error)}`); }
  }
  return errors;
}
