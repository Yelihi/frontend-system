import assert from 'node:assert/strict';
import test from 'node:test';
import {validateStructuredFlow, validateFlowPlan} from '../src/application/flow-contracts.js';
import type {BoundEvidence} from '../src/application/design-evidence.js';
import {searchDesign} from './flow-contract-fixture.js';

const hash='1'.repeat(64);
function binding() {
  const flow=searchDesign();
  flow.knowledge=[{id:'ownership',referenceId:'request-ownership',referenceHash:hash,judgment:'apply',rationale:'Keep failed input available for retry',decisionId:'search',evidence:['request'],nodes:['search'],edges:[],scenarios:['error']}];
  const evidence={referenceHashes:{'request-ownership':hash},analysisRefs:[{kind:'flow',id:flow.id,hash,issueIds:['search']}],
    routes:[{judgments:[{referenceId:'request-ownership',decision:'apply'}]}],decisions:[{id:'search',status:'resolved',knowledgeIds:['request-ownership'],issueIds:['search']}]} as unknown as BoundEvidence;
  const issues=[{id:'search',implementationTargets:flow.nodes.flatMap(node=>(node.contracts??[]).map(c=>({target:c.name,files:[c.path],decisionId:'search',knowledgeIds:['request-ownership'],flowTarget:{flowId:flow.id,nodeId:node.id,contractName:c.name}}))),
    testCases:flow.testCases!.map(c=>({...c,flowId:flow.id}))}];
  return {flow,evidence,issues};
}

test('structured flow preserves success/error states and rejects dangling contracts',()=>{
  const f=searchDesign();validateStructuredFlow(f);
  const wrong=structuredClone(f);wrong.scenarios[0]!.steps[0]!.views![0]!.scene='missing';
  assert.throws(()=>validateStructuredFlow(wrong),/Unknown step page/);
  const wrongOwner=structuredClone(f);wrongOwner.scenarios[0]!.steps[0]!.changes![0]!.ownerNode='missing';
  assert.throws(()=>validateStructuredFlow(wrongOwner),/state change owner/);
  const noCase=structuredClone(f);noCase.testCases=noCase.testCases!.slice(1);
  assert.throws(()=>validateStructuredFlow(noCase),/test intent for every scenario/);
  const observed={...f,basis:'observed' as const,designState:undefined};
  assert.throws(()=>validateStructuredFlow(observed),/Observed screens require captures/);
});

test('plan binds exact learned judgment, function boundaries and test expectations',()=>{
  const {flow,evidence,issues}=binding();validateStructuredFlow(flow);validateFlowPlan(flow,evidence,issues);
  const wrong=structuredClone(issues);wrong[0]!.testCases[1]!.then='Clear the filter';
  assert.throws(()=>validateFlowPlan(flow,evidence,wrong),/Plan test differs/);
  const missing=structuredClone(issues);missing[0]!.implementationTargets.pop();
  assert.throws(()=>validateFlowPlan(flow,evidence,missing),/lacks implementation target/);
  const wrongKnowledge=structuredClone(evidence);wrongKnowledge.referenceHashes['request-ownership']='2'.repeat(64);
  assert.throws(()=>validateFlowPlan(flow,wrongKnowledge,issues),/knowledge version differs/);
  const draft={...flow,designState:'draft' as const};assert.throws(()=>validateFlowPlan(draft,evidence,issues),/must be ready/);
  validateFlowPlan({...flow,basis:'observed',designState:undefined},evidence,[{id:'search'}]);
  const omitted=structuredClone(issues);omitted[0]!.implementationTargets[0]!.knowledgeIds=[];
  assert.throws(()=>validateFlowPlan(flow,evidence,omitted),/omits flow judgment/,'Scenario-scoped learned must reach affected contracts too');
});
