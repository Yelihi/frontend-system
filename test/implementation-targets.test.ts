import assert from 'node:assert/strict';
import {mkdtemp, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import test from 'node:test';
import { designContractFailures } from '../src/application/design-contract.js';
import type { BoundEvidence } from '../src/application/design-evidence.js';
import { issueSchema } from '../src/application/workflow-store.js';
import { contentHash, readReferenceIndex, semanticReviewLenses } from '../src/application/knowledge/reference-index.js';
import { FileSystemProjectDiscovery } from '../src/adapters/filesystem/project-discovery.js';
import { writeProjectArtifacts } from '../src/application/project-store.js';
import { projectDocumentHash, projectSnapshot } from '../src/application/project-snapshot.js';
import { routeKnowledge } from '../src/application/knowledge/routing.js';

const target = {target: 'ResumeForm.submit', files: ['src/resume.ts'], decisionId: 'submit',
  knowledgeIds: ['request-ownership'], instruction: 'Reuse the selected request boundary',
  verification: 'Check the submit caller and error path'};
const issue = {id: 'submit', title: 'Submit resume', contract: 'Submit a resume and report success or failure',
  implementationTargets: [target], files: ['src/resume.ts'], dependsOn: [], requiredCheckIds: [], acceptance: ['Reports the result']};
const evidence = {routes: [{judgments: [{referenceId: 'request-ownership', decision: 'apply'}]}],
  decisions: [{id: 'submit', status: 'resolved', authority: 'model', issueIds: ['submit'],
    knowledgeIds: ['request-ownership'], ruleIds: [], options: [{id: 'reuse'}], selected: 'reuse'}]} as unknown as BoundEvidence;

test('planned implementation knowledge is bound to an applied reference and issue decision', () => {
  assert.equal(issueSchema.safeParse(issue).success, true);
  assert.deepEqual(designContractFailures(evidence, undefined, [issue]), []);
  assert.match(designContractFailures(evidence, undefined, [{...issue,
    implementationTargets: [{...target, knowledgeIds: ['unrouted']}]}]).join(' '), /not adopted/);
  assert.match(designContractFailures(evidence, undefined, [{...issue,
    implementationTargets: [{...target, files: ['src/other.ts']}]}]).join(' '), /outside issue/);
});

test('a new project can bind a brief before framework code exists without claiming code signals', async () => {
  const root = await mkdtemp(join(tmpdir(), 'fs-greenfield-'));
  try {
    const brief = 'The owner wants a resume form with private drafts.';
    await writeFile(join(root, 'project-brief.md'), `${brief}\n`);
    const discovery = new FileSystemProjectDiscovery();
    const snapshot = await projectSnapshot(root);
    await writeProjectArtifacts(await discovery.discover(await discovery.createRef(root)), {
      summary: 'Confirmed product brief; no application code exists', observed: [], architecture: [],
      conventions: [], decisions: [], qualityGates: [], assumptions: [], questions: [],
      evidence: {version: 1, coverage: [{path: 'project-brief.md', status: 'inspected', reason: 'Confirmed brief'}],
        statements: [{id: 'first-outcome', kind: 'user-decision', statement: brief,
          evidence: [{path: 'project-brief.md', quote: brief, hash: contentHash(`${brief}\n`)}], confirmation: brief}]},
    }, {expectedCommit: snapshot.commit, expectedHash: await projectDocumentHash(root)});
    const routed = await routeKnowledge(root, process.cwd(), {files: ['project-brief.md'],
      query: 'Build a private resume draft form', technologies: ['React']});
    assert.deepEqual(routed.inspection.analysis.signals.map(signal => signal.kind), ['path']);
    const index = (await readReferenceIndex(join(process.cwd(), 'references/learned')))!;
    assert.ok(routed.semanticLenses.every(item => index.entries.some(entry => entry.id === item.id && entry.investigation)), 'Only published investigation questions can become lenses');
  } finally { await rm(root, {recursive: true, force: true}); }
});


test('semantic lenses expose scoped investigation questions without adopting a rule', async () => {
  const index = (await readReferenceIndex(join(process.cwd(), 'references/learned')))!;
  const base = index.entries.find(entry => entry.id === 'request-policy-boundaries')!;
  const entry = {...base, id:'synthetic-semantic-review', technologies:['React'], excludedTechnologies:[],
    triggers:[{kind:'semantic' as const,value:'caller chooses operation'}]};
  const fixture = {...index, entries:[entry]};
  assert.equal(semanticReviewLenses(fixture, ['React'])[0]?.id, entry.id);
  assert.deepEqual(semanticReviewLenses(fixture, ['Vue']), []);
  assert.deepEqual(semanticReviewLenses({...fixture,entries:[{...entry,investigation:undefined}]}, ['React']), []);
});
