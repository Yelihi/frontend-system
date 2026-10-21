import {readFile,realpath} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import * as z from 'zod/v4';
import {analysisId, type ProjectFlow} from './flow-schema.js';
import {sha256} from './policy.js';
import {digest} from './workflow-store.js';
import {prepareFlowExplorer, projectFlowView} from './page-flow-view.js';
import {readPinnedFlow} from './project-flows.js';

export const flowReceipt = z.object({id:analysisId,hash:sha256});
export const projectViewSchema = z.object({version:z.literal(1), baseline:z.object({baseRef:z.string(),expectedCommit:z.string().regex(/^[a-f0-9]{40}$/)}),
  status:z.enum(['partial','complete']), flows:z.array(flowReceipt),
});
export type ProjectView = z.infer<typeof projectViewSchema>;
export type FlowReceipt = z.infer<typeof flowReceipt>;
export type ViewFlow = {ref:FlowReceipt;flow:ProjectFlow};

export async function readViewRecord(root:string,path:string){
  const base=await realpath(root),expected=resolve(base,'.frontend-system',path);
  if(!expected.startsWith(join(base,'.frontend-system')+'/')||await realpath(expected)!==expected)throw new Error('Project records cannot traverse symlinks');
  return readFile(expected,'utf8');
}

// project.md is the authoritative pointer; historical manifests are immutable.
export async function readProjectView(root:string):Promise<{hash:string;data:ProjectView}|null> {
  let document:string;
  try { document=await readViewRecord(root,'project.md'); }
  catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return null;throw error;}
  const hash=/<!-- fs-project-view ([a-f0-9]{64}) -->/.exec(document)?.[1];
  if(!hash)return null;
  const body=await readViewRecord(root,`diagrams/baseline-${hash}.json`);
  if(digest(body)!==hash)throw new Error('Project visualization manifest changed');
  return {hash,data:projectViewSchema.parse(JSON.parse(body))};
}

export async function viewFlows(root:string, refs:FlowReceipt[]):Promise<ViewFlow[]> {
  return Promise.all(refs.map(async ref=>({ref,flow:await readPinnedFlow(root,ref.id,ref.hash)})));
}

const encoded=(id:string)=>'v'+Buffer.from(id).toString('hex');
type Spec=ReturnType<typeof projectFlowView> & {captures?:Array<{page:string;scene:string;[key:string]:unknown}>;blocked?:Array<{page:string;scene:string;reason:string}>;sources?:Array<{flowId:string;hash:string;sourceCommit?:string}>};
type Screens=Awaited<ReturnType<typeof prepareFlowExplorer>>['screens'];

/** Flow-local edges/scenes retain their namespace; only explicitly shared entities coalesce. */
export function composeProjectViews(parts:Array<{flow:ProjectFlow;spec:Spec;screens:Screens}>, baseline:ProjectView['baseline'], hash:string) {
  const result:Spec={schemaVersion:'page-flow-2',canonical:true,title:'프로젝트 흐름',basis:parts.some(p=>p.flow.basis==='proposed')?'proposed':'observed',
    baseline:{commit:baseline.expectedCommit,flow:{id:'project',hash}},designState:null,
    nodes:[],instances:[],pages:[],relations:[],navigation:[],scenarios:[],knowledge:[],checks:[],captures:[],blocked:[],sources:[]};
  const screens:Screens={};
  for(const {flow,spec,screens:assets} of parts){
    const nodeIds=new Map(flow.nodes.map(n=>[encoded(n.id),encoded(n.entityId?`entity:${n.entityId}`:`${flow.id}:node:${n.id}`)]));
    const node=(id:string)=>{const found=nodeIds.get(id);if(!found)throw new Error(`Unknown project node: ${flow.id}/${id}`);return found;};
    const scoped=(id:string)=>encoded(`${flow.id}:${id}`);
    const instance=(id:string)=>{
      const item=spec.instances.find(i=>i.id===id);if(!item)throw new Error('Unknown component instance');
      return encoded(`instance:${node(item.node)}:${node(item.page)}`);
    };
    result.sources!.push({flowId:flow.id,hash:spec.baseline.flow.hash,...(flow.scope.snapshot?{sourceCommit:flow.scope.snapshot.expectedCommit}:{})});
    result.captures!.push(...(spec.captures??[]).map(c=>({...c,page:node(c.page),scene:scoped(c.scene),sourceCommit:flow.scope.snapshot?.expectedCommit})));
    result.blocked!.push(...(spec.blocked??[]).map(c=>({...c,page:node(c.page),scene:scoped(c.scene)})));
    for(const n of spec.nodes){
      const item={...n,id:node(n.id),parent:n.parent?node(n.parent):null};
      const existing=result.nodes.find(n=>n.id===item.id);
      if(existing){
        const contract=(n:typeof item)=>JSON.stringify({kind:n.kind,parent:n.parent,props:n.props,state:n.state,events:n.events,lifecycle:n.lifecycle,architecture:n.architecture,
          contracts:n.contracts.map(({kind,name,path,signature})=>({kind,name,path,signature}))});
        if(contract(existing)!==contract(item))throw new Error(`Shared entity contract conflict: ${flow.id}/${n.sourceId}`);
        existing.evidence.push(...item.evidence);
      }else result.nodes.push(item);
    }
    for(const i of spec.instances)if(!result.instances.some(existing=>existing.id===instance(i.id)))
      result.instances.push({...i,id:instance(i.id),node:node(i.node),page:node(i.page),...(i.parentInstance?{parentInstance:instance(i.parentInstance)}:{})});
    for(const p of spec.pages){
      const item={...p,id:node(p.id),scenes:p.scenes.map(scoped),sceneDetails:p.sceneDetails.map(s=>({...s,id:scoped(s.id),blocks:s.blocks?.map(b=>({...b,node:node(b.node)}))}))};
      const existing=result.pages.find(p=>p.id===item.id);
      if(existing){
        if(existing.route!==item.route)throw new Error(`Shared page route conflict: ${item.route}`);
        existing.scenes.push(...item.scenes);existing.sceneDetails.push(...item.sceneDetails);
      }else result.pages.push(item);
    }
    result.relations.push(...spec.relations.map(e=>({...e,id:scoped(e.id),from:node(e.from),to:node(e.to)})));
    result.navigation.push(...spec.navigation.map(e=>({...e,id:scoped(e.id),from:node(e.from),to:node(e.to)})));
    result.scenarios.push(...spec.scenarios.map(s=>({...s,id:scoped(s.id),steps:s.steps.map(step=>({...step,id:scoped(step.id),edgeId:scoped(step.edgeId),
      fromNode:node(step.fromNode),toNode:node(step.toNode),page:node(step.page),scene:scoped(step.scene),
      views:step.views.map(v=>({page:node(v.page),scene:scoped(v.scene)})),changes:step.changes?.map(c=>({...c,ownerNode:node(c.ownerNode)}))})),
      testCases:s.testCases.map(t=>({...t,id:scoped(t.id)}))})));
    result.knowledge.push(...spec.knowledge.map(k=>({...k,id:scoped(k.id),nodes:k.nodes.map(node),edges:k.edges.map(scoped),scenarios:k.scenarios.map(scoped)})));
    result.checks.push(...spec.checks.map(c=>({...c,id:scoped(c.id),nodes:c.nodes.map(node),scenarios:c.scenarios.map(scoped)})));
    for(const [key,asset] of Object.entries(assets)){
      const [page,scene]=key.split(':') as [string,string];
      screens[`${node(page)}:${scoped(scene)}`]={...asset,regions:asset.regions.map(r=>({...r,instance:instance(r.instance)}))};
    }
  }
  return {spec:result,screens};
}

