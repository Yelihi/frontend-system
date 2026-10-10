import * as z from 'zod/v4';
import {join} from 'node:path';
import {analysisId} from './flow-schema.js';
import {sha256} from './policy.js';
import {readBaselineRecords} from './project-flows.js';
import {flowToHtml} from './flow-view.js';
import {installedSystemRoot} from './knowledge/routing.js';
import type {validateProjectEvidence} from './design-evidence.js';

const text = z.string().trim().min(1).max(4000);
const ref = z.object({id:analysisId, hash:sha256});
export const projectReportSchema = z.object({
  status: z.enum(['partial', 'complete']),
  areas: z.array(z.object({
    id:analysisId, title:text, kind:z.enum(['environment','architecture','page','shared','delivery']),
    status:z.enum(['reviewed','pending','blocked','excluded']),
    summary:text, statementIds:z.array(analysisId),
    flows:z.array(ref), findings:z.array(ref),
    flowReason:z.string().max(4000).default('').describe('Why no event flow applies, e.g. a static page or configuration area. Never use this to hide unfinished tracing.'),
    knowledgeReview:text.describe('Observed trigger, consulted knowledge IDs, applicability and rationale; or why no available knowledge applies. Not a claim of automatic verification.'),
  })).min(1),
});
export type ProjectReport = z.infer<typeof projectReportSchema>;

export async function prepareProjectReport(root:string, report:ProjectReport,
  evidence:Awaited<ReturnType<typeof validateProjectEvidence>>, evidenceHash:string, snapshot:{baseRef:string; expectedCommit:string}) {
  const parsed = projectReportSchema.parse(report);
  if (new Set(parsed.areas.map(a => a.id)).size !== parsed.areas.length) throw new Error('Duplicate project report area');
  if (parsed.status === 'complete' && (evidence.completeness === 'partial' || parsed.areas.some(a => ['pending','blocked'].includes(a.status)))) {
    throw new Error('Complete analysis requires reviewed coverage and no pending/blocked areas');
  }
  const statements = new Map(evidence.statements.map(s => [s.id,s]));
  const refs = new Map<string, {kind:'flow'|'finding'; id:string; hash:string}>();
  for (const area of parsed.areas) {
    if (area.statementIds.some(id => !statements.has(id))) throw new Error(`Unknown statement in area: ${area.id}`);
    if (area.status === 'reviewed' && !area.statementIds.length) throw new Error(`Reviewed area needs evidence statements: ${area.id}`);
    if (area.status === 'reviewed' && !area.flows.length && !area.flowReason.trim()) throw new Error(`Reviewed area needs flows or an explicit non-applicability reason: ${area.id}`);
    for (const kind of ['flow','finding'] as const) for (const item of kind === 'flow' ? area.flows : area.findings) {
      const key = `${kind}/${item.id}`;
      if (refs.has(key) && refs.get(key)!.hash !== item.hash) throw new Error(`Conflicting report reference: ${key}`);
      refs.set(key, {kind,...item});
    }
  }
  const records = await readBaselineRecords(root, installedSystemRoot(), [...refs.values()], snapshot);
  if (parsed.status === 'complete') {
    const assigned = new Set(parsed.areas.flatMap(a => a.statementIds));
    if (evidence.statements.some(s => !assigned.has(s.id))) throw new Error('Complete analysis must index every evidence statement in an area');
  }
  for (const stored of records) if (stored.record.kind === 'finding') {
    const linked = refs.get(`flow/${stored.record.data.flow.id}`);
    if (linked?.hash !== stored.record.data.flow.hash) throw new Error('Report findings must link to an included flow version');
  }
  const artifacts:Array<{path:string; content:string}> = [];
  const details:string[] = [];
  const evidencePath = `evidence/project-${evidenceHash}.json`;
  for (const area of parsed.areas) {
    details.push(`### ${area.title}\n\nStatus: ${area.status}\n\n${area.summary}`);
    for (const id of area.statementIds) {
      const s = statements.get(id)!;
      details.push(`- **${id}** (${s.kind}): ${s.statement}\n  Evidence: ${s.evidence.map(c => `\`${c.path}:${c.line}\``).join(', ')}${s.limitations.length ? `\n  Limits: ${s.limitations.join('; ')}` : ''}`);
    }
    for (const ref of area.flows) {
      const stored = records.find(r => r.hash === ref.hash)!;
      if (stored.record.kind !== 'flow') throw new Error('Expected report flow');
      const flow = stored.record.data;
      const path = `diagrams/project-${ref.hash}.html`;
      if (!artifacts.some(a => a.path === path)) artifacts.push({path, content:flowToHtml(flow, 'current', {
        projectPath:root, flowHash:ref.hash, language:'ko', generatedAt:new Date().toISOString(), reasons:[],
      })});
      details.push(`\n#### ${flow.title}\n\n${flow.summary}\n\n[Interactive flow](${path}) · [Structured record](analysis/history/${ref.hash}.json)`);
      for (const node of flow.nodes) details.push(`- **${node.label}** (${node.kind}${node.parent ? `, parent: ${node.parent}` : ''}): ${(['props','state','events','lifecycle'] as const).filter(k => node[k].length).map(k => `${k}: ${node[k].join(', ')}`).join('; ') || 'See cited relationships.'}`);
      for (const scenario of flow.scenarios) {
        details.push(`\n**${scenario.title}** — ${scenario.event}`);
        scenario.steps.forEach((step, i) => {
          const edge = flow.edges.find(e => e.id === step.edge)!;
          details.push(`${i + 1}. ${edge.from} → ${edge.to}: ${edge.label}; ${step.effect}${step.condition || edge.condition ? ` (when: ${step.condition || edge.condition})` : ''}`);
        });
        details.push(`Outcome: ${scenario.outcome}\n\nLimits: ${scenario.limitations.join('; ') || 'See flow limitations.'}`);
      }
      details.push(`\nFlow limitations: ${flow.limitations.join('; ')}`);
    }
    if (!area.flows.length) details.push(`\nFlow: ${area.flowReason || 'Not yet recorded.'}`);
    details.push(`\nKnowledge review: ${area.knowledgeReview}`);
    for (const ref of area.findings) {
      const stored = records.find(r => r.hash === ref.hash)!;
      if (stored.record.kind !== 'finding') throw new Error('Expected report finding');
      const f = stored.record.data;
      details.push(`\n**${f.title}** (${f.kind}/${f.status}): ${f.observation}\n\nConsequence: ${f.consequence}\n\n${f.alternatives.map(a => `- ${a.description} — ${a.cost}`).join('\n')}\n\n${f.question ?? ''}\n\n[Finding](analysis/history/${ref.hash}.json)`);
    }
  }
  const context = {version:1, baseline:snapshot, analysisStatus:parsed.status,
    coverage:Object.fromEntries(['inspected','excluded','pending','blocked'].map(status => [status,evidence.coverage.filter(c => c.status === status).length])),
    evidence:evidencePath, areas:parsed.areas.map(({flows,findings,...area}) => ({...area,
      flows:flows.map(r => ({...r,path:`analysis/history/${r.hash}.json`})), findings:findings.map(r => ({...r,path:`analysis/history/${r.hash}.json`}))})),
    read:'Select area and statement IDs; read only relevant evidence and immutable flow/finding records. HTML is for humans. Freshness is separate from completeness.'};
  return {context, details:details.join('\n\n'), artifacts:artifacts.map(a => ({...a, absolutePath:join(root,'.frontend-system',a.path)}))};
}
