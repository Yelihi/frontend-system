import assert from 'node:assert/strict';
import test from 'node:test';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {mkdtemp,mkdir,readFile,rm,writeFile,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {git} from '../src/application/git-state.js';
import {flowSchema,type ProjectFlow} from '../src/application/flow-schema.js';
import {saveProjectAnalysis} from '../src/application/project-flows.js';
import {projectAnalysisReadiness} from '../src/application/project-readiness.js';
import {projectSnapshot,projectDocumentHash} from '../src/application/project-snapshot.js';
import {projectAnalysisSchema} from '../src/application/project-analysis-input.js';
import {writeProjectArtifacts} from '../src/application/project-store.js';
import {FileSystemProjectDiscovery} from '../src/adapters/filesystem/project-discovery.js';
import {composeProjectViews,readProjectView,type ProjectView,type FlowReceipt} from '../src/application/project-visualization.js';
import {projectFlowView} from '../src/application/page-flow-view.js';
import {applyProjectChange,saveProjectChange,listProjectChanges,type ProjectChange} from '../src/application/project-changes.js';
import {renderProjectFlow} from '../src/application/render-project-flow.js';
import {digest} from '../src/application/workflow-store.js';
import type {ProjectAnalysis} from '../src/domain/types.js';

const code='export const userStore = { name: "Ada" };\nexport function rename(name: string) { userStore.name = name; }\n';
function pageFlow(id:string,commit:string):ProjectFlow{
 return flowSchema.parse({id,title:id,basis:'observed',summary:'공용 사용자 이름을 표시한다.',
  scope:{files:['src/user.ts'],discoveryRoots:['src'],snapshot:{baseRef:'main',expectedCommit:commit}},
  evidence:{code:{path:'src/user.ts',quote:'export const userStore = { name: "Ada" };'}},
  nodes:[{id:'page',entityId:`page-${id}`,kind:'page',label:id,evidence:['code']},
   {id:'store',entityId:'user-store',kind:'store',label:'userStore',state:['name: string'],architecture:{layer:'state',runtime:'browser',responsibility:'사용자 이름'},evidence:['code']}],
  pages:[{node:'page',route:`/${id}`,scenes:[{id:'ready',title:'표시',kind:'success',description:'이름 표시'}]}],
  edges:[{id:'read',from:'store',to:'page',kind:'subscribe',label:'readName()',evidence:['code']}],
  scenarios:[{id:'show',title:'이름 표시',entry:'page',event:'mount',steps:[{edge:'read',effect:'이름을 표시한다.',views:[{page:'page',scene:'ready'}]}],outcome:'이름 표시'}],
  limitations:['정적 코드 해석; 런타임 측정 없음']});
}
async function fixture(){
 const root=await mkdtemp(join(tmpdir(),'fs-project-view-'));await mkdir(join(root,'src'));
 await writeFile(join(root,'src/user.ts'),code);await writeFile(join(root,'.gitignore'),'.frontend-system/\n');
 await git(root,['init','-b','main']);await git(root,['config','user.name','FS']);await git(root,['config','user.email','fs@example.invalid']);
 await git(root,['add','.']);await git(root,['commit','-m','baseline']);return root;
}
async function saveBaseline(root:string,refs:FlowReceipt[],partial=false){
 const snapshot=await projectSnapshot(root);const discovery=new FileSystemProjectDiscovery();
 const profile=await discovery.discover(await discovery.createRef(root));
 const analysis=projectAnalysisSchema.parse({summary:'사용자 상태를 프로필과 피드에서 공유한다.',evidence:{
  coverage:snapshot.files.map(path=>({path,status:partial&&path!== 'src/user.ts'?'pending':'inspected',reason:partial?'Review remains':'Read in fixture'})),
  statements:[{id:'user',kind:'fact',statement:'userStore owns the user name.',evidence:[{path:'src/user.ts',quote:'export const userStore = { name: "Ada" };'}],reuseReason:'No semantic interpretation used.'}]},
  report:{status:partial?'partial':'complete',areas:[{id:'user',kind:'shared',title:'사용자',status:partial?'pending':'reviewed',summary:'사용자 이름 공유',
    statementIds:['user'],flows:refs,findings:[],knowledgeReview:'No registered rule applies to this fixture.'}]}}) as ProjectAnalysis;
 return writeProjectArtifacts(profile,analysis,{expectedCommit:snapshot.commit,expectedHash:await projectDocumentHash(root)});
}
async function initialize(root:string){
 const commit=(await projectSnapshot(root)).commit!;const refs=[];
 for(const id of ['profile','feed','comments']){
  const saved=await saveProjectAnalysis(root,process.cwd(),{expectedHash:null,record:{kind:'flow',data:pageFlow(id,commit)}});refs.push({id:saved.id,hash:saved.hash});
 }
 await saveBaseline(root,refs);return refs;
}
function replace(ref:FlowReceipt,proposal:FlowReceipt,baseHash:string):ProjectChange{
 return {version:1,issueId:'rename-user',title:'이름 변경',baseHash,operations:[{type:'replace',before:ref,flow:proposal}]};
}

test('project entry initializes, resumes, reuses and refreshes with immutable dependency reuse',async()=>{
 const root=await fixture();
 try{
  assert.equal((await projectAnalysisReadiness(root,process.cwd())).action,'analyze-all');
  const refs=await initialize(root);assert.equal((await projectAnalysisReadiness(root,process.cwd())).action,'reuse');
  await saveBaseline(root,refs,true);assert.equal((await projectAnalysisReadiness(root,process.cwd())).action,'resume');
  await saveBaseline(root,refs);const before=await readProjectView(root);
  const original=await readFile(join(root,'.frontend-system/project.md'),'utf8');
  await mkdir(join(root,'.frontend-system/changes'));
  await writeFile(join(root,'.frontend-system/changes/broken.json'),'not json');
  await assert.rejects(saveBaseline(root,refs),/JSON/);
  assert.equal(await readFile(join(root,'.frontend-system/project.md'),'utf8'),original,'Late projection failure rolls back the document pointer');
  await rm(join(root,'.frontend-system/changes/broken.json'));
  const html=await readFile(join(root,'.frontend-system/diagrams/index.html'),'utf8');assert.match(html,/현재 프로젝트/);
  await writeFile(join(root,'NOTES.md'),'Unrelated documentation');await git(root,['add','NOTES.md']);await git(root,['commit','-m','notes']);
  const readiness=await projectAnalysisReadiness(root,process.cwd());assert.equal(readiness.action,'refresh');assert.deepEqual(readiness.reusableFlows,refs.map(r=>r.id));
  await saveBaseline(root,refs);assert.notEqual((await readProjectView(root))!.hash,before!.hash);
  assert.equal((await projectAnalysisReadiness(root,process.cwd())).action,'reuse');
  await writeFile(join(root,'src/consumer.ts'),'import {userStore} from "./user";');await git(root,['add','.']);await git(root,['commit','-m','consumer']);
  const changed=await projectAnalysisReadiness(root,process.cwd());assert.equal(changed.affectedFlows.length,3);
  const document=await readFile(join(root,'.frontend-system/project.md'),'utf8');const shell=await readFile(join(root,'.frontend-system/diagrams/index.html'),'utf8');
  await assert.rejects(saveBaseline(root,refs),/stale/);
  assert.equal(await readFile(join(root,'.frontend-system/project.md'),'utf8'),document);
  assert.equal(await readFile(join(root,'.frontend-system/diagrams/index.html'),'utf8'),shell);
 }finally{await rm(root,{recursive:true,force:true});}
});

test('shared identities compose once, preserve scenario namespaces and reject inconsistent consumer contracts',()=>{
 const flows=['profile','feed','comments'].map(id=>pageFlow(id,'a'.repeat(40)));
 const parts=()=>flows.map(flow=>({flow,spec:projectFlowView(flow,'1'.repeat(64)),screens:{}}));
 const result=composeProjectViews(parts(),{baseRef:'main',expectedCommit:'a'.repeat(40)},'1'.repeat(64));
 assert.equal(result.spec.nodes.filter(n=>n.kind==='store').length,1);assert.equal(result.spec.pages.length,3);
 assert.equal(new Set(result.spec.scenarios.map(s=>s.id)).size,3);
 assert.equal(new Set(result.spec.scenarios.map(s=>s.steps[0]!.fromNode)).size,1);
 const sharedPage=pageFlow('same-page','a'.repeat(40));
 sharedPage.nodes.push({id:'label',entityId:'shared-label',parent:'page',kind:'component',label:'UserLabel',props:[],state:[],events:[],lifecycle:[],evidence:['code']});
 const other=structuredClone(sharedPage);other.id='another-event';
 const same=composeProjectViews([sharedPage,other].map(flow=>({flow,spec:projectFlowView(flow,'1'.repeat(64)),screens:{}})),{baseRef:'main',expectedCommit:'a'.repeat(40)},'1'.repeat(64));
 assert.equal(same.spec.pages.length,1);assert.equal(same.spec.instances.length,1);
 flows[1]!.nodes[1]!.state=['username: string'];assert.throws(()=>composeProjectViews(parts(),{baseRef:'main',expectedCommit:'a'.repeat(40)},'1'.repeat(64)),/contract conflict/);
});

test('change operations reject overwritten targets, duplicate edits and obsolete bases',()=>{
 const first={id:'profile',hash:'1'.repeat(64)},second={id:'feed',hash:'2'.repeat(64)};
 const base:ProjectView={version:1,baseline:{baseRef:'main',expectedCommit:'a'.repeat(40)},status:'complete',flows:[first,second]};
 const draft=replace(first,{id:'profile-design',hash:'3'.repeat(64)},digest(JSON.stringify(base)));
 assert.deepEqual(applyProjectChange(base,draft).map(f=>f.id),['feed','profile-design']);
 assert.throws(()=>applyProjectChange({...base,status:'partial'},draft),/baseline changed/);
 const wrong=structuredClone(draft),wrongOp=wrong.operations[0]!;if(wrongOp.type==='replace')wrongOp.before.hash='0'.repeat(64);
 assert.throws(()=>applyProjectChange(base,wrong),/target changed/);
 const duplicate=structuredClone(draft);duplicate.operations.push(duplicate.operations[0]!);assert.throws(()=>applyProjectChange(base,duplicate),/Duplicate/);
 draft.operations=[{type:'add',flow:first}];assert.throws(()=>applyProjectChange(base,draft),/already exists/);
 draft.operations=[{type:'remove',before:first}];assert.deepEqual(applyProjectChange(base,draft),[second]);
});

test('issue previews preserve baseline, block incompatible shared changes and reconcile only cited observed versions',async()=>{
 const root=await fixture();
 try{
  const refs=await initialize(root);const base=(await readProjectView(root))!;const before=await readFile(join(root,'.frontend-system/project.md'),'utf8');
  const flow=pageFlow('profile',base.data.baseline.expectedCommit);flow.id='profile-design';flow.basis='proposed';delete flow.scope.snapshot;
  await assert.rejects(saveProjectAnalysis(root,process.cwd(),{expectedHash:refs[0]!.hash,record:{kind:'flow',data:{...flow,id:'profile'}}}),/Keep observed and proposed/);
  const proposal=await saveProjectAnalysis(root,process.cwd(),{expectedHash:null,record:{kind:'flow',data:flow}});
  const change=replace(refs[0]!,proposal,base.hash);
  const saved=await saveProjectChange(root,process.cwd(),{expectedHash:null,record:{kind:'change',data:change}});
  assert.equal(saved.status,'proposed');assert.equal(await readFile(join(root,'.frontend-system/project.md'),'utf8'),before);
  const rendered=await renderProjectFlow(root,process.cwd(),{projectView:true,issueId:change.issueId});
  assert.match(await readFile(rendered.path,'utf8'),/이름 변경/);
  await assert.rejects(saveProjectChange(root,process.cwd(),{expectedHash:null,record:{kind:'change',data:change}}),/reread/);
  const conflicts=structuredClone(flow);conflicts.id='conflicting';conflicts.nodes[1]!.state=['different: number'];
  const conflict=await saveProjectAnalysis(root,process.cwd(),{expectedHash:null,record:{kind:'flow',data:conflicts}});
  await assert.rejects(saveProjectChange(root,process.cwd(),{expectedHash:saved.hash,record:{kind:'change',data:replace(refs[0]!,conflict,base.hash)}}),/contract conflict/);
  const review={baselineHash:base.hash,implementationCommits:[base.data.baseline.expectedCommit],comparisons:[{targetId:'profile',result:'matches' as const,observed:refs[0]!,explanation:'No implementation change was necessary; existing flow matches the retained design.',evidence:[{path:'src/user.ts',quote:'export const userStore = { name: "Ada" };'}]}]};
  const invalid=structuredClone(review);invalid.comparisons[0]!.observed=proposal;
  await assert.rejects(saveProjectChange(root,process.cwd(),{expectedHash:saved.hash,record:{kind:'change',data:{...change,reconciliation:invalid}}}),/current observed/);
  const incomplete=await saveProjectChange(root,process.cwd(),{expectedHash:saved.hash,record:{kind:'change',data:{...change,reconciliation:{...review,comparisons:review.comparisons.map(c=>({...c,result:'differs' as const}))}}}});
  assert.equal(incomplete.status,'needs-review');
  const done=await saveProjectChange(root,process.cwd(),{expectedHash:incomplete.hash,record:{kind:'change',data:{...change,reconciliation:review}}});assert.equal(done.status,'applied');
  assert.equal((await projectAnalysisReadiness(root,process.cwd())).issues[0]!.status,'applied');
  assert.equal((await listProjectChanges(root)).length,1);
  const client=new Client({name:'project-view-test',version:'1'});
  try{
    await client.connect(new StdioClientTransport({command:process.execPath,args:[join(process.cwd(),'bundle/mcp.js')]}));
    const state=await client.callTool({name:'get_project_analysis',arguments:{projectPath:root,projectView:true}});
    assert.ok(!state.isError);assert.match(JSON.stringify(state.content),/reuse/);
    const view=await client.callTool({name:'render_project_flow',arguments:{projectPath:root,projectView:true}});
    assert.ok(!view.isError);assert.match(JSON.stringify(view.content),/index.html/);
    await mkdir(join(root,'.frontend-system/drafts'));
    await writeFile(join(root,'.frontend-system/drafts/change.json'),JSON.stringify({expectedHash:done.hash,record:{kind:'change',data:{...change,reconciliation:review}}}));
    const receipt=await client.callTool({name:'save_project_analysis',arguments:{projectPath:root,draftFile:'.frontend-system/drafts/change.json'}});
    assert.ok(!receipt.isError,JSON.stringify(receipt));
  }finally{await client.close();}
  await writeFile(join(root,'NOTES.md'),'new baseline');await git(root,['add','NOTES.md']);await git(root,['commit','-m','advance']);
  await assert.rejects(renderProjectFlow(root,process.cwd(),{projectView:true}),/Refresh/);
  await saveBaseline(root,refs);
  const shell=await readFile(join(root,'.frontend-system/diagrams/index.html'),'utf8');assert.match(shell,/기준 변경 · 재검토 필요/);
  await assert.rejects(renderProjectFlow(root,process.cwd(),{projectView:true,issueId:change.issueId}),/baseline changed/);
  await symlink(join(root,'NOTES.md'),join(root,'.frontend-system/changes/escape.json'));
  await assert.rejects(listProjectChanges(root),/symlinks/);
 }finally{await rm(root,{recursive:true,force:true});}
});
