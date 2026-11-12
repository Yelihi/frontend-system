import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,copyFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {flowSchema} from '../src/application/flow-schema.js';
import {validateStructuredFlow} from '../src/application/flow-contracts.js';
import {projectFlowView} from '../src/application/page-flow-view.js';
import {saveProjectAnalysis,getProjectAnalysis} from '../src/application/project-flows.js';
import {renderProjectFlow} from '../src/application/render-project-flow.js';
const fixture=async()=>flowSchema.parse(JSON.parse(await readFile('test/fixtures/flow-review/echo.json','utf8')));

test('review keeps one nine-step flow and validates linked fields, contracts, rules and tests',async()=>{
 const flow=await fixture();validateStructuredFlow(flow);
 assert.equal(flow.scenarios[0]!.steps.length,9);assert.equal(flow.testCases!.length,7);assert.equal(flow.invariants.length,6);
 const projected=projectFlowView(flow,'a'.repeat(64));assert.equal(projected.review!.scenarios[0]!.steps.length,9);
 assert.deepEqual(flowSchema.parse(JSON.parse(JSON.stringify(flow))),flow,'new metadata survives round trip');
 const {flowToMermaid}=await import('../src/application/flow-view.js');
 assert.ok(flowToMermaid(flow,flow.scenarios[0]!.id).includes('saveStarted'),'Mermaid retains secondary calls');
 assert.equal(flow.review!.fields.find(f=>f.name==='saving')!.fieldKind,'state');
 for(const [change,pattern] of [
  [(f:typeof flow)=>{f.review!.fields[0]!.ownerNodeId='missing';},/field owner/],
  [(f:typeof flow)=>{f.review!.fields.push(f.review!.fields[0]!);},/duplicate field/],
  [(f:typeof flow)=>{f.nodes[0]!.review!.contractIds=['missing'];},/contract/],
  [(f:typeof flow)=>{f.scenarios[0]!.steps[0]!.review!.testIds=['missing'];},/test/],
  [(f:typeof flow)=>{f.review!.screens[0]!.blocks[0]!.nodeId='missing';},/screen owner/],
  [(f:typeof flow)=>{f.scenarios[0]!.steps[0]!.review!.changes[0]!.changeKind='preserved';},/changeKind/],
 ] as const){const copy=structuredClone(flow);change(copy);assert.throws(()=>validateStructuredFlow(copy),pattern);}
 assert.throws(()=>flowSchema.parse({...flow,review:{...flow.review,version:2}}),/Invalid input/);
 assert.throws(()=>flowSchema.parse({...flow,review:{...flow.review,unrecognized:true}}),/Unrecognized/);
});

test('real save/read/render path preserves review and rejects stale exports',async()=>{
 const root=await mkdtemp(join(tmpdir(),'fs-review-'));
 try{
  await copyFile('test/fixtures/flow-review/source-evidence.txt',join(root,'source-evidence.txt'));
  const flow=await fixture(),saved=await saveProjectAnalysis(root,process.cwd(),{expectedHash:null,record:{kind:'flow',data:flow}});
  const read=(await getProjectAnalysis(root,process.cwd(),{kind:'flow',ids:[flow.id],full:true})).records[0]!;
  assert.deepEqual(flowSchema.parse(read.data).review,flow.review);
  await assert.rejects(renderProjectFlow(root,process.cwd(),{id:flow.id,expectedHash:saved.hash}),/Current observed/);
  const out=await renderProjectFlow(root,process.cwd(),{id:flow.id,expectedHash:saved.hash,allowUnverified:true});
  const html=await readFile(out.path,'utf8');assert.match(html,/fs-review-data/);assert.match(html,/data-confirm/);assert.match(html,/fs-review:/);
  const {execFile}=await import('node:child_process'),{promisify}=await import('node:util');
  const cli=await promisify(execFile)(process.execPath,['dist/src/cli.js','flow-render',root,flow.id,'--expected-hash',saved.hash,'--allow-unverified']);
  assert.ok('hash' in out);
  assert.equal(JSON.parse(cli.stdout).hash,out.hash,'CLI and shared render function produce the same review');
  const model=JSON.parse(await readFile(out.modelPath!,'utf8'));assert.equal(model.review.contracts.length,5);
  assert.equal(model.review.tests.every((t:{execution?:string})=>!t.execution),true,'renderer cannot invent executed tests');
  const mermaid=await renderProjectFlow(root,process.cwd(),{id:flow.id,expectedHash:saved.hash,allowUnverified:true,format:'mermaid'});assert.match(await readFile(mermaid.path,'utf8'),/flowchart/);
 }finally{await rm(root,{recursive:true,force:true});}
});

