import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {browserLayout} from './layout.mjs';
import {addPlannedFlows,modelHash} from './compose.mjs';
const root=new URL('./',import.meta.url);
const spec=JSON.parse(await readFile(new URL('spec.json',root)));
const temp=await mkdtemp(join(tmpdir(),'fs-view-check-'));
const draft=join(temp,'input.json');
const run=()=>execFileSync('node',[new URL('build.mjs',root).pathname,draft,temp],{stdio:'pipe'});
await writeFile(draft,JSON.stringify(spec));run();const first=await readFile(join(temp,'index.html'),'utf8');run();assert.equal(await readFile(join(temp,'index.html'),'utf8'),first);
const rendered=JSON.parse(first.match(/const spec=(.*);/)[1]);
assert.deepEqual(new Set(rendered.scenarios.find(s=>s.id==='reorder-success').pages),new Set(['search','collection']));
assert.deepEqual(rendered.scenarios.find(s=>s.id==='search-cleanup').pages,['search']);
assert.equal(rendered.scenarios.find(s=>s.id==='search-cleanup').category,'lifecycle');
const original=structuredClone(spec);
const addition={id:'extra',baseHash:modelHash(spec),scenarios:[{...spec.scenarios[0],id:'extra',basis:'observed'}]};
addition.navigation=[{id:'planned-navigation',from:'search',to:'collection',label:'새 진입점',condition:'선택 시',basis:'observed'}];
const combined=addPlannedFlows(spec,addition);
assert.equal(combined.navigation.at(-1).basis,'proposed');
assert.deepEqual(combined.navigation.slice(0,-1),spec.navigation);
assert.deepEqual(spec,original,'Baseline mutated');
assert.deepEqual(combined.scenarios.slice(0,-1),spec.scenarios);
assert.equal(combined.scenarios.at(-1).basis,'proposed');
await writeFile(draft,JSON.stringify(combined));run();
const broken=structuredClone(addition);broken.scenarios[0].steps[0].toNode='missing';
await writeFile(draft,JSON.stringify(addPlannedFlows(spec,broken)));assert.throws(run,'Dangling planned edge accepted');
const observed=JSON.parse(await readFile(new URL('observed/view-model.json',root)));
const sourceFlow=JSON.parse(await readFile(new URL('observed/flow.json',root)));
assert.ok(sourceFlow.scenarios.every(s=>observed.scenarios.some(v=>v.id===s.id)),'Saved source flow was omitted');
assert.equal(observed.scenarios.find(s=>s.id==='initial').category,'lifecycle');
assert.throws(()=>addPlannedFlows({...spec,title:'changed'},addition),/baseline changed/);
assert.throws(()=>addPlannedFlows(spec,{...addition,scenarios:[spec.scenarios[0]]}),/replace/);
assert.throws(()=>addPlannedFlows(spec,{...addition,nodes:[spec.nodes[0]]}),/replace/);
assert.throws(()=>addPlannedFlows(spec,{...addition,navigation:[spec.navigation[0]]}),/replace/);
const failures=[];
for(const data of [spec,{...spec,pages:Array.from({length:8},(_,i)=>({id:'page-'+i})),nodes:Array.from({length:30},(_,i)=>({id:'node-'+i,environment:i%2?'app':'backend'})),browserApis:Array.from({length:6},()=>({name:'sample'}))}]) {
 const layout=browserLayout(data),right=layout.shell.x+layout.shell.width;
 assert.equal(layout.content.x+layout.content.width,layout.sidebar.x,'Content must end at dock divider');
 assert.ok(layout.frames.every(f=>f.x>=layout.content.x&&f.x+f.width<=layout.sidebar.x),'Page enters DevTools');
 for(const node of data.nodes.filter(n=>n.environment)) {
  const rect=layout.placements[node.id];
  assert.ok(rect.y+108<=layout.height);
  assert.ok(node.environment==='app'?rect.x+rect.width<right:rect.x>right);
  if(node.environment==='app')assert.ok(rect.x>=layout.content.x&&rect.x+rect.width<=layout.sidebar.x&&rect.y+108<=layout.content.y+layout.content.height,'App resource must stay in page content');
  assert.ok(layout.frames.every(f=>rect.x>=f.x+f.width||rect.x+rect.width<=f.x||rect.y>=f.y+f.width*.75+50||rect.y+108<=f.y),'Resource covers a page');
 }
 assert.ok(layout.sidebar.browserY+70+(data.browserApis?.length??0)*90<=layout.height);
}
for(const [label,mutate] of [
 ['dangling navigation',s=>{s.navigation[0].to='missing';}],
 ['duplicate navigation',s=>{s.navigation.push(s.navigation[0]);}],
 ['missing route condition',s=>{delete s.navigation[0].condition;}],
 ['observed route without evidence',s=>{s.navigation[0].basis='observed';}],
 ['unsafe node ID',s=>{s.nodes[0].id='page\" onclick=\"x';}],
 ['unsafe scene ID',s=>{s.pages[0].scenes[0]='bad:scene';}],
 ['unknown category',s=>{s.scenarios[0].category='unknown';}],
 ['duplicate scenario',s=>{s.scenarios.push(s.scenarios[0]);}],
 ['empty steps',s=>{s.scenarios[0].steps=[];}],
 ['dangling node',s=>{s.scenarios[0].steps[0].toNode='missing';}],
 ['wrong instance',s=>{s.scenarios[0].steps[0].toInstance='preview-1';}],
 ['unknown scene',s=>{s.scenarios[0].steps[0].scene='missing';}],
 ['unknown state owner',s=>{s.scenarios[0].steps[0].changes=[{owner:'store',ownerNode:'missing',field:'count',before:0,after:1}];}],
 ['missing field',s=>{s.scenarios[0].steps[0].changes=[{owner:'store',ownerNode:'order-store',before:0,after:1}];}],
 ['missing after',s=>{s.scenarios[0].steps[0].changes=[{owner:'store',ownerNode:'order-store',field:'count',before:0}];}],
 ['missing environment',s=>{delete s.nodes.find(n=>n.id==='collection-cache').environment;}],
 ['wrong browser owner',s=>{s.browserApis[0].ownerNode='database';}],
 ['unowned impact',s=>{s.scenarios[0].steps.find(v=>v.effects).effects[0].toInstance='preview-1';}],
 ]){const changed=structuredClone(spec);mutate(changed);await writeFile(draft,JSON.stringify(changed));assert.throws(run,label);failures.push(label);}
console.log(JSON.stringify({deterministic:true,pageMembership:true,lifecycle:true,immutableAdditions:true,staleOrConflictingAdditionsRejected:4,rejected:failures}));
