import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { inspectCode } from '../src/application/knowledge/code-triggers.js';
import { investigationSchema, validateInvestigation, type InvestigationAssessment } from '../src/application/knowledge/investigation.js';
import { contentHash, type ReferenceIndex } from '../src/application/knowledge/reference-index.js';
import { inspectCodeKnowledge, saveKnowledgeReview } from '../src/application/knowledge/trigger-review.js';
import { routeKnowledge } from '../src/application/knowledge/routing.js';
import { bindDesignEvidence, evidenceFreshness, type DesignEvidence } from '../src/application/design-evidence.js';
import { rememberAnalysis } from '../src/application/analysis-receipts.js';
import { fixtureEvidence } from './design-evidence-fixture.js';
import { knowledgeStatus, markKnowledgeSynced, validateKnowledgeSync } from '../src/application/knowledge/catalog.js';
import { approveFixtureSource, addActiveFixtureNote as addKnowledgeNote } from './source-review-fixture.js';

// Authored evaluator knowledge only. Not published into the user's learned corpus.
const spec = investigationSchema.parse({version:1, questions:[
  {id:'caller',kind:'code',role:'applicability',instruction:'Trace actual callers and identify whether they select a fixed operation.'},
  {id:'replay',kind:'intent',role:'exclusion',instruction:'Check the supplied contract for a replay requirement; code search alone cannot settle intent.'},
], preserve:['Preserve return values and validation across every operation.'], alternatives:[{option:'Expose operations directly',tradeoff:'Requires caller migration; retain command form if replay needs it.'}], onMissing:'Inspect untraced callers or ask about unresolved replay requirements.'});
const source = `export function operate(command: {kind: string}) { if (command.kind === 'archive') return 1; return 2; }\n`;
const caller = `import {operate} from './operation';\nexport const view = <button onClick={() => operate({kind:'archive'})}>Archive</button>;\n`;
function assessment(replay = false): InvestigationAssessment {
  const answer = replay ? 'Commands must be saved and replayed.' : 'Commands are not saved or replayed.';
  return {findings:[
    {questionId:'caller',status:'supported',basis:'code',rationale:'This inspected event callback supplies a fixed operation.',citations:[{path:'view.tsx',line:2,quote:"operate({kind:'archive'})"}]},
    {questionId:'replay',status:replay?'supported':'refuted',basis:'owner',rationale:'Supplied contract controls replay.',confirmation:answer,citations:[{path:'contract.md',line:1,quote:answer}]},
  ],action:replay?'keep':'recommend',limitations:['Only selected source and supplied contract; other callers and runtime paths are not certified.']};
}
async function fixture() {
  const root = await mkdtemp(join(tmpdir(),'fs-investigation-'));
  const system = await mkdtemp(join(tmpdir(),'fs-investigation-system-'));
  await writeFile(join(root,'operation.ts'),source); await writeFile(join(root,'view.tsx'),caller);
  await writeFile(join(root,'contract.md'),'Commands are not saved or replayed.');
  const note = await addKnowledgeNote(system,{title:'Conditional operation boundary',content:'Inspect callers and replay contracts before recommending an operation API.'});
  await approveFixtureSource(system,note.document.id);
  await mkdir(join(system,'references/learned'),{recursive:true});
  const body = 'Inspect caller-selected operations and preserve replay contracts.';
  await writeFile(join(system,'references/learned/boundary.md'),body);
  const index: ReferenceIndex = {version:3,entries:[{
    id:'boundary',kind:'decision',title:'Operation boundary',summary:body,path:'boundary.md',contentHash:contentHash(body),
    keywords:['operation'],domains:['architecture'],technologies:[],excludedTechnologies:[],conditions:['Caller selects an operation'],exclusions:['Replay requirement'],
    evidenceKind:'experience',review:'reviewed',sources:{[note.document.id]:note.document.contentHash},related:[],routing:{mode:'direct',reason:'Inspect context, not a defect label'},
    triggers:[{kind:'syntax',value:'parameter-dispatch'}],checks:[{id:'boundary',question:'Does the command representation have a consumer?',guidance:body,verification:'review'}],investigation:spec,
  }],outcomes:[{sourceId:note.document.id,sourceHash:note.document.contentHash,action:'represented',reason:'Conditional review'}],
  triggerChecks:[{signals:[{kind:'syntax',value:'parameter-dispatch'}],technologies:[],expectedIds:['boundary'],forbiddenIds:[]},
    {signals:[{kind:'jsx-element',value:'div'}],technologies:[],expectedIds:[],forbiddenIds:['boundary']}]};
  const save = () => writeFile(join(system,'references/learned/index.json'),JSON.stringify(index));
  await save();
  return {root,system,index,save,note,cleanup:()=>Promise.all([rm(root,{recursive:true,force:true}),rm(system,{recursive:true,force:true})])};
}

