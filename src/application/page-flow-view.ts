import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import * as z from 'zod/v4';
import {analysisId, type ProjectFlow} from './flow-schema.js';
import {localPath, sha256} from './policy.js';
import {projectFile, projectFileBytes} from './source-file.js';
import {contentHash, readReferenceIndex} from './knowledge/reference-index.js';
import {createHash} from 'node:crypto';

const viewId = (id: string) => 'v' + Buffer.from(id).toString('hex');
const captureSchema = z.object({flowHash: sha256, sourceCommit: z.string().regex(/^[a-f0-9]{40}$/).optional(),
  screens: z.array(z.object({page: analysisId, scene: analysisId, kind: z.enum(['capture','mockup']),
    path: localPath, hash: sha256, url: z.url().optional(), capturedAt: z.iso.datetime(),
    width: z.number().int().positive().max(20000), height: z.number().int().positive().max(20000),
    regions: z.array(z.object({node: analysisId, x:z.number().min(0).max(1), y:z.number().min(0).max(1),
      width:z.number().positive().max(1), height:z.number().positive().max(1)})).max(80),
  })).max(160), blocked: z.array(z.object({page:analysisId,scene:analysisId,reason:z.string().min(1)})).optional(),
});
export type FlowViewPlan = {approved: boolean; decisions: Array<{id:string; status:string; rationale:string}>};

export function projectFlowView(flow: ProjectFlow, flowHash: string, plan?: FlowViewPlan) {
  if (!flow.pages?.length) throw new Error('Page explorer needs structured pages');
  const ownerPage = (id: string): string | undefined => {
    let node=flow.nodes.find(n=>n.id===id);const seen=new Set<string>();
    while(node?.parent&&!seen.has(node.id)){seen.add(node.id);node=flow.nodes.find(n=>n.id===node!.parent);}
    return node?.kind==='page'?node.id:undefined;
  };
  const citations = (ids: string[]) => ids.map(id=>flow.evidence[id]);
  return {
    schemaVersion:'page-flow-2',canonical:true,title:flow.title,basis:flow.basis,
    baseline:{commit:flow.scope.snapshot?.expectedCommit,flow:{id:flow.id,hash:flowHash}},
    designState:flow.designState??null,
    nodes:flow.nodes.map(node=>({id:viewId(node.id),sourceId:node.id,kind:node.kind,name:node.label,
      parent:node.parent?viewId(node.parent):null,props:node.props,state:node.state,events:node.events,lifecycle:node.lifecycle,
      signature:node.contracts?.map(c=>`${c.path}\n${c.signature}`).join('\n\n')??'',contracts:node.contracts??[],
      architecture:node.architecture??null,intent:node.architecture?.responsibility??'',evidence:citations(node.evidence),
      environment:['page','component'].includes(node.kind)?undefined:(node.architecture?{browser:'app',server:'backend',shared:'app',external:'external'}[node.architecture.runtime]:'unknown'),
    })),
    instances:flow.nodes.filter(n=>n.kind==='component'&&ownerPage(n.id)).map(node=>({id:viewId(node.id+'-instance'),sourceId:node.id+'-instance',node:viewId(node.id),page:viewId(ownerPage(node.id)!),
      ...(flow.nodes.find(n=>n.id===node.parent)?.kind==='component'?{parentInstance:viewId(node.parent+'-instance')}:{})})),
    pages:flow.pages.map(page=>({id:viewId(page.node),sourceId:page.node,title:flow.nodes.find(n=>n.id===page.node)!.label,route:page.route,domain:page.domain,
      scenes:page.scenes.map(s=>viewId(s.id)),sceneDetails:page.scenes.map(s=>({...s,id:viewId(s.id),sourceId:s.id,blocks:s.blocks?.map(b=>({...b,node:viewId(b.node)}))}))})),
    relations:flow.edges.map(e=>({...e,from:viewId(e.from),to:viewId(e.to)})),
    navigation:(flow.navigation??[]).map(n=>({...n,id:viewId(n.id),from:viewId(n.from),to:viewId(n.to),basis:flow.basis,evidence:citations(n.evidence)})),
    scenarios:flow.scenarios.map(s=>({id:viewId(s.id),sourceId:s.id,title:s.title,basis:flow.basis,category:s.category??'event',variant:s.variant??'custom',
      steps:s.steps.map((step,index)=>{
        const edge=flow.edges.find(e=>e.id===step.edge)!;
        const view=step.views?.[0];if(!view)throw new Error('Page flow step needs an explicit page/scene');
        return {id:viewId(s.id+'-'+index),edgeId:edge.id,fromNode:viewId(edge.from),toNode:viewId(edge.to),page:viewId(view.page),scene:viewId(view.scene),
          views:step.views!.map(v=>({page:viewId(v.page),scene:viewId(v.scene)})),
          label:edge.label,effect:step.effect,guard:step.condition??edge.condition,
          changes:step.changes?.map(c=>({...c,ownerNode:viewId(c.ownerNode),owner:flow.nodes.find(n=>n.id===c.ownerNode)!.label})),
          measurement:flow.basis==='proposed'?'설계 예상 상태 · 실행 측정 아님':'코드/측정 근거는 항목별 확인',evidence:citations(edge.evidence)};
      }),testCases:(flow.testCases??[]).filter(c=>c.scenarioId===s.id).map(c=>({id:viewId(c.id),sourceId:c.id,expected:c.then,method:c.method,given:c.given,when:c.when})),
    })),
    knowledge:(flow.knowledge??[]).map(k=>({...k,nodes:k.nodes.map(viewId),scenarios:k.scenarios.map(viewId),evidence:citations(k.evidence),
      confirmation:plan?.approved&&plan.decisions.some(d=>d.id===k.decisionId&&d.status==='resolved')?'approved':'review'})),
    checks:(flow.checks??[]).map(c=>({...c,nodes:c.nodes.map(viewId),scenarios:c.scenarios.map(viewId)})),
  };
}

