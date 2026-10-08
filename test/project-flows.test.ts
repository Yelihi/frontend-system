import assert from 'node:assert/strict';
import {mkdtemp, mkdir, readFile, rm, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import test from 'node:test';
import {flowSchema, type ProjectFlow} from '../src/application/flow-schema.js';
import {saveProjectAnalysis, getProjectAnalysis, validateAnalysisReferences} from '../src/application/project-flows.js';
import {flowToHtml, flowToMermaid} from '../src/application/flow-view.js';

function flow(): ProjectFlow {
  return flowSchema.parse({id:'save', title:'Editor save', basis:'observed', summary:'Save preserves an input snapshot until success.',
    scope:{files:['src/save.ts','src/caller.ts','CONTRACT.md'],discoveryRoots:['src']},
    evidence:{save:{path:'src/save.ts',quote:'export const save = (value: string) => value;'}, caller:{path:'src/caller.ts',quote:'save(input)'}, contract:{path:'CONTRACT.md',quote:'Preserve input on failure.'}},
    nodes:[{id:'page',kind:'page',label:'Editor',evidence:['caller']},{id:'form',kind:'component',parent:'page',label:'Form',state:['input'],events:['submit'],evidence:['caller']},{id:'api',kind:'module',label:'save',evidence:['save']}],
    edges:[{id:'submit',from:'form',to:'api',kind:'call',label:'save(input)',evidence:['caller']}],
    scenarios:[{id:'submit',title:'Submit',entry:'form',event:'submit',steps:[{edge:'submit',effect:'Input forwarded'}],outcome:'Returned value',limitations:['Transport not shown']}],
    invariants:[{id:'input',statement:'Preserve input on failure',authority:'established',evidence:['contract']}],limitations:['Static local scope; no browser trace']});
}
async function fixture() {
  const root = await mkdtemp(join(tmpdir(),'fs-flows-')); await mkdir(join(root,'src'));
  await writeFile(join(root,'src/save.ts'),'export const save = (value: string) => value;');
  await writeFile(join(root,'src/caller.ts'),'import {save} from "./save"; const input = "x"; save(input);');
  await writeFile(join(root,'CONTRACT.md'),'Preserve input on failure.');
  return root;
}

test('flows survive fresh reads without registered knowledge and invalidate changed callers and new consumers', async () => {
  const root=await fixture();
  try {
    const saved=await saveProjectAnalysis(root,process.cwd(),{expectedHash:null,record:{kind:'flow',data:flow()}});
    const repeated=await saveProjectAnalysis(root,process.cwd(),{expectedHash:saved.hash,record:{kind:'flow',data:flow()}});
    assert.equal(repeated.status,'unchanged');assert.equal(repeated.hash,saved.hash);
    const ref={kind:'flow' as const,id:'save',hash:saved.hash,issueIds:['edit']};
    assert.deepEqual(await validateAnalysisReferences(root,process.cwd(),[ref],true),[]);
    assert.equal((await getProjectAnalysis(root,process.cwd(),{ids:['save'],full:true})).total,1);
    await writeFile(join(root,'src/caller.ts'),'// changed caller\n save(input);');
    assert.match((await validateAnalysisReferences(root,process.cwd(),[ref],true)).join(),/Changed dependency/);
    assert.deepEqual(await validateAnalysisReferences(root,process.cwd(),[ref],false),[], 'An immutable plan reference survives expected implementation changes');
    await writeFile(join(root,'src/caller.ts'),'import {save} from "./save"; const input = "x"; save(input);');
    await writeFile(join(root,'src/new-consumer.ts'),'save("external");');
    assert.match((await validateAnalysisReferences(root,process.cwd(),[ref],true)).join(),/inventory changed/);
    await assert.rejects(saveProjectAnalysis(root,process.cwd(),{expectedHash:null,record:{kind:'flow',data:flow()}}),/current hash/);
  } finally {await rm(root,{recursive:true,force:true});}
});

test('analysis rejects invented evidence, missing endpoints and cyclic containment before persistence',async()=>{
  const root=await fixture();
  try {
    const wrong=flow();wrong.evidence.save!.quote='not the source';
    await assert.rejects(saveProjectAnalysis(root,process.cwd(),{expectedHash:null,record:{kind:'flow',data:wrong}}),/quote not found/);
    const cycle=flow();cycle.nodes[0]!.parent='form';
    await assert.rejects(saveProjectAnalysis(root,process.cwd(),{expectedHash:null,record:{kind:'flow',data:cycle}}),/cyclic/);
    const missing=flow();missing.edges[0]!.to='missing';
    await assert.rejects(saveProjectAnalysis(root,process.cwd(),{expectedHash:null,record:{kind:'flow',data:missing}}),/endpoint/);
    await assert.rejects(readFile(join(root,'.frontend-system/analysis/flow/save.json')),/ENOENT/);
  } finally {await rm(root,{recursive:true,force:true});}
});

test('findings require authority and closure evidence while preserving immutable history',async()=>{
  const root=await fixture();
  try {
    const f=await saveProjectAnalysis(root,process.cwd(),{expectedHash:null,record:{kind:'flow',data:flow()}});
    const data={id:'input',title:'Input ownership',flow:{id:f.id,hash:f.hash},kind:'violation' as const,status:'open' as const,
      observation:'Check input preservation',consequence:'Failure must allow retry',evidence:[{path:'src/save.ts',quote:'export const save = (value: string) => value;'}],
      alternatives:[{id:'keep',description:'Keep pure transformation',cost:'Inspect callers'}]};
    await assert.rejects(saveProjectAnalysis(root,process.cwd(),{expectedHash:null,record:{kind:'finding',data}}),/requirement citation/);
    const input={...data,kind:'choice' as const};
    const first=await saveProjectAnalysis(root,process.cwd(),{expectedHash:null,record:{kind:'finding',data:input}});
    await assert.rejects(saveProjectAnalysis(root,process.cwd(),{expectedHash:first.hash,record:{kind:'finding',data:{...input,status:'dismissed'}}}),/resolution evidence/);
    const last=await saveProjectAnalysis(root,process.cwd(),{expectedHash:first.hash,record:{kind:'finding',data:{...input,status:'dismissed',resolution:{summary:'Existing pure operation preserves input',method:'static-review',evidence:input.evidence,reconsiderWhen:'Caller ownership changes'}}}});
    assert.notEqual(last.hash,first.hash);
    assert.deepEqual(await validateAnalysisReferences(root,process.cwd(),[{kind:'finding',id:'input',hash:first.hash,issueIds:['edit']}],false),[]);
    const records=await getProjectAnalysis(root,process.cwd(),{kind:'finding',ids:['input'],full:true});
    assert.equal(records.records[0]!.status,'dismissed');
  } finally {await rm(root,{recursive:true,force:true});}
});

test('diagram projections preserve nesting and scenario identity without executing labels',()=>{
  const f=flow();f.nodes[1]!.label='</script><script>globalThis.pwned=true</script>';
  const rendered=flowToHtml(f,'stale');
  assert.ok(!rendered.includes('</script><script>globalThis.pwned=true'));
  assert.ok(rendered.includes('\\u003c/script\\u003e'));
  assert.ok(rendered.includes('stale'));
  const mmd=flowToMermaid(f,'submit');assert.match(mmd,/subgraph n0/);assert.match(mmd,/1 · save\(input\)/);
  assert.equal(flowToHtml(f,'stale'),rendered,'Rendering is deterministic');
  f.evidence.save!.quote='근거 · 조건: 원본 유지';
  const english=flowToHtml(f,'current',{language:'en',scenarioId:'submit'});
  assert.match(english,/<html lang="en">/);
  assert.match(english,/Code evidence for selected relation/);
  assert.match(english,/value="submit" selected/);
  assert.ok(english.includes(f.evidence.save!.quote),'Translation preserves original source quotes');
  assert.ok(!english.includes(" || '<p>"),'No literal fallback expression in node cards');
  new Function(english.match(/<script>([\s\S]*?)<\/script>/)![1]!);
  assert.match(rendered,/<html lang="ko">/);
});

test('bundled MCP stores confined flow drafts, serves bounded summaries and renders the pinned record',async()=>{
  const {Client}=await import('@modelcontextprotocol/sdk/client/index.js');
  const {StdioClientTransport}=await import('@modelcontextprotocol/sdk/client/stdio.js');
  const root=await fixture(),client=new Client({name:'flow-test',version:'1'});
  try {
    await client.connect(new StdioClientTransport({command:process.execPath,args:[join(process.cwd(),'bundle/mcp.js')]}));
    const call=async(name:string,args:Record<string,unknown>)=>{
      const result=await client.callTool({name,arguments:{projectPath:root,...args}});
      assert.ok(!result.isError,JSON.stringify(result));
      return JSON.parse((result.content as Array<{text:string}>)[0]!.text);
    };
    const draft='.frontend-system/drafts/save.json';
    await mkdir(join(root,'.frontend-system/drafts'),{recursive:true});
    await writeFile(join(root,draft),JSON.stringify({expectedHash:null,record:{kind:'flow',data:flow()}}));
    const saved=await call('save_project_analysis',{draftFile:draft});
    const summary=await call('get_project_analysis',{ids:['save']});
    assert.equal(summary.records[0].hash,saved.hash);assert.equal(summary.records[0].data,undefined);
    const full=await call('get_project_analysis',{ids:['save'],detail:'full'});
    assert.equal(full.records[0].data.nodes[1].parent,'page');
    const large=flow();large.id='large';large.nodes[1]!.state=Array.from({length:30},()=> 'x'.repeat(1000));
    await writeFile(join(root,draft),JSON.stringify({expectedHash:null,record:{kind:'flow',data:large}}));
    await call('save_project_analysis',{draftFile:draft});
    const batch=await call('get_project_analysis',{ids:['save','large'],detail:'full'});
    assert.equal(batch.total,2);assert.equal(batch.records.find((r:{id:string})=>r.id==='save').data.id,'save');
    assert.equal(batch.records.find((r:{id:string})=>r.id==='large').data,undefined);
    assert.match(batch.records.find((r:{id:string})=>r.id==='large').detailOmitted.path,/analysis\/flow\/large.json/);
    const picture=await call('render_project_flow',{id:'save',expectedHash:saved.hash,format:'html',language:'en'});
    assert.match(await readFile(picture.path,'utf8'),/data-node="form"/);
    assert.match(await readFile(picture.path,'utf8'),/<html lang="en">/);
    const refused=await client.callTool({name:'render_project_flow',arguments:{projectPath:root,id:'save',expectedHash:'0'.repeat(64)}});
    assert.equal(refused.isError,true);
    await assert.rejects(readFile(join(root,'.frontend-system/project.md')),/ENOENT/,'Saving working flow must not refresh main context');
    assert.match(await readFile(join(root,'.frontend-system/analysis/index.md'),'utf8'),/flow\/save/);
  } finally {await client.close();await rm(root,{recursive:true,force:true});}
});


test('finding reuse invalidates changed knowledge metadata and a body changed without republishing',async()=>{
  const root=await fixture(),runtime=await mkdtemp(join(tmpdir(),'fs-flow-knowledge-'));
  try {
    const dir=join(runtime,'references/learned');await mkdir(dir,{recursive:true});
    const index=await readFile(join(process.cwd(),'references/learned/index.json'),'utf8');
    await writeFile(join(dir,'index.json'),index);
    const filename='request-policy-boundaries.md';
    await writeFile(join(dir,filename),await readFile(join(process.cwd(),'references/learned',filename),'utf8'));
    const f=await saveProjectAnalysis(root,runtime,{expectedHash:null,record:{kind:'flow',data:flow()}});
    await saveProjectAnalysis(root,runtime,{expectedHash:null,record:{kind:'finding',data:{id:'policy',title:'Policy question',flow:{id:f.id,hash:f.hash},kind:'choice',status:'open',observation:'Input forwarded',consequence:'Check ownership',evidence:[flow().evidence.save!],knowledgeIds:['request-policy-boundaries'],alternatives:[{id:'keep',description:'Keep',cost:'Review callers'}]}}});
    const query=()=>getProjectAnalysis(root,runtime,{kind:'finding',ids:['policy']});
    assert.equal((await query()).records[0]!.freshness && ((await query()).records[0]!.freshness as {status:string}).status,'current');
    const changed=JSON.parse(index);changed.entries.find((e:{id:string})=>e.id==='request-policy-boundaries').summary+=' Changed';
    await writeFile(join(dir,'index.json'),JSON.stringify(changed));
    assert.match(JSON.stringify(await query()),/Changed knowledge/);
    await writeFile(join(dir,'index.json'),index);await writeFile(join(dir,filename),'Changed without updating metadata');
    assert.match(JSON.stringify(await query()),/knowledge body/);
  } finally {await rm(root,{recursive:true,force:true});await rm(runtime,{recursive:true,force:true});}
});

test('source discovery ignores generated Markdown, retains explicit document guards and supports all-content mode',async()=>{
  const root=await fixture();
  try {
    const data=flow();data.scope.discoveryRoots=['.'];
    const saved=await saveProjectAnalysis(root,process.cwd(),{expectedHash:null,record:{kind:'flow',data}});
    const refs=[{kind:'flow' as const,id:'save',hash:saved.hash,issueIds:['edit']}];
    await writeFile(join(root,'analysis.md'),'Generated explanation, not a new consumer');
    assert.deepEqual(await validateAnalysisReferences(root,process.cwd(),refs,true),[]);
    await writeFile(join(root,'CONTRACT.md'),'Changed actual requirement');
    assert.match((await validateAnalysisReferences(root,process.cwd(),refs,true)).join(),/Changed dependency: CONTRACT/);
    await writeFile(join(root,'CONTRACT.md'),'Preserve input on failure.');
    data.scope.discoveryMode='all';
    const full=await saveProjectAnalysis(root,process.cwd(),{expectedHash:saved.hash,record:{kind:'flow',data}});
    await writeFile(join(root,'new-route.md'),'A content-driven route');
    assert.match((await validateAnalysisReferences(root,process.cwd(),[{...refs[0]!,hash:full.hash}],true)).join(),/inventory changed/);
  } finally {await rm(root,{recursive:true,force:true});}
});

test('findings can cite their main-snapshot flow without mixing working-only answers',async()=>{
  const {git}=await import('../src/application/git-state.js');
  const {projectSnapshot}=await import('../src/application/project-snapshot.js');
  const root=await fixture();
  try {
    await git(root,['init','-b','main']);await git(root,['add','.']);
    await git(root,['-c','user.name=Fixture','-c','user.email=fixture@example.test','commit','-m','Initial']);
    const data=flow();data.scope.discoveryRoots=['.'];data.scope.snapshot={baseRef:'main',expectedCommit:(await projectSnapshot(root)).commit!};
    const f=await saveProjectAnalysis(root,process.cwd(),{expectedHash:null,record:{kind:'flow',data}});
    await writeFile(join(root,'analysis.md'),'Generated analysis');
    const finding={id:'input',title:'Input contract',flow:{id:f.id,hash:f.hash},kind:'choice' as const,status:'open' as const,observation:'Input delegated',consequence:'Check caller contract',evidence:[data.evidence.save!],alternatives:[{id:'keep',description:'Keep',cost:'Review'}]};
    const saved=await saveProjectAnalysis(root,process.cwd(),{expectedHash:null,record:{kind:'finding',data:finding}});
    assert.equal(saved.status,'saved');
    await writeFile(join(root,'CONTRACT.md'),'New working answer not in main');
    await assert.rejects(saveProjectAnalysis(root,process.cwd(),{expectedHash:saved.hash,record:{kind:'finding',data:{...finding,evidence:[{path:'CONTRACT.md',quote:'New working answer not in main'}]}}}),/stale flow/);
  } finally {await rm(root,{recursive:true,force:true});}
});

test('actual flow export rejects stale/proposed records, preserves the prior artifact and exposes evidence',async()=>{
  const {renderProjectFlow}=await import('../src/application/render-project-flow.js');
  const root=await fixture();
  try {
    const data=flow();
    data.scenarios.push({...data.scenarios[0]!,id:'second',title:'Second scenario'});
    const saved=await saveProjectAnalysis(root,process.cwd(),{expectedHash:null,record:{kind:'flow',data}});
    const output=await renderProjectFlow(root,process.cwd(),{id:data.id,expectedHash:saved.hash,scenarioId:'second'});
    const original=await readFile(output.path,'utf8');
    assert.match(original,/<option value="second" selected>/);
    assert.ok(original.includes(root));assert.ok(original.includes(saved.hash));
    assert.match(original,/edge-citations/);assert.match(original,/src\/caller.ts/);
    assert.equal(output.freshness.status,'current');
    await writeFile(join(root,'src/save.ts'),'export const save = () => "changed";');
    await assert.rejects(renderProjectFlow(root,process.cwd(),{id:data.id,expectedHash:saved.hash}),/Current observed flow required/);
    assert.equal(await readFile(output.path,'utf8'),original,'A rejected stale export must not overwrite the previous artifact');
    const preview=await renderProjectFlow(root,process.cwd(),{id:data.id,expectedHash:saved.hash,allowUnverified:true});
    assert.equal(preview.freshness.status,'stale');
    assert.match(await readFile(preview.path,'utf8'),/Changed dependency: src\/save.ts/);
    await writeFile(join(root,'src/save.ts'),'export const save = (value: string) => value;');
    data.basis='proposed';
    const proposal=await saveProjectAnalysis(root,process.cwd(),{expectedHash:saved.hash,record:{kind:'flow',data}});
    await assert.rejects(renderProjectFlow(root,process.cwd(),{id:data.id,expectedHash:proposal.hash}),/proposed\/current/);
    await assert.rejects(renderProjectFlow(root,process.cwd(),{id:data.id,expectedHash:proposal.hash,allowUnverified:true,scenarioId:'absent'}),/Unknown flow scenario/);
  } finally {await rm(root,{recursive:true,force:true});}
});

test('changes in existing unlisted discovery sources invalidate flow reuse and legacy records require reanalysis',async()=>{
  const root=await fixture();
  try {
    await writeFile(join(root,'src/other.ts'),'export const other = true;');
    const saved=await saveProjectAnalysis(root,process.cwd(),{expectedHash:null,record:{kind:'flow',data:flow()}});
    await writeFile(join(root,'src/other.ts'),'import {save} from "./save"; save("new caller");');
    const found=await getProjectAnalysis(root,process.cwd(),{ids:['save']});
    assert.match(JSON.stringify(found.records[0]!.freshness),/Changed discovery source: src\/other.ts/);
    assert.match((await validateAnalysisReferences(root,process.cwd(),[{kind:'flow',id:'save',hash:saved.hash,issueIds:['edit']}],true)).join(),/Changed discovery source/);
    const path=join(root,'.frontend-system/analysis/flow/save.json');
    const legacy=JSON.parse(await readFile(path,'utf8'));delete legacy.discoveryHashes;legacy.version=1;
    await writeFile(path,JSON.stringify(legacy));
    assert.match(JSON.stringify((await getProjectAnalysis(root,process.cwd(),{ids:['save']})).records[0]!.freshness),/Legacy analysis/);
  } finally {await rm(root,{recursive:true,force:true});}
});

test('one paginated request shares inventory/content reads, without reusing cached hashes across calls',async()=>{
  const root=await fixture();
  try {
    await writeFile(join(root,'src/large.json'),'"'+'x'.repeat(600_000)+'"');
    for (const id of ['a','b','c']) {const data=flow();data.id=id;await saveProjectAnalysis(root,process.cwd(),{expectedHash:null,record:{kind:'flow',data}});}
    const page=await getProjectAnalysis(root,process.cwd(),{kind:'flow',limit:2});
    assert.equal(page.records.length,2);assert.equal(page.nextOffset,2);
    assert.equal(page.scan.inventoryReads,1);assert.equal(page.scan.sourceReads,4);
    assert.ok(page.scan.sourceBytes>600_000,'Large discovery files are hashed without the AI source-read budget');
    const empty=await getProjectAnalysis(root,process.cwd(),{kind:'flow',offset:3});
    assert.equal(empty.scan.sourceReads,0);assert.equal(empty.scan.inventoryReads,0);
    await writeFile(join(root,'src/caller.ts'),'save("changed after first tool call");');
    const again=await getProjectAnalysis(root,process.cwd(),{kind:'flow',limit:2});
    assert.ok(again.records.every(row=>(row.freshness as {status:string}).status==='stale'));
  } finally {await rm(root,{recursive:true,force:true});}
});

test('flow citations must start on the declared line, not merely occur nearby',async()=>{
  const root=await fixture();
  try {
    await writeFile(join(root,'src/save.ts'),'// preceding line\nexport const save = (value: string) => value;');
    const data=flow();data.evidence.save!.line=1;
    await assert.rejects(saveProjectAnalysis(root,process.cwd(),{expectedHash:null,record:{kind:'flow',data}}),/declared line.*starts at line\(s\): 2/);
    data.evidence.save!.line=2;
    assert.equal((await saveProjectAnalysis(root,process.cwd(),{expectedHash:null,record:{kind:'flow',data}})).status,'saved');
  } finally {await rm(root,{recursive:true,force:true});}
});
