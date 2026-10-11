import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp, mkdir, readFile, rm, symlink, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import test from 'node:test';
import {flowSchema, type ProjectFlow} from '../src/application/flow-schema.js';
import {saveProjectAnalysis, getProjectAnalysis, validateAnalysisReferences} from '../src/application/project-flows.js';
import {renderProjectFlow} from '../src/application/render-project-flow.js';
import {loadFlowDesignImages} from '../src/application/flow-design.js';

const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/f5sAAAAASUVORK5CYII=','base64');
const hash=(data:Buffer)=>createHash('sha256').update(data).digest('hex');
async function fixture() {
  const root=await mkdtemp(join(tmpdir(),'fs-design-')); await mkdir(join(root,'design'));
  await writeFile(join(root,'design/page.png'),png);
  await writeFile(join(root,'design/answers.md'),'Use this page mockup.\nNow detail the components and events.');
  const flow=flowSchema.parse({id:'page-design',title:'Design',basis:'proposed',summary:'Page mockup review',
    scope:{files:['design/page.png','design/answers.md'],discoveryRoots:['design']},
    evidence:{confirm:{path:'design/answers.md',quote:'Use this page mockup.'},detail:{path:'design/answers.md',quote:'Now detail the components and events.'}},
    nodes:[{id:'page',kind:'page',label:'EditorPage',evidence:[]}],edges:[],scenarios:[],
    design:{stage:'visual-review',screens:[{id:'editor',page:'page',title:'Editor',image:{path:'design/page.png',hash:hash(png),alt:'Test pixel, not a product design'}}]},
    limitations:['Test fixture, not a real user approval or designed page']});
  return {root,flow};
}
function detailed(flow:ProjectFlow) {
  const data=structuredClone(flow);data.design!.stage='detailed-design';data.design!.detailRequest='detail';
  data.design!.screens[0]!.confirmation={evidence:'confirm',imageHash:hash(png)};
  data.nodes.push({id:'form',kind:'component',label:'EditorForm',parent:'page',props:[],state:['value: string'],events:['onSubmit()'],lifecycle:[],evidence:[]});
  data.design!.screens[0]!.regions=[{node:'form',x:0,y:0,width:100,height:100}];
  data.edges=[{id:'save',from:'form',to:'form',kind:'write',label:'setValue(next)',evidence:[]}];
  data.scenarios=[{id:'edit',title:'Edit',entry:'form',event:'onChange',steps:[{edge:'save',effect:'value changes'}],outcome:'New input',limitations:[]}];
  data.design!.quality=[{category:'accessibility',requirement:'Input has an accessible label',verification:'Inspect accessible name and tab order',nodes:['form']}];
  return data;
}