export async function prepareFlowExplorer(root:string, systemRoot:string, flow:ProjectFlow, flowHash:string, outputName:string, plan?:FlowViewPlan, freshness='current', initialScenario?:string) {
  const spec=projectFlowView(flow,flowHash,plan);
  const index=flow.knowledge?.length?await readReferenceIndex(join(systemRoot,'references/learned')):undefined;
  const knowledge=spec.knowledge.map(k=>{
    const entry=index?.entries.find(e=>e.id===k.referenceId);
    return {...k,title:entry&&contentHash(JSON.stringify(entry))===k.referenceHash?entry.title:k.referenceId,
      versionStatus:entry&&contentHash(JSON.stringify(entry))===k.referenceHash?'current':'unavailable',
      sources:entry&&contentHash(JSON.stringify(entry))===k.referenceHash?Object.keys(entry.sources):[]};
  });
  const manifestPath=`design/fs/${flow.id}.captures.json`;
  let manifest:z.infer<typeof captureSchema>|undefined;
  try {manifest=captureSchema.parse(JSON.parse((await projectFile(root,manifestPath)).content));}
  catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
  const screens:Record<string,{image:string;width:number;height:number;regions:Array<{instance:string;x:number;y:number;width:number;height:number}>;kind:string}>= {};
  let bytes=0;
  if(manifest){
    if(manifest.flowHash!==flowHash)throw new Error('Capture manifest belongs to another flow version');
    if(flow.scope.snapshot&&manifest.sourceCommit!==flow.scope.snapshot.expectedCommit)throw new Error('Capture source commit differs from observed baseline');
    for(const blocked of manifest.blocked??[]) {
      if(!flow.pages?.find(p=>p.node===blocked.page)?.scenes.some(s=>s.id===blocked.scene))throw new Error('Unknown blocked capture scene');
      if(manifest.screens.some(s=>s.page===blocked.page&&s.scene===blocked.scene))throw new Error('A captured scene cannot also be blocked');
    }
    for(const screen of manifest.screens){
      if(!flow.pages?.find(p=>p.node===screen.page)?.scenes.some(s=>s.id===screen.scene))throw new Error('Capture references an unknown page/scene');
      if(flow.basis==='observed'&&(screen.kind!=='capture'||!screen.url))throw new Error('Observed view requires an actual page capture and URL');
      const key=viewId(screen.page)+':'+viewId(screen.scene);if(screens[key])throw new Error('Duplicate captured scene');
      const data=await projectFileBytes(root,screen.path);bytes+=data.length;
      if(bytes>24*1024*1024)throw new Error('Flow captures exceed 24 MiB');
      if(createHash('sha256').update(data).digest('hex')!==screen.hash)throw new Error('Captured image hash changed');
      if(data.length<24 || !data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw new Error('Flow captures must be PNG');
      if(data.readUInt32BE(16)!==screen.width||data.readUInt32BE(20)!==screen.height)throw new Error('Capture dimensions differ from PNG');
      const regions=screen.regions.map(region=>{
        const instance=spec.instances.find(i=>i.node===viewId(region.node)&&i.page===viewId(screen.page));
        if(!instance||region.x+region.width>1.001||region.y+region.height>1.001)throw new Error('Capture region does not belong to its page or bounds');
        return {instance:instance.id,x:region.x,y:region.y,width:region.width,height:region.height};
      });
      screens[key]={image:'data:image/png;base64,'+data.toString('base64'),width:screen.width,height:screen.height,regions,kind:screen.kind};
    }
  }
  const {prepareExplorer}=await import(pathToFileURL(join(systemRoot,'skills/fs-plan-visualize/scripts/renderer.mjs')).href);
  const captures=manifest?.screens.map(({page,scene,...details})=>({...details,page:viewId(page),scene:viewId(scene)}))??[];
  const blocked=manifest?.blocked?.map(b=>({...b,page:viewId(b.page),scene:viewId(b.scene)}))??[];
  const rendered=await prepareExplorer({...spec,knowledge,captures,blocked,freshness,initialScenario,modelFile:`${outputName}.model.json`},manifest?{flowHash,screens}:{}) as {
    html:string;spec:unknown;captureInput:{captureCoverage:{status:string;expected:number;captured:number;missing:string[]}}};
  const decode=(id:string)=>Buffer.from(id.slice(1),'hex').toString();
  const coverage={...rendered.captureInput.captureCoverage,missing:rendered.captureInput.captureCoverage.missing.map(key=>key.split(':').map(decode).join(':'))};
  const captureInput={flowId:flow.id,flowHash,sourceCommit:flow.scope.snapshot?.expectedCommit,manifestPath,
    pages:flow.pages,captureCoverage:coverage,blocked:manifest?.blocked??[],
    instruction:'Capture actual project pages at this code version; save PNGs and manifest. Proposed blocks are wireframes, never runtime captures.'};
  return {html:rendered.html,model:rendered.spec,captureInput,coverage};
}