test('bounded facts link JSX callback, fixed argument, imported function and parameter dispatch without calling it a defect',async()=>{
  const f=await fixture();
  try {
    const result=await inspectCode(f.root,['operation.ts','view.tsx'],undefined,true);
    assert.equal(result.signals.filter(s=>s.kind==='syntax').length,1);
    const facts=result.relations!.facts;
    const operation=facts.find(x=>x.kind==='function'&&x.name==='operate')!;
    const call=facts.find(x=>x.kind==='call'&&x.callee==='operate')!;
    const event=facts.find(x=>x.kind==='callback-binding')!;
    assert.equal(call.target,operation.id,'Selected imported declaration is linked');
    assert.equal(event.target,call.owner,'Event callback owns the call');
    assert.deepEqual(call.arguments,[{kind:'object',fields:[{name:'kind',value:"'archive'",literal:true}],truncated:false}]);
    assert.equal(facts.find(x=>x.kind==='parameter-dispatch')!.function,operation.id);
    assert.equal((await inspectCode(f.root,['operation.ts'])).relations,undefined,'Routine routing omits expanded facts');
    const legacy=await routeKnowledge(f.root,process.cwd(),{files:['operation.ts'],query:'refactor'});
    const contextKnowledge=legacy.candidates.find(x=>x.id==='code-quality-context-and-contracts');
    assert.ok(contextKnowledge?.reasons.includes('structure-search'),'Observed syntax can retrieve existing semantic-only knowledge without a topic in the request');
    assert.equal(contextKnowledge!.investigationStatus,'legacy-checklist','Discovery is not a completed investigation');

    await writeFile(join(f.root,'replay.ts'),`import {operate} from './operation';
export function replay(history:Array<{kind:string}>) { return history.map(command => operate(command)); }`);
    const mixed=await inspectCode(f.root,['operation.ts','view.tsx','replay.ts'],undefined,true);
    const calls=mixed.relations!.facts.filter(x=>x.kind==='call'&&x.callee==='operate');
    assert.equal(calls.length,2);
    assert.ok(calls.every(x=>x.target===operation.id));
    assert.deepEqual(calls.find(x=>x.path==='replay.ts')!.arguments,[{kind:'identifier',expression:'command'}], 'Forwarded command is not reported as a fixed literal');

    await writeFile(join(f.root,'other.ts'),`function local(command: unknown) { { const command={kind:'x'}; if(command.kind==='x') return; } }
function outer(command:{kind:string}) { return () => { if(command.kind==='x') return; }; }
function dynamic(service:any) { service.run('x'); }`);
    const other=await inspectCode(f.root,['other.ts'],undefined,true);
    assert.equal(other.signals.filter(s=>s.kind==='syntax').length,0,'No same-name or outer-closure false attribution');
    assert.equal(other.relations!.facts.find(x=>x.kind==='call')!.target,null);
    await writeFile(join(f.root,'events.ts'),`function click(){ return 1; }
button.addEventListener('click',click);`);
    const events=(await inspectCode(f.root,['events.ts'],undefined,true)).relations!.facts;
    const callbackArgument=(events.find(x=>x.kind==='call')!.arguments as Array<{target?:string}>)[1]!;
    assert.equal(callbackArgument.target,events.find(x=>x.kind==='function')!.id,'Native callback argument links without assuming React');
    await writeFile(join(f.root,'many.ts'),'function f(x:number){return x;}\n'+Array.from({length:230},(_,i)=>`f(${i});`).join('\n'));
    const bounded=(await inspectCode(f.root,['many.ts'],undefined,true)).relations!;
    assert.equal(bounded.facts.length,200); assert.equal(bounded.truncated,true); assert.ok(bounded.omitted>0);
  } finally {await f.cleanup();}
});

