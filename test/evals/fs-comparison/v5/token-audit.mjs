// Read archived logs as data only. Never execute model-generated files or commands.
import assert from 'node:assert/strict';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {resolve, join} from 'node:path';
import {isDeepStrictEqual} from 'node:util';
import {revisionWindow, revisionReceipt} from '../../../../dist/src/application/revision-response.js';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';

const here=resolve('test/evals/fs-comparison/v5');
const archived=resolve(process.argv[2] ?? join(here,'results/2026-10-04T161324'));
const summary=JSON.parse(await readFile(join(archived,'summary.json'),'utf8'));
const size=value=>JSON.stringify(value).length;
const rows=[], replay=[];
for(const journey of summary.journeys) {
  let lastSaved;
  for(const record of journey.records) {
    const path=join(archived,`${journey.case}-${journey.arm}`,record.phase,String(record.attempt),'model/events.jsonl');
    const events=(await readFile(path,'utf8')).trim().split('\n').map(JSON.parse);
    const groups={};
    for(const event of events) {
      const item=event.item;
      if(event.type!=='item.completed' || !item) continue;
      if(!['mcp_tool_call','command_execution'].includes(item.type)) continue;
      const key=item.tool ?? item.type;
      const group=groups[key] ??= {calls:0,argumentCharacters:0,resultCharacters:0,failures:0};
      group.calls++;
      group.argumentCharacters+=item.type==='mcp_tool_call' ? size(item.arguments) : (item.command ?? '').length;
      group.resultCharacters+=item.type==='mcp_tool_call' ? size(item.result) : (item.aggregated_output ?? '').length;
      group.failures+=Number(item.type==='mcp_tool_call' ? item.status==='failed' : item.exit_code!==0);
      if(item.type!=='mcp_tool_call') continue;
      const text=item.result?.content?.filter(block=>block.type==='text').map(block=>block.text).join('\n');
      let response; try {response=JSON.parse(text);} catch {response=null;}
      if(item.tool==='get_revision' && item.arguments.detail==='full' && response?.evidence) {
        const next=revisionWindow(response,0,200,'decisions');
        assert.deepEqual(next.decisions,response.evidence.decisions);
        assert.equal(next.hash,response.hash);
        assert.deepEqual(next.routeJudgments,response.evidence.routes.map(({hash,judgments})=>({hash,judgments})));
        replay.push({kind:'full-to-decisions',phase:record.phase,beforeCharacters:size(response),afterCharacters:size(next),
          assumption:'Caller needs to edit choices, not debug raw inspection. Whole plan remains retrievable.'});
      }
      if(item.tool==='save_revision') {
        if(lastSaved) {
          const next=structuredClone(item.arguments),omitted=[];
          for(const field of ['content','policy','issues']) if(isDeepStrictEqual(next[field],lastSaved[field])) {delete next[field];omitted.push(field);}
          assert.deepEqual(next.evidence,item.arguments.evidence);
          assert.equal(next.expectedHash,item.arguments.expectedHash);
          if(omitted.length) replay.push({kind:'omit-unchanged-save-fields',phase:record.phase,omitted,
            beforeCharacters:size(item.arguments),afterCharacters:size(next),
            assumption:'Exact equality with previous successful save input; changed fields and complete evidence retained.'});
        }
        if(item.status==='completed' && response) lastSaved=item.arguments;
      }
      if(item.tool==='get_revision' && response?.evidence && response.version===2) {
        assert.ok(revisionReceipt(response).contractDiagnostics.some(message=>message.includes('javascript-iteration-promises-and-resources')),
          'Receipt must reveal the observed missing knowledge link before approval is attempted');
      }
    }
    rows.push({arm:journey.arm,phase:record.phase,seconds:record.invocation.elapsedSeconds,usage:record.invocation.usage,groups});
  }
}
const [plain,fs]=summary.journeys;
const difference={cachedInput:fs.usage.cached_input_tokens-plain.usage.cached_input_tokens,
  uncachedInput:(fs.usage.input_tokens-fs.usage.cached_input_tokens)-(plain.usage.input_tokens-plain.usage.cached_input_tokens),
  output:fs.usage.output_tokens-plain.usage.output_tokens,total:fs.usage.total_tokens-plain.usage.total_tokens};
assert.equal(difference.cachedInput+difference.uncachedInput+difference.output,difference.total);
const client=new Client({name:'fs-token-audit',version:'1'});
let toolInventory;
try {
  await client.connect(new StdioClientTransport({command:process.execPath,args:[resolve('bundle/mcp.js')]}));
  const {tools}=await client.listTools();
  toolInventory={count:tools.length,characters:size(tools),largest:tools.map(tool=>({name:tool.name,characters:size(tool)}))
    .sort((a,b)=>b.characters-a.characters).slice(0,6),
    limits:'Current local MCP declarations only; provider schema injection during the archived run was not captured.'};
} finally {await client.close();}
const result={archived,modelCalls:0,difference,cachedShareOfDifferencePercent:100*difference.cachedInput/difference.total,
  rows,replay,toolInventory,limits:'Observed usage is exact at turn level. Tool character counts exclude schemas/hidden context and are not token attribution. Replays are conditional payload comparisons, not actual model savings, deleted retries or CPU measurements. Original results unchanged.'};
await mkdir(join(here,'validation'),{recursive:true});
await writeFile(join(here,'validation/token-audit.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({difference,cachedShareOfDifferencePercent:result.cachedShareOfDifferencePercent,replay},null,2));
