import {join, resolve} from 'node:path';
import * as z from 'zod/v4';
import {analysisId, flowSchema} from './flow-schema.js';
import {getProjectAnalysis} from './project-flows.js';
import {flowToHtml, flowToMermaid} from './flow-view.js';
import {atomic, directory, digest, locked} from './workflow-store.js';

export const renderFlowOptions = z.object({
  id: analysisId, expectedHash: z.string().regex(/^[a-f0-9]{64}$/),
  language: z.enum(['ko', 'en']).default('ko').describe('Fixed HTML controls only; evidence and authored analysis stay unchanged.'),
  scenarioId: analysisId.optional(), format: z.enum(['html', 'mermaid']).default('html'),
  allowUnverified: z.boolean().default(false).describe('Explicit preview of proposed or stale analysis; never certifies current implementation.'),
});

/** Shared by MCP and CLI; rendering never invents a graph or refreshes its evidence. */
export async function renderProjectFlow(root: string, systemRoot: string, input: z.input<typeof renderFlowOptions>) {
  const options = renderFlowOptions.parse(input);
  return locked(root, async () => {
    const found = (await getProjectAnalysis(root, systemRoot, {kind:'flow', ids:[options.id], full:true})).records[0];
    if (!found || found.hash !== options.expectedHash) throw new Error('Flow changed or missing; read its current hash');
    const flow = flowSchema.parse(found.data);
    const freshness = found.freshness as {status: string; reasons: string[]};
    if (!options.allowUnverified && (flow.basis !== 'observed' || freshness.status !== 'current')) {
      throw new Error(`Current observed flow required: ${flow.basis}/${freshness.status}. Reanalyze affected code, or explicitly preview with allowUnverified. ${freshness.reasons.join('; ')}`);
    }
    if (options.scenarioId && !flow.scenarios.some(s => s.id === options.scenarioId)) throw new Error('Unknown flow scenario');
    const provenance = {projectPath:resolve(root), flowHash:options.expectedHash,
      generatedAt:new Date().toISOString(), reasons:freshness.reasons};
    const content = options.format === 'html'
      ? flowToHtml(flow, freshness.status, {...provenance, scenarioId:options.scenarioId, language:options.language})
      : `%% ${JSON.stringify({basis:flow.basis, freshness, ...provenance})}\n${flowToMermaid(flow, options.scenarioId)}`;
    const output = join(await directory(root, 'diagrams'), `${options.id}.${options.format === 'html' ? 'html' : 'mmd'}`);
    await atomic(output, content);
    return {path:output, hash:digest(content), flowHash:options.expectedHash, freshness, basis:flow.basis,
      generatedAt:provenance.generatedAt, meaning:'Cited static interpretation at export time, not an executed trace. Rerender to check source changes.'};
  });
}