test('same syntax supports different decisions only with contextual evidence; unknown intent and automatic repair cannot bypass gates',()=>{
  assert.doesNotThrow(()=>validateInvestigation(spec,'apply',assessment()));
  assert.doesNotThrow(()=>validateInvestigation(spec,'not-applicable',assessment(true)));
  assert.throws(()=>validateInvestigation(spec,'apply',assessment(true)),/excluded/);
  const unknown=assessment(); unknown.findings[1]={questionId:'replay',status:'unknown',basis:'unknown',rationale:'No owner decision supplied',citations:[]};
  assert.throws(()=>validateInvestigation(spec,'apply',unknown),/unknown/);
  unknown.action='ask';assert.doesNotThrow(()=>validateInvestigation(spec,'needs-decision',unknown));
  const inferred=assessment();inferred.findings[1]!.basis='inference';assert.throws(()=>validateInvestigation(spec,'apply',inferred),/Intent questions/);
  const repair=assessment();repair.action='repair';assert.throws(()=>validateInvestigation(spec,'apply',repair),/Direct repair/);
  repair.authority={basis:'approved-contract',citation:{path:'contract.md',line:2,quote:'Use operation APIs.'}};
  assert.doesNotThrow(()=>validateInvestigation(spec,'apply',repair));
  assert.throws(()=>validateInvestigation(spec,'not-applicable'),/required/);
  assert.throws(()=>investigationSchema.parse({...spec,questions:[spec.questions[0],spec.questions[0]]}),/Duplicate|exclusion/);
});

test('sync binds investigation metadata; strict publication requires migration without fabricating old knowledge',async()=>{
  const f=await fixture();
  try {
    const saved=f.index.entries[0]!.investigation; delete f.index.entries[0]!.investigation;await f.save();
    assert.deepEqual((await knowledgeStatus(f.system)).routing.withoutInvestigation,['boundary']);
    await assert.rejects(markKnowledgeSynced(f.system,[f.note.document.id],true),/Investigation specification required/);
    f.index.entries[0]!.investigation=saved;await f.save();await markKnowledgeSynced(f.system,[f.note.document.id],true);
    assert.deepEqual((await knowledgeStatus(f.system)).unpublished,[]);
    f.index.entries[0]!.investigation!.onMissing='Inspect additional callers before deciding.';await f.save();
    assert.deepEqual((await knowledgeStatus(f.system)).unpublished,[f.note.document.id]);
    f.index.entries[0]!.triggers![0]!.value='invented-graph';await f.save();
    await assert.rejects(validateKnowledgeSync(f.system,[]),/unsupported syntax/);
  } finally {await f.cleanup();}
});

test('review validates caller and owner evidence and invalidates it when caller or contract changes',async()=>{
  const f=await fixture();
  try {
    const input={files:['operation.ts','view.tsx','contract.md'],includeRelations:true};
    const inspected=await inspectCodeKnowledge(f.root,f.system,input);
    assert.equal(inspected.candidates[0]!.investigationStatus,'pending');
    const judgments=inspected.checklist.map(item=>({itemId:item.itemId,decision:'apply' as const,rationale:'Conditional operation recommendation',evidence:"command.kind === 'archive'",investigation:assessment(),verification:{kind:'none' as const,reason:'Planning only'}}));
    const saved=await saveKnowledgeReview(f.root,f.system,input,inspected.inspectionHash,judgments,'investigation',null);
    assert.equal(saved.status,'reviewed');
    const record=JSON.parse(await readFile(join(f.root,'.frontend-system/evidence/investigation.md'),'utf8'));
    assert.ok(record.sourceHashes['view.tsx']);assert.ok(record.sourceHashes['contract.md']);
    const invented=structuredClone(judgments);invented[0]!.investigation.findings[0]!.citations[0]!.quote='invented call';
    await assert.rejects(saveKnowledgeReview(f.root,f.system,input,inspected.inspectionHash,invented,'invented',null),/Investigation citation/);
    await writeFile(join(f.root,'view.tsx'),caller+'// changed caller\n');
    await assert.rejects(saveKnowledgeReview(f.root,f.system,input,inspected.inspectionHash,judgments,'stale',null),/Inspection changed/);
  } finally {await f.cleanup();}
});

