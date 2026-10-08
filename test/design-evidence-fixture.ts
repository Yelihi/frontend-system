import { readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { FileSystemProjectDiscovery } from '../src/adapters/filesystem/project-discovery.js';
import { writeProjectArtifacts } from '../src/application/project-store.js';
import { projectDocumentHash, projectSnapshot } from '../src/application/project-snapshot.js';
import { contentHash, readReferenceIndex } from '../src/application/knowledge/reference-index.js';
import { routeKnowledge } from '../src/application/knowledge/routing.js';
import type { VerificationPolicy } from '../src/application/policy.js';
import type { DesignEvidence } from '../src/application/design-evidence.js';

// Synthetic contracts only; never approves or migrates the repository's real knowledge.
export async function fixtureEvidence(root: string, policy: VerificationPolicy, issues: Array<{id: string; files: string[]}>, query = 'synthetic fixture contract') : Promise<DesignEvidence> {
  const discovery = new FileSystemProjectDiscovery();
  const inventory = (await discovery.listFiles(root)).map((path) => relative(root, path)).filter((path) => !path.startsWith('.frontend-system/'));
  const files = [...new Set(issues.flatMap(({files}) => files))];
  const citations = await Promise.all(files.map(async (path) => {
    const code = await readFile(join(root, path), 'utf8');
    return {path, line: 1, quote: code.split('\n')[0]!, hash: contentHash(code)};
  }));
  const snapshot = await projectSnapshot(root);
  await writeProjectArtifacts(await discovery.discover(await discovery.createRef(root)), {
    summary: 'Synthetic fixture', observed: [], architecture: [], conventions: [], decisions: [], qualityGates: [], assumptions: [], questions: [],
    evidence: {version: 1, coverage: inventory.map((path) => ({path, status: 'inspected', reason: 'Synthetic fixture inspected'})),
      statements: [{id: 'fixture', kind: 'fact', statement: 'Fixture code exists', evidence: citations}]},
  }, {expectedCommit: snapshot.commit, expectedHash: await projectDocumentHash(root)});
  const route = await routeKnowledge(root, process.cwd(), {files, query});
  return {version: 1, projectHash: (await projectDocumentHash(root))!,
    routes: [{input: route.request, hash: route.hash, judgments: await fixtureJudgments(root,route.candidates,files)}],
    decisions: [{id: 'fixture', question: 'Preserve fixture behavior?', evidence: citations, knowledgeIds: [],
      options: [{id: 'preserve', description: 'Keep the explicit synthetic contract', cost: 'Run its checks'}], selected: 'preserve', status: 'resolved',
      authority: 'user', confirmation: 'Synthetic evaluator supplied this contract', rationale: 'Fixed test contract', reconsiderWhen: 'Fixture requirements change',
      ruleIds: policy.rules.map(({id}) => id), issueIds: issues.map(({id}) => id)}]};
}

// These small protocol fixtures have one existing delegation boundary and request
// no shared policy. This is an authored exclusion, not a model-quality assertion.
export async function fixtureJudgments(root: string, candidates: Array<{id:string}>, files: string[]) {
  const index = await readReferenceIndex(join(process.cwd(),'references/learned'));
  return Promise.all(candidates.map(async ({id}) => {
    const spec=index!.entries.find(e=>e.id===id)!.investigation;
    const base={referenceId:id,decision:'not-applicable' as const,rationale:'Synthetic protocol keeps the existing independent request boundary; no shared policy layer requested'};
    if (!spec) return base;
    if (id!=='request-policy-boundaries') throw new Error(`Author a specific fixture assessment for ${id}`);
    const path=files.find(p=>p==='request.mjs')!;
    const quote=(await readFile(join(root,path),'utf8')).trim();
    return {...base,investigation:{findings:spec.questions.map(q=>({questionId:q.id,
      status:q.id==='unnecessary-layer'?'supported' as const:'unknown' as const,
      basis:q.id==='unnecessary-layer'?'code' as const:'unknown' as const,
      rationale:q.id==='unnecessary-layer'?'Existing single request delegation meets the unchanged synthetic contract; adding a layer is unnecessary':'No broader product or intent inference in this protocol fixture',
      citations:q.id==='unnecessary-layer'?[{path,line:1,quote}]:[]})),action:'keep' as const,
      limitations:['Authored small protocol fixture; does not measure model investigation quality.']}};
  }));
}
