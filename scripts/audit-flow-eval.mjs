// Read-only mechanism audit. Does not score semantic quality or execute fixture code.
import {readFile,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
const root=resolve(process.argv[2]);
const manifest=JSON.parse(await readFile(join(root,'manifest.json'),'utf8'));
const rows=[], responseSizes=[];
for(const cell of manifest.cells.filter(c=>c.arm==='fs-K1'))for(const stage of ['analysis','plan']){
  const folder=join(root,cell.id,stage);let trace;
  try{trace=JSON.parse(await readFile(join(folder,'mcp-trace.json'),'utf8'));}catch(e){if(e.code==='ENOENT')continue;throw e;}
  const characters={};
  for(const line of (await readFile(join(folder,'events.jsonl'),'utf8')).trim().split('\n')){
    const event=JSON.parse(line), item=event.item;
    if(event.type!=='item.completed'||!item)continue;
    let key,body;
    if(item.type==='mcp_tool_call'){key=item.tool;body=JSON.stringify(item.result);}
    else if(item.type==='command_execution'){key=item.command?.includes('tool-help')?'shell:tool-help':'shell:other';body=item.aggregated_output??'';}
    else continue;
    const count=characters[key]??={calls:0,characters:0};count.calls++;count.characters+=(body??'').length;
  }
  responseSizes.push({id:cell.id,stage,outputs:characters});
  const queries=trace.filter(t=>t.tool==='get_project_analysis'&&!t.error);
  const saves=trace.filter(t=>t.tool==='save_project_analysis'&&!t.error);
  const row={id:cell.id,stage,firstTool:trace[0]?.tool,analysisQueries:queries.length,
    staleSeen:queries.some(t=>t.response.records?.some(r=>r.freshness?.status==='stale')),
    analysisWrites:saves.length,errors:trace.filter(t=>t.error).map(t=>({tool:t.tool,response:t.response})),
    learnedReads:trace.filter(t=>t.tool==='read_learned_knowledge'&&!t.error).map(t=>t.arguments.id)};
  if(stage==='plan'){
    const rev=JSON.parse(await readFile(join(folder,'project/.frontend-system/plans/flow-refactor/revision.json'),'utf8'));
    row.approved=rev.approved;
    row.references=[];
    for(const ref of rev.evidence?.analysisRefs??[]){
      const path=join(folder,'project/.frontend-system/analysis/history',ref.hash+'.json');
      const raw=await readFile(path,'utf8');const data=JSON.parse(raw);
      row.references.push({...ref,hashMatches:createHash('sha256').update(raw).digest('hex')===ref.hash,
        identityMatches:data.record.kind===ref.kind&&data.record.data.id===ref.id});
    }
    row.specifiedInvestigations=rev.evidence.routes.flatMap(r=>r.judgments.filter(j=>j.investigation).map(j=>({id:j.referenceId,decision:j.decision,action:j.investigation.action,questions:j.investigation.findings.map(f=>({id:f.questionId,status:f.status,basis:f.basis}))})));
    row.contractDiagnostics=[...trace].reverse().find(t=>t.tool==='save_revision'&&!t.error)?.response.contractDiagnostics;
  }
  rows.push(row);
}
await writeFile(join(root,'mechanism-audit.json'),JSON.stringify({meaning:'Recorded mechanism evidence; hashes do not prove interpretation or causal quality improvement',rows},null,2)+'\n');
await writeFile(join(root,'response-size-audit.json'),JSON.stringify({meaning:'Serialized completed result characters, including duplicate structured/text if emitted. Not tokens or attribution of total usage.',rows:responseSizes},null,2)+'\n');
console.log(JSON.stringify(rows.map(({id,stage,analysisQueries,analysisWrites,staleSeen,errors,contractDiagnostics})=>({id,stage,analysisQueries,analysisWrites,staleSeen,errors:errors.length,contractDiagnostics}))));