export async function prepareProjectView(root:string,systemRoot:string,index:ProjectView, flows:ViewFlow[], outputName?:string) {
  const hash=digest(JSON.stringify(index));
  const parts=[];
  for(const {flow,ref} of flows)if(flow.pages?.length){
    const prepared=await prepareFlowExplorer(root,systemRoot,flow,ref.hash,flow.id);
    parts.push({flow,spec:prepared.spec,screens:prepared.screens});
  }
  if(!parts.length)return {html:'<!doctype html><meta charset="utf-8"><p>페이지 구조가 아직 기록되지 않았습니다. 기존 흐름별 자료는 project.md에서 확인하세요.</p>',model:null,coverage:null};
  const {spec,screens}=composeProjectViews(parts,index.baseline,hash);
  const {prepareExplorer}=await import(pathToFileURL(join(systemRoot,'skills/fs-plan-visualize/scripts/renderer.mjs')).href);
  const result=await prepareExplorer({...spec,modelFile:`${outputName??`project-view-${hash}`}.model.json`},{flowHash:hash,screens});
  return {html:result.html as string,model:result.spec as unknown,coverage:result.captureCoverage as unknown};
}

const escape=(text:string)=>text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
export function projectViewShell(current:string, issues:Array<{id:string;title:string;path?:string;reason?:string}>, selected?:string,status:ProjectView['status']='complete') {
  const options=[{id:'current',title:'현재 프로젝트',path:current},...issues];
  const active=options.find(o=>o.id===selected&&o.path)??options[0]!;
  return `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>FS 프로젝트 흐름</title>
<style>html,body{height:100%;margin:0;font:15px system-ui;color:#20252b;background:#fafafa}header{height:56px;display:flex;align-items:center;gap:18px;padding:0 20px;border-bottom:1px solid #ddd;box-sizing:border-box}select{max-width:70vw;padding:6px 12px;border:1px solid #ccc;border-radius:6px;background:white;font:inherit}iframe{width:100%;height:calc(100% - 56px);border:0}option:disabled{color:#777}</style>
<header><strong>프로젝트 흐름</strong>${status==='partial'?'<span>부분 분석</span>':''}<label for="view">보기</label><select id="view">${options.map(o=>`<option value="${escape(o.path??'')}" ${o.id===active.id?'selected':''} ${o.path?'':'disabled'}>${escape(o.title+(o.reason?' · '+o.reason:''))}</option>`).join('')}</select></header>
<iframe title="라우트와 이벤트 흐름" src="${escape(active.path!)}"></iframe><script>document.querySelector('select').addEventListener('change',e=>{document.querySelector('iframe').src=e.target.value});</script></html>`;
}
