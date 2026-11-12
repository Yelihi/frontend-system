import type {ProjectFlow} from './flow-schema.js';

export function validateFlowReview(flow:ProjectFlow) {
  const r=flow.review;if(!r)return;
  const assert=(value:unknown,message:string)=>{if(!value)throw new Error('Flow review: '+message);};
  const unique=(items:Array<{id:string}>,kind:string)=>assert(new Set(items.map(i=>i.id)).size===items.length,'duplicate '+kind);
  const nodes=new Map(flow.nodes.map(n=>[n.id,n])),edges=new Map(flow.edges.map(e=>[e.id,e]));
  const rules=new Set(flow.invariants.map(i=>i.id)),tests=new Set(flow.testCases?.map(t=>t.id));
  const contracts=new Map(r.contracts.map(c=>[c.id,c])),fields=new Map(r.fields.map(f=>[f.id,f]));
  const scenes=new Set(flow.pages?.flatMap(p=>p.scenes.map(s=>s.id)));
  const steps=flow.scenarios.flatMap(s=>s.steps.map(t=>t.review).filter(t=>t!==undefined));
  const stepIds=new Set(steps.map(s=>s.id));
  assert(flow.pages?.length,'pages required');
  assert(flow.scenarios.length&&(flow.testCases?.length??0)>0,'review requires scenarios and test plans');
  assert(scenes.size===flow.pages!.flatMap(p=>p.scenes).length,'review scene IDs must be unique across pages');
  for(const [kind,items] of [['contract',r.contracts],['field',r.fields],['edit',r.edits],['step',steps]] as const)unique(items,kind);
  assert(new Set(r.screens.map(s=>s.sceneId)).size===r.screens.length,'duplicate review scene');
  const refs=(ids:string[],set:{has:(id:string)=>boolean},kind:string)=>{assert(new Set(ids).size===ids.length,'duplicate '+kind+' refs');assert(ids.every(id=>set.has(id)),'unknown '+kind+' reference');};
  const evidence=(ids:string[])=>refs(ids,new Set(Object.keys(flow.evidence)),'evidence');
  for(const c of r.contracts){refs(c.nodeIds,nodes,'contract node');evidence(c.evidence);assert(flow.basis!=='observed'||c.evidence.length,'observed contract needs evidence');}
  for(const field of r.fields){assert(nodes.has(field.ownerNodeId),'unknown field owner');evidence(field.evidence);assert(flow.basis!=='observed'||field.evidence.length,'observed field needs evidence');}
  for(const n of flow.nodes){assert(n.review,'missing node change classification');refs(n.review!.contractIds,contracts,'node contract');assert(n.review!.contractIds.every(id=>contracts.get(id)!.nodeIds.includes(n.id)),'contract owner mismatch');}
  for(const c of r.contracts)assert(c.nodeIds.every(id=>nodes.get(id)?.review?.contractIds.includes(c.id)),'contract node link mismatch');
  const cards=flow.nodes.flatMap(n=>n.review?.flowCard?[n.review.flowCard.order]:[]);assert(new Set(cards).size===cards.length,'duplicate flow card order');
  for(const scene of r.screens){assert(scenes.has(scene.sceneId),'unknown screen scene');unique(scene.blocks,'screen block');for(const b of scene.blocks){assert(nodes.has(b.nodeId),'unknown screen owner');let owner=nodes.get(b.nodeId);const seen=new Set<string>();while(owner?.parent&&!seen.has(owner.id)){seen.add(owner.id);owner=nodes.get(owner.parent);}assert(!['page','component'].includes(nodes.get(b.nodeId)!.kind)||flow.pages!.some(p=>p.node===owner?.id&&p.scenes.some(s=>s.id===scene.sceneId)),'screen block belongs to another page');assert(!b.editId||r.edits.some(e=>e.id===b.editId&&e.nodeIds.includes(b.nodeId)),'unknown screen edit or owner');}}
  for(const scenario of flow.scenarios){assert(scenario.steps.every(s=>s.review),'every review step requires metadata');for(const s of scenario.steps){const step=s.review!;
    refs(step.edgeIds,edges,'ordered edge');assert(step.edgeIds[0]===s.edge,'primary edge differs from ordered calls');refs(step.ruleIds,rules,'step rule');refs(step.testIds,tests,'step test');
    assert(s.views?.every(v=>r.screens.some(screen=>screen.sceneId===v.scene)),'step screen missing');
    refs(step.changes.map(c=>c.fieldId),fields,'changed field');
    for(const c of step.changes){assert(flow.basis==='proposed'?c.basis==='proposed':c.basis!=='proposed','state basis mismatch');assert((JSON.stringify(c.before)===JSON.stringify(c.after))===(c.changeKind==='preserved'),'ambiguous changeKind');}
  }}
  refs(r.dependencyEdgeIds,edges,'dependency edge');
  for(const id of r.dependencyEdgeIds){const e=edges.get(id)!;assert(nodes.get(e.from)?.review?.graph&&nodes.get(e.to)?.review?.graph,'dependency endpoint has no placement');}
  for(const rule of flow.invariants){assert(rule.review,'rule metadata missing');refs(rule.review!.nodeIds,nodes,'rule node');refs(rule.review!.testIds,tests,'rule test');}
  for(const t of flow.testCases??[]){assert(t.review,'test details missing');refs(t.review!.ruleIds,rules,'test rule');refs(t.review!.nodeIds,nodes,'test node');refs(t.review!.stepIds,stepIds,'test step');
    assert(t.review!.stepIds.every(id=>flow.scenarios.find(s=>s.id===t.scenarioId)?.steps.some(s=>s.review?.id===id&&s.review.testIds.includes(t.id))),'test step link mismatch');}
  for(const step of steps)assert(step.testIds.every(id=>flow.testCases?.find(t=>t.id===id)?.review?.stepIds.includes(step.id)),'step test link mismatch');
  for(const edit of r.edits){refs(edit.nodeIds,nodes,'edit node');refs(edit.contractIds,contracts,'edit contract');refs(edit.testIds,tests,'edit test');refs(edit.ruleIds,rules,'edit rule');assert(edit.initial.length<=edit.maxLength&&edit.existing.length<=edit.maxLength,'edit exceeds length');if(edit.signatureToken)assert(edit.contractIds.every(id=>contracts.get(id)!.signature.includes(edit.signatureToken!)),'signature token absent');}
}

/** All UI collections derive from the canonical flow, never a second execution graph. */
export function projectReviewView(flow:ProjectFlow,flowHash:string) {
  validateFlowReview(flow);
  const r=flow.review!;
  const scenarios=flow.scenarios.map(s=>({id:s.id,title:s.title,steps:s.steps.map(step=>({...step.review!,scene:step.views![0]!.scene,links:step.review!.edgeIds.map(id=>flow.edges.find(e=>e.id===id)!)}))}));
  return {...r,flowHash,flowId:flow.id,title:flow.title,basis:flow.basis,summary:flow.summary,limitations:flow.limitations,
    nodes:flow.nodes,evidence:flow.evidence,scenarios,
    rules:flow.invariants.map(i=>({id:i.id,statement:i.statement,...i.review!})),
    tests:(flow.testCases??[]).map(t=>({id:t.id,given:t.given.split('\n'),when:t.when.split('\n'),then:t.then.split('\n'),...t.review!})),
    dependencies:r.dependencyEdgeIds.map(id=>flow.edges.find(e=>e.id===id)!),
    sourceIds:Object.fromEntries(flow.nodes.map(n=>[n.id,'v'+Buffer.from(n.id).toString('hex')])),
  };
}