test('review projection generalizes to a different tool and escapes executable signatures',async()=>{
 const flow=flowSchema.parse(JSON.parse(await readFile('test/fixtures/flow-review/upload.json','utf8')));validateStructuredFlow(flow);
 const projected=projectFlowView(flow,'b'.repeat(64));assert.equal(projected.review!.tests[0]!.runner,'Vitest');
 assert.equal(projected.review!.nodes.filter(n=>n.review?.changeKind==='added').length,1);
 const root=await mkdtemp(join(tmpdir(),'fs-upload-review-'));
 try{await copyFile('test/fixtures/flow-review/source-evidence.txt',join(root,'source-evidence.txt'));
  const saved=await saveProjectAnalysis(root,process.cwd(),{expectedHash:null,record:{kind:'flow',data:flow}});
  const out=await renderProjectFlow(root,process.cwd(),{id:flow.id,expectedHash:saved.hash,allowUnverified:true});
  const html=await readFile(out.path,'utf8');assert.ok(!html.includes('</script><script>window.injected'));
  assert.ok(html.includes('\\u003c/script>'),'data must not terminate the JSON script');
 }finally{await rm(root,{recursive:true,force:true});}
});

test('aggregate views preserve isolated canonical review models and shared identities',async()=>{
 const {composeProjectViews}=await import('../src/application/project-visualization.js');
 const flow=await fixture(),second=flowSchema.parse({...flow,id:'second-review'});
 const parts=[flow,second].map(f=>({flow:f,spec:projectFlowView(f,(f===flow?'a':'b').repeat(64)),screens:{}}));
 const result=composeProjectViews(parts,{baseRef:'main',expectedCommit:'a'.repeat(40)},'c'.repeat(64));
 assert.equal(result.spec.reviewFlows!.length,2);assert.notEqual(result.spec.reviewFlows![0]!.flowHash,result.spec.reviewFlows![1]!.flowHash);
 assert.equal(result.spec.reviewFlows![0]!.scenarios[0]!.steps.length,9);
 assert.equal(new Set(result.spec.nodes.map(n=>n.id)).size,result.spec.nodes.length);
 const {pathToFileURL}=await import('node:url');
 const {prepareExplorer}=await import(pathToFileURL(join(process.cwd(),'skills/fs-plan-visualize/scripts/renderer.mjs')).href);
 const rendered=await prepareExplorer(result.spec,{flowHash:'c'.repeat(64),screens:{}});
 assert.match(rendered.html,/<iframe title="프로젝트 흐름 검토"/);assert.match(rendered.html,/select.onchange/);
 new Function(rendered.html.match(/<script>([\s\S]*?)<\/script>/)![1]!);

});

test('orthogonal geometry avoids intervening cards and retains directional endpoints',async()=>{
 const {runInNewContext}=await import('node:vm');
 const script=await readFile('skills/fs-plan-visualize/scripts/review-edges.js','utf8');
 const route=runInNewContext(script+';reviewRoute') as (a:unknown,b:unknown,boxes:unknown[],lane:number)=>{points:number[][];path:string}|null;
 const a={left:10,right:110,top:10,bottom:110,width:100,height:100},b={...a,top:300,bottom:400},middle={...a,top:150,bottom:250};
 for(let lane=0;lane<9;lane++){
  const output=route(a,b,[a,middle,b],lane)!;assert.ok(output);assert.equal(output.points[0]![0],110);assert.equal(output.points.at(-1)![0],110);assert.ok(output.points[0]![1]!>10&&output.points[0]![1]!<110);assert.ok(output.points.at(-1)![1]!>300&&output.points.at(-1)![1]!<400);
  assert.ok(output.points.slice(1,-1).every(p=>p[0]!>=110),'same-column calls use an external rail');
 }
});
