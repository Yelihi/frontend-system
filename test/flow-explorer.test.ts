import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {projectFlowView,prepareFlowExplorer} from '../src/application/page-flow-view.js';
import {saveProjectAnalysis,readPinnedFlow,getProjectAnalysis} from '../src/application/project-flows.js';
import {renderProjectFlow} from '../src/application/render-project-flow.js';
import {searchDesign} from './flow-contract-fixture.js';

const hash='1'.repeat(64);
test('canonical explorer projects unchanged contracts, branches and wireframes without a second authored graph',async()=>{
  const root=await mkdtemp(join(tmpdir(),'fs-flow-view-'));
  try {
    const flow=searchDesign();await writeFile(join(root,'requirements.md'),'Keep the selected filter on failure.');
    const saved=await saveProjectAnalysis(root,process.cwd(),{expectedHash:null,record:{kind:'flow',data:flow}});
    const view=projectFlowView(flow,saved.hash);
    assert.equal(view.nodes.find(n=>n.sourceId==='search')?.architecture?.layer,'application');
    assert.equal(view.scenarios[1]!.steps[1]!.changes![0]!.after,'error');
    assert.equal(view.scenarios[1]!.testCases[0]!.sourceId,'case-error');
    const result=await renderProjectFlow(root,process.cwd(),{id:flow.id,expectedHash:saved.hash,allowUnverified:true});
    assert.deepEqual(result.captureCoverage,{status:'complete',expected:0,captured:0,missing:[]});
    const html=await readFile(result.path,'utf8');
    new Function(html.match(/<script>([\s\S]*?)<\/script>/)![1]!);
    const model=JSON.parse(await readFile(result.modelPath!,'utf8'));
    assert.equal(model.scenarios[1].sourceId,'error');assert.equal(model.nodes.find((n:{sourceId:string})=>n.sourceId==='filter').contracts[0].name,'SearchFilterProps');
    assert.equal(model.pages[0].sceneDetails.length,4);
    assert.ok(!JSON.stringify(model).includes('data:image'));
    const again=await prepareFlowExplorer(root,process.cwd(),await readPinnedFlow(root,flow.id,saved.hash),saved.hash,flow.id);
    assert.equal(createHash('sha256').update(again.html).digest('hex'),createHash('sha256').update(html).digest('hex'));
    await mkdir(join(root,'design/fs/captures'),{recursive:true});
    await writeFile(join(root,`design/fs/${flow.id}.captures.json`),JSON.stringify({flowHash:saved.hash,screens:[]}));
    await writeFile(join(root,'design/fs/captures/loading.png'),'capture artifact');
    const current=await getProjectAnalysis(root,process.cwd(),{kind:'flow',ids:[flow.id]});
    assert.equal((current.records[0]!.freshness as {status:string}).status,'current','Capturing must not invalidate its source flow');
    await writeFile(join(root,'new-handler.ts'),'export function newHandler() {}');
    const stale=await getProjectAnalysis(root,process.cwd(),{kind:'flow',ids:[flow.id]});
    assert.notEqual((stale.records[0]!.freshness as {status:string}).status,'current','New implementation code must still invalidate analysis');
  }finally{await rm(root,{recursive:true,force:true});}
});

test('an early draft renders its page without inventing a scenario',async()=>{
  const root=await mkdtemp(join(tmpdir(),'fs-draft-'));
  try {
    const flow=searchDesign();flow.designState='draft';flow.scenarios=[];flow.testCases=[];flow.checks=[];
    const output=await prepareFlowExplorer(root,process.cwd(),flow,hash,'draft');
    assert.equal((output.model as {scenarios:unknown[]}).scenarios.length,0);
    new Function(output.html.match(/<script>([\s\S]*?)<\/script>/)![1]!);
  }finally{await rm(root,{recursive:true,force:true});}
});

test('observed captures stay distinct from wireframes and reject stale images and baseline commits',async()=>{
  const root=await mkdtemp(join(tmpdir(),'fs-capture-'));
  try {
    const flow=searchDesign();flow.basis='observed';delete flow.designState;
    for(const page of flow.pages!)for(const scene of page.scenes)delete scene.blocks;
    flow.scope.snapshot={baseRef:'main',expectedCommit:'a'.repeat(40)};
    const noCapture=await prepareFlowExplorer(root,process.cwd(),flow,hash,'observed');
    assert.equal(noCapture.coverage.missing.length,4);
    await mkdir(join(root,'design/fs'),{recursive:true});
    const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/f5sAAAAASUVORK5CYII=','base64');
    await writeFile(join(root,'design/fs/test.png'),png);
    const manifest={flowHash:hash,sourceCommit:'a'.repeat(40),screens:[{page:'page',scene:'loading',kind:'capture',path:'design/fs/test.png',hash:createHash('sha256').update(png).digest('hex'),url:'http://localhost/resources',capturedAt:new Date().toISOString(),width:1,height:1,regions:[]}]};
    const save=()=>writeFile(join(root,`design/fs/${flow.id}.captures.json`),JSON.stringify(manifest));await save();
    const captured=await prepareFlowExplorer(root,process.cwd(),flow,hash,'observed');assert.equal(captured.coverage.captured,1);assert.equal(captured.coverage.expected,4);
    assert.ok(captured.html.includes('data:image/png;base64,'));assert.ok(!JSON.stringify(captured.model).includes('data:image'));
    manifest.sourceCommit='b'.repeat(40);await save();await assert.rejects(prepareFlowExplorer(root,process.cwd(),flow,hash,'observed'),/commit differs/);
    manifest.sourceCommit='a'.repeat(40);manifest.screens[0]!.hash='0'.repeat(64);await save();await assert.rejects(prepareFlowExplorer(root,process.cwd(),flow,hash,'observed'),/hash changed/);
  }finally{await rm(root,{recursive:true,force:true});}
});
