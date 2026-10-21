import {renderProjectVisualization} from './project-changes.js';
import {join, resolve} from 'node:path';
import * as z from 'zod/v4';
import {analysisId, flowSchema} from './flow-schema.js';
import {getProjectAnalysis} from './project-flows.js';
import {flowToHtml, flowToMermaid} from './flow-view.js';
import {atomic, directory, digest, locked, recordId, workflowContext} from './workflow-store.js';
import {loadFlowDesignImages} from './flow-design.js';
import {prepareFlowExplorer} from './page-flow-view.js';

export const renderFlowOptions = z.object({
  id: analysisId.optional(), expectedHash: z.string().regex(/^[a-f0-9]{64}$/).optional(),
  projectView: z.boolean().default(false), issueId: analysisId.optional(),
  language: z.enum(['ko', 'en']).default('ko').describe('Fixed HTML controls only; evidence and authored analysis stay unchanged.'),
  scenarioId: analysisId.optional(), format: z.enum(['html', 'mermaid']).default('html'),
  planId: recordId.optional(),
  allowUnverified: z.boolean().default(false).describe('Explicit preview of proposed or stale analysis; never certifies current implementation.'),
});

/** Shared by MCP and CLI; rendering never invents a graph or refreshes its evidence. */
export async function renderProjectFlow(root: string, systemRoot: string, input: z.input<typeof renderFlowOptions>) {
  const options = renderFlowOptions.parse(input);
  if(options.projectView){
    if(options.format!=='html'||options.id||options.expectedHash||options.planId||options.allowUnverified||options.scenarioId||options.language!=='ko')throw new Error('Project view uses its own baseline; use HTML without per-flow options');
    return renderProjectVisualization(root,systemRoot,options.issueId);
  }
  if(!options.id||!options.expectedHash||options.issueId)throw new Error('Single flow requires id and expectedHash, without issueId');
  const flowId=options.id,flowHash=options.expectedHash;
  return locked(root, async () => {
    const found = (await getProjectAnalysis(root, systemRoot, {kind:'flow', ids:[flowId], full:true})).records[0];
    if (!found || found.hash !== options.expectedHash) throw new Error('Flow changed or missing; read its current hash');
    const flow = flowSchema.parse(found.data);
    if (flow.design?.stage === 'visual-review' && options.format !== 'html') throw new Error('Visual review requires HTML with its mockup images');
    const freshness = found.freshness as {status: string; reasons: string[]};
    if (!options.allowUnverified && (flow.basis !== 'observed' || freshness.status !== 'current')) {
      throw new Error(`Current observed flow required: ${flow.basis}/${freshness.status}. Reanalyze affected code, or explicitly preview with allowUnverified. ${freshness.reasons.join('; ')}`);
    }
    if (options.scenarioId && !flow.scenarios.some(s => s.id === options.scenarioId)) throw new Error('Unknown flow scenario');
    const provenance = {projectPath:resolve(root), flowHash,
      generatedAt:new Date().toISOString(), reasons:freshness.reasons};
    const linked = options.planId ? await workflowContext(root, options.planId) : null;
    if (linked && !linked.revision.evidence?.analysisRefs?.some(ref => ref.kind === 'flow' && ref.id === flow.id && ref.hash === options.expectedHash)) {
      throw new Error('The selected plan does not pin this flow version');
    }
    const caseLinks = linked ? Object.fromEntries(flow.scenarios.map(scenario => [scenario.id,
      linked.revision.issues?.flatMap(issue => (issue.testCases ?? [])
        .filter(item => item.flowId === flow.id && item.scenarioId === scenario.id)
        .map(item => ({id:item.id, method:item.method, expected:item.then,
          status: linked.verification.status === 'verified' && linked.execution?.steps.find(step => step.id === issue.id)?.caseEvidence?.some(entry => entry.caseId === item.id)
            ? 'verified' : 'unverified'}))) ?? []])) : undefined;
    const explorer = options.format === 'html' && options.language === 'ko' && flow.pages?.length
      ? await prepareFlowExplorer(root, systemRoot, flow, flowHash, flowId,
        linked ? {approved:linked.revision.approved,decisions:linked.revision.evidence?.decisions??[]} : undefined, freshness.status, options.scenarioId) : undefined;
    const content = explorer?.html ?? (options.format === 'html'
      ? flowToHtml(flow, freshness.status, {...provenance, scenarioId:options.scenarioId, language:options.language, caseLinks:caseLinks ?? {}, images:await loadFlowDesignImages(root, flow)})
      : `%% ${JSON.stringify({basis:flow.basis, freshness, ...provenance})}\n${flowToMermaid(flow, options.scenarioId)}`);
    const output = join(await directory(root, 'diagrams'), `${options.id}.${options.format === 'html' ? 'html' : 'mmd'}`);
    if (explorer) {
      await atomic(join(await directory(root, 'diagrams'), `${options.id}.model.json`), JSON.stringify(explorer.model));
      await atomic(join(await directory(root, 'diagrams'), `${options.id}.capture.json`), JSON.stringify(explorer.captureInput));
    }
    await atomic(output, content);
    return {path:output, hash:digest(content), flowHash, freshness, basis:flow.basis,
      ...(explorer ? {captureCoverage:explorer.coverage,modelPath:output.replace(/\.html$/,'.model.json'),capturePath:output.replace(/\.html$/,'.capture.json')} : {}),
      generatedAt:provenance.generatedAt, meaning:'Cited static interpretation at export time, not an executed trace. Rerender to check source changes.'};
  });
}
