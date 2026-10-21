import {readdir,rm} from 'node:fs/promises';
import {join} from 'node:path';
import * as z from 'zod/v4';
import {analysisId,flowCitation} from './flow-schema.js';
import {sha256} from './policy.js';
import {atomic,directory,digest,locked} from './workflow-store.js';
import {git} from './git-state.js';
import {projectSnapshot,readProjectSourceFile} from './project-snapshot.js';
import {readBaselineRecords,readPinnedFlow} from './project-flows.js';
import {flowReceipt,readProjectView,readViewRecord,viewFlows,prepareProjectView,projectViewShell,type ProjectView,type FlowReceipt} from './project-visualization.js';

const operation=z.discriminatedUnion('type',[
  z.object({type:z.literal('add'),flow:flowReceipt}),
  z.object({type:z.literal('replace'),before:flowReceipt,flow:flowReceipt}),
  z.object({type:z.literal('remove'),before:flowReceipt}),
]);
const reconciliation=z.object({baselineHash:sha256,implementationCommits:z.array(z.string().regex(/^[a-f0-9]{40}$/)).min(1),
  comparisons:z.array(z.object({targetId:analysisId,result:z.enum(['matches','differs','unverified']),observed:flowReceipt.optional(),
    explanation:z.string().trim().min(1),evidence:z.array(flowCitation).min(1)})).min(1)});
export const projectChangeSchema=z.object({version:z.literal(1),issueId:analysisId,title:z.string().trim().min(1).max(300),baseHash:sha256,
  operations:z.array(operation).min(1).max(100),reconciliation:reconciliation.optional()});
export const projectChangeWriteSchema=z.object({expectedHash:sha256.nullable(),record:z.object({kind:z.literal('change'),data:projectChangeSchema})});
export type ProjectChange=z.infer<typeof projectChangeSchema>;
const target=(op:ProjectChange['operations'][number])=>op.type==='add'?op.flow.id:op.before.id;

export function applyProjectChange(base:ProjectView, change:ProjectChange):FlowReceipt[]{
  if(digest(JSON.stringify(base))!==change.baseHash)throw new Error('Issue baseline changed; review and rebase the change set');
  const flows=new Map(base.flows.map(f=>[f.id,f]));const touched=new Set<string>();
  for(const op of change.operations){
    const id=target(op);
    if(touched.has(id))throw new Error(`Duplicate issue target: ${id}`);touched.add(id);
    if(op.type==='add'){
      if(flows.has(id))throw new Error(`Addition already exists: ${id}`);
      flows.set(id,op.flow);
    }else{
      if(flows.get(id)?.hash!==op.before.hash)throw new Error(`Issue target changed: ${id}`);
      flows.delete(id);
      if(op.type==='replace'){
        if(op.flow.id!==id&&flows.has(op.flow.id))throw new Error('Replacement collides with another flow');
        flows.set(op.flow.id,op.flow);
      }
    }
  }
  return [...flows.values()];
}

async function readChange(root:string,id:string){
  analysisId.parse(id);
  try{const raw=await readViewRecord(root,`changes/${id}.json`);
    const data=projectChangeSchema.parse(JSON.parse(raw));if(data.issueId!==id)throw new Error('Issue identity mismatch');
    return {hash:digest(raw),data,raw};
  }catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return null;throw error;}
}
export async function listProjectChanges(root:string){
  let files:string[];
  try{files=await readdir(join(root,'.frontend-system/changes'));}
  catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return [];throw error;}
  const records=[];
  for(const name of files.filter(n=>n.endsWith('.json')).sort()){
    const record=await readChange(root,name.slice(0,-5));if(record)records.push(record);
  }
  return records;
}

async function validateReconciliation(root:string,systemRoot:string,current:{hash:string;data:ProjectView},change:ProjectChange){
  const review=change.reconciliation!;
  if(review.baselineHash!==current.hash)throw new Error('Reconciliation must use the current project baseline');
  if(new Set(review.comparisons.map(c=>c.targetId)).size!==change.operations.length||review.comparisons.length!==change.operations.length)
    throw new Error('Compare every issue operation exactly once');
  for(const commit of review.implementationCommits){
    await git(root,['merge-base','--is-ancestor',commit,current.data.baseline.expectedCommit]);
  }
  for(const op of change.operations){
    const comparison=review.comparisons.find(c=>c.targetId===target(op));if(!comparison)throw new Error('Missing operation comparison');
    if(comparison.observed){
      if(!current.data.flows.some(f=>f.id===comparison.observed!.id&&f.hash===comparison.observed!.hash))throw new Error('Comparison must reference a current observed flow');
      await readBaselineRecords(root,systemRoot,[{kind:'flow',...comparison.observed}],current.data.baseline);
    }
    if(comparison.result==='matches'){
      if(op.type==='remove'&&current.data.flows.some(f=>f.id===op.before.id))throw new Error('Removed flow remains in the baseline');
      if(op.type!=='remove'&&!comparison.observed)throw new Error('Matching implementation needs an observed flow');
    }
    for(const citation of comparison.evidence){
      const file=await readProjectSourceFile(root,citation.path,current.data.baseline.expectedCommit,current.data.baseline.baseRef);
      if(citation.line){const lines=file.content.split(/(?<=\n)/),offset=lines.slice(0,citation.line-1).join('').length;
        const found=file.content.indexOf(citation.quote,offset);
        if(!lines[citation.line-1]||found<offset||found>=offset+lines[citation.line-1]!.length)throw new Error('Comparison citation line does not match');
      }else if(!file.content.includes(citation.quote)||file.content.indexOf(citation.quote)!==file.content.lastIndexOf(citation.quote))throw new Error('Comparison quote missing or ambiguous');
    }
  }
  return review.comparisons.every(c=>c.result==='matches')?'applied':'needs-review';
}