test('visual review embeds images offline, preserves lean JSON and gates detailed design and plan binding',async()=>{
  const {root,flow}=await fixture();
  try {
    const save=(data:ProjectFlow,expectedHash:string|null=null)=>saveProjectAnalysis(root,process.cwd(),{expectedHash,record:{kind:'flow',data}});
    const saved=await save(flow);
    const summary=(await getProjectAnalysis(root,process.cwd(),{ids:[flow.id]})).records[0]!;
    assert.equal((summary.design as {stage:string}).stage,'visual-review');assert.equal(summary.data,undefined);
    const output=await renderProjectFlow(root,process.cwd(),{id:flow.id,expectedHash:saved.hash,allowUnverified:true});
    const html=await readFile(output.path,'utf8');assert.match(html,/data:image\/png;base64,/);assert.ok(!html.includes('id="scenario"'));
    new Function(html.match(/<script>([\s\S]*?)<\/script>/)![1]!);
    const record=JSON.stringify(await getProjectAnalysis(root,process.cwd(),{ids:[flow.id],full:true}));assert.ok(!record.includes('base64'));
    const ref={kind:'flow' as const,id:flow.id,hash:saved.hash,issueIds:['edit']};
    assert.match((await validateAnalysisReferences(root,process.cwd(),[ref],true)).join(),/not an implementation contract/);
    await assert.rejects(renderProjectFlow(root,process.cwd(),{id:flow.id,expectedHash:saved.hash,format:'mermaid',allowUnverified:true}),/requires HTML/);
    const next=detailed(flow);const noRequest=structuredClone(next);delete noRequest.design!.detailRequest;
    await assert.rejects(save(noRequest,saved.hash),/user request evidence/);
    const wrongImage=structuredClone(next);wrongImage.design!.screens[0]!.confirmation!.imageHash='0'.repeat(64);
    await assert.rejects(save(wrongImage,saved.hash),/exact image hash/);
    const wrongRegion=structuredClone(next);wrongRegion.design!.screens[0]!.regions[0]!.x=50;
    await assert.rejects(save(wrongRegion,saved.hash),/fit its image/);
    const nextSaved=await save(next,saved.hash);
    assert.deepEqual(await validateAnalysisReferences(root,process.cwd(),[{...ref,hash:nextSaved.hash}],true),[]);
    const detail=await renderProjectFlow(root,process.cwd(),{id:next.id,expectedHash:nextSaved.hash,allowUnverified:true});
    const detailHtml=await readFile(detail.path,'utf8');assert.match(detailHtml,/href="#flow-node-form"/);assert.match(detailHtml,/Input has an accessible label/);
    new Function(detailHtml.match(/<script>([\s\S]*?)<\/script>/)![1]!);
    await writeFile(join(root,'design/page.png'),Buffer.concat([png,Buffer.from('changed')]));
    assert.match((await validateAnalysisReferences(root,process.cwd(),[{...ref,hash:nextSaved.hash}],false)).join(),/image hash changed/,'Mockup bytes stay pinned even when implementation source changes are expected');
    assert.match(JSON.stringify(await getProjectAnalysis(root,process.cwd(),{ids:[flow.id]})),/Changed dependency/);
    await assert.rejects(renderProjectFlow(root,process.cwd(),{id:next.id,expectedHash:nextSaved.hash,allowUnverified:true}),/image hash changed/);
    assert.equal(await readFile(detail.path,'utf8'),detailHtml,'Invalid images must not overwrite the last artifact');
  } finally {await rm(root,{recursive:true,force:true});}
});

test('image input rejects active content, outside symlinks, oversized files and premature component design',async()=>{
  const {root,flow}=await fixture();const outside=await mkdtemp(join(tmpdir(),'fs-image-outside-'));
  try {
    const asset=flow.design!.screens[0]!.image;
    const svg=Buffer.from('<svg onload="alert(1)"></svg>');await writeFile(join(root,asset.path),svg);asset.hash=hash(svg);
    await assert.rejects(loadFlowDesignImages(root,flow),/raster files/);
    await rm(join(root,asset.path));await writeFile(join(outside,'secret.png'),png);await symlink(join(outside,'secret.png'),join(root,asset.path));asset.hash=hash(png);
    await assert.rejects(loadFlowDesignImages(root,flow),/outside project source scope/);
    await rm(join(root,asset.path));await writeFile(join(root,asset.path),Buffer.alloc(8*1024*1024+1));
    await assert.rejects(loadFlowDesignImages(root,flow),/8 MiB/);
    const large=Buffer.concat([png,Buffer.alloc(8*1024*1024-png.length)]);
    await writeFile(join(root,asset.path),large);asset.hash=hash(large);
    const repeated=structuredClone(flow);
    repeated.design!.screens=Array.from({length:4},(_,i)=>({...repeated.design!.screens[0]!,id:`screen-${i}`}));
    await assert.rejects(loadFlowDesignImages(root,repeated),/24 MiB/,'Repeated image embeddings also count toward the HTML budget');
    await writeFile(join(root,asset.path),png);
    asset.hash=hash(png);
    flow.nodes[0]!.state=['pending: boolean'];
    await assert.rejects(saveProjectAnalysis(root,process.cwd(),{expectedHash:null,record:{kind:'flow',data:flow}}),/pages and mockups only/);
    assert.equal(flowSchema.safeParse({...flow,basis:'observed'}).success,false);
    assert.equal(flowSchema.safeParse({...flow,design:undefined}).success,false,'Old flows still require a scenario');
  } finally {await rm(root,{recursive:true,force:true});await rm(outside,{recursive:true,force:true});}
});