test('plan binding enforces investigation too, including grouped dismissals and requirement freshness',async()=>{
  const f=await fixture();
  try {
    await fixtureEvidence(f.root,{version:1,rules:[],checks:[],reviews:[],guards:[],exceptions:[]},[{id:'boundary',files:['operation.ts','view.tsx']}]);
    const route=await routeKnowledge(f.root,f.system,{files:['operation.ts','view.tsx'],requirements:['contract.md'],query:'operation'});
    const project=await readFile(join(f.root,'.frontend-system/project.md'),'utf8');
    const input: DesignEvidence={version:1,projectHash:contentHash(project),routes:[{input:route.request,hash:route.hash,judgments:[{referenceId:'boundary',decision:'apply',rationale:'Conditional recommendation',investigation:assessment()}]}],decisions:[{
      id:'boundary',question:'Change the API?',evidence:[{path:'operation.ts',line:1,quote:source.trim()}],knowledgeIds:['boundary'],options:[{id:'split',description:'Separate operations',cost:'Caller migration'}],selected:null,status:'open',authority:'user',confirmation:'',rationale:'Not yet authorized',reconsiderWhen:'Owner chooses',ruleIds:[],issueIds:[],
    }]};
    const bound=await bindDesignEvidence(f.root,input,f.system);
    assert.ok(bound.requirementHashes!['contract.md']);
    const contextId=await rememberAnalysis(f.root,contentHash(project),route);
    await assert.rejects(bindDesignEvidence(f.root,{...input,routes:[{contextId,judgments:[],dismissed:[{referenceIds:['boundary'],rationale:'No investigation supplied'}]}]},f.system),/Investigation findings required/);
    const absent=structuredClone(input);delete absent.routes[0]!.judgments[0]!.investigation;
    await assert.rejects(bindDesignEvidence(f.root,absent,f.system),/Investigation findings required/);
    const invented=structuredClone(input);invented.routes[0]!.judgments[0]!.investigation!.findings[0]!.citations[0]!.path='uninspected.ts';
    await assert.rejects(bindDesignEvidence(f.root,invented,f.system),/Investigation must cite/);
    await writeFile(join(f.root,'contract.md'),'Commands must be saved and replayed.');
    assert.ok((await evidenceFreshness(f.root,bound,true,f.system)).some(x=>x.includes('contract.md')));
  } finally {await f.cleanup();}
});

test('published effect investigation keeps valid synchronization and abstains on unspecified owner intent',async()=>{
  const index=JSON.parse(await readFile(join(process.cwd(),'references/learned/index.json'),'utf8')) as ReferenceIndex;
  const reference=index.entries.find(e=>e.id==='react-derived-state-and-effects')!;
  const specification=investigationSchema.parse(reference.investigation);
  const root=await mkdtemp(join(tmpdir(),'fs-effect-context-'));
  try {
    const text='import {useEffect as sync} from "react";\nexport function View({bus}: any){sync(()=>bus.subscribe(),[bus]);return null;}';
    await writeFile(join(root,'View.tsx'),text);
    const inspection=await inspectCode(root,['View.tsx']);
    assert.ok(inspection.signals.some(s=>s.kind==='call' && s.value==='react#useEffect'),'Actual alias extraction reaches the published trigger');
    const findings:InvestigationAssessment['findings']=specification.questions.map(q=>({questionId:q.id,
      status:q.kind==='intent'?'unknown':'supported',basis:q.kind==='intent'?'unknown':'code',rationale:'Authored calibration: valid external subscription; owner reset behavior not supplied.',
      citations:q.kind==='intent'?[]:[{path:'View.tsx',line:2,quote:'sync(()=>bus.subscribe(),[bus])'}]}));
    const assessment:InvestigationAssessment={findings,action:'keep',limitations:['Authored semantic expectations, not an independent model judgment. React lifecycle not executed.']};
    assert.doesNotThrow(()=>validateInvestigation(specification,'not-applicable',assessment),'Valid synchronization can be retained without inventing an unrelated owner decision');
    const undecided=structuredClone(assessment);undecided.findings.find(f=>f.questionId==='already-correct')!.status='refuted';undecided.action='ask';
    assert.doesNotThrow(()=>validateInvestigation(specification,'needs-decision',undecided));
    undecided.action='recommend';assert.throws(()=>validateInvestigation(specification,'apply',undecided),/Cannot apply/);
    const supplied=structuredClone(undecided),intent=supplied.findings.find(f=>f.questionId==='preserved-behavior')!;
    intent.status='supported';intent.basis='owner';intent.confirmation='Preserve input across updates.';intent.citations=[{path:'contract.md',line:1,quote:intent.confirmation}];
    assert.doesNotThrow(()=>validateInvestigation(specification,'apply',supplied),'Settled conditions permit advice, not automatic edits');
  } finally {await rm(root,{recursive:true,force:true});}
});