export async function saveProjectChange(root:string,systemRoot:string,input:z.input<typeof projectChangeWriteSchema>){
  const {expectedHash,record:{data:change}}=projectChangeWriteSchema.parse(input);
  return locked(root,async()=>{
    const current=await readProjectView(root);if(!current||current.data.status!=='complete')throw new Error('Complete the whole-project baseline before saving an issue change');
    if((await projectSnapshot(root,current.data.baseline.baseRef)).commit!==current.data.baseline.expectedCommit)throw new Error('Refresh the project baseline before saving an issue');
    const previous=await readChange(root,change.issueId);
    if((previous?.hash??null)!==expectedHash)throw new Error('Issue changed; reread before saving');
    let status:string='proposed';let preview:string|undefined;let model:unknown;
    const body=JSON.stringify(change),hash=digest(body);
    if(change.reconciliation){
      if(!previous||JSON.stringify({...previous.data,reconciliation:undefined})!==JSON.stringify({...change,reconciliation:undefined}))throw new Error('Reconcile an existing unchanged issue design');
      status=await validateReconciliation(root,systemRoot,current,change);
    }else{
      const refs=applyProjectChange(current.data,change);
      await readBaselineRecords(root,systemRoot,current.data.flows.map(f=>({kind:'flow' as const,...f})),current.data.baseline);
      for(const op of change.operations)if(op.type!=='remove'){
        if((await readPinnedFlow(root,op.flow.id,op.flow.hash)).basis!=='proposed')throw new Error('Issue design must reference proposed flows');
      }
      const generated=await prepareProjectView(root,systemRoot,{...current.data,flows:refs},await viewFlows(root,refs),`issue-${hash}`);
      preview=generated.html;model=generated.model;
    }
    if((await readProjectView(root))?.hash!==current.hash)throw new Error('Project baseline changed during issue save');
    if((await projectSnapshot(root,current.data.baseline.baseRef)).commit!==current.data.baseline.expectedCommit)throw new Error('Base commit changed during issue save');
    if(model)await atomic(join(await directory(root,'diagrams'),`issue-${hash}.model.json`),JSON.stringify(model));
    if(preview)await atomic(join(await directory(root,'diagrams'),`issue-${hash}.html`),preview);
    if(previous)await atomic(join(await directory(root,'changes/history'),`${previous.hash}.json`),previous.raw);
    const path=join(await directory(root,'changes'),`${change.issueId}.json`);
    try{
      await atomic(path,body);
      await refreshProjectViewShell(root,current);
    }catch(error){
      if(previous)await atomic(path,previous.raw);else await rm(path,{force:true});
      throw error;
    }
    return {issueId:change.issueId,hash,status,path:join(root,'.frontend-system/diagrams/index.html'),
      meaning:'Implementation comparison is a cited host review, not a proof of semantic equivalence.'};
  });
}

export async function refreshProjectViewShell(root:string,current:NonNullable<Awaited<ReturnType<typeof readProjectView>>>,selected?:string){
  const issues=(await listProjectChanges(root)).map(({hash,data})=>{
    const reviewed=data.reconciliation?.baselineHash===current.hash;
    const applied=reviewed&&data.reconciliation!.comparisons.every(c=>c.result==='matches');
    const currentDesign=data.baseHash===current.hash&&!data.reconciliation;
    return {id:data.issueId,title:data.title,...(currentDesign?{path:`issue-${hash}.html`}:{reason:applied?'반영 완료':reviewed?'구현 차이 검토 필요':'기준 변경 · 재검토 필요'})};
  });
  await atomic(join(await directory(root,'diagrams'),'index.html'),projectViewShell(`project-view-${current.hash}.html`,issues,selected,current.data.status));
}

export async function renderProjectVisualization(root:string,systemRoot:string,issueId?:string){
  return locked(root,async()=>{
    const current=await readProjectView(root);if(!current)throw new Error('Run whole-project analysis first');
    if(issueId&&current.data.status!=='complete')throw new Error('Complete the project analysis before rendering an issue');
    if((await projectSnapshot(root,current.data.baseline.baseRef)).commit!==current.data.baseline.expectedCommit)throw new Error('Refresh the project baseline before rendering');
    await readBaselineRecords(root,systemRoot,current.data.flows.map(f=>({kind:'flow' as const,...f})),current.data.baseline);
    const refs=issueId?applyProjectChange(current.data,(await readChange(root,issueId))?.data??(()=>{throw new Error('Unknown issue');})()):current.data.flows;
    const change=issueId?await readChange(root,issueId):null;
    const outputName=change?`issue-${change.hash}`:`project-view-${current.hash}`;
    const generated=await prepareProjectView(root,systemRoot,{...current.data,flows:refs},await viewFlows(root,refs),outputName);
    if((await projectSnapshot(root,current.data.baseline.baseRef)).commit!==current.data.baseline.expectedCommit)throw new Error('Base commit changed during rendering');
    if(generated.model)await atomic(join(await directory(root,'diagrams'),`${outputName}.model.json`),JSON.stringify(generated.model));
    await atomic(join(await directory(root,'diagrams'),`${outputName}.html`),generated.html);
    await refreshProjectViewShell(root,current,issueId);
    return {path:join(root,'.frontend-system/diagrams/index.html'),baseline:current.data.baseline,analysisStatus:current.data.status,captureCoverage:generated.coverage,modelPath:undefined,
      basis:issueId?'proposed' as const:'observed' as const,freshness:{status:'current',reasons:[] as string[]}};
  });
}
