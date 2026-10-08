// Pure response replay: no archived model code, commands, or project mutations execute.
import assert from 'node:assert/strict';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {resolve, join} from 'node:path';
import {revisionReceipt, revisionWindow} from '../../../../dist/src/application/revision-response.js';

const archived=resolve(process.argv[2] ?? 'test/evals/fs-comparison/v4/results/2026-10-04T074740');
const rows=[];
for (const name of ['duplicated','existing-good','different-policies']) {
  const entries=[];
  for (const phase of ['prepare','work']) {
    const events=(await readFile(join(archived,`${name}-fs/${phase}/0/model/events.jsonl`),'utf8')).trim().split('\n').map(JSON.parse);
    for (const {type,item} of events) {
      if(type!=='item.completed' || item?.type!=='mcp_tool_call' || item.status==='failed' || item.error || item.result?.isError) continue;
      if(!['save_revision','approve_revision','get_revision'].includes(item.tool)) continue;
      const before=JSON.parse(item.result.content[0].text);
      assert.ok(before.hash && before.content && before.evidence,'Expected full archived revision evidence');
      const after=item.tool==='get_revision' ? revisionWindow(before,0,Number.MAX_SAFE_INTEGER,'contract') : revisionReceipt(before);
      assert.equal(after.hash,before.hash); assert.equal(after.approved,before.approved);
      assert.equal(after.evidenceStatus,before.evidenceStatus);
      if(item.tool==='get_revision') {
        assert.deepEqual(after.policy,before.policy); assert.deepEqual(after.issues,before.issues); assert.equal(after.content,before.content);
        assert.deepEqual(revisionWindow(before,0,Number.MAX_SAFE_INTEGER,'full').evidence,before.evidence);
      }
      const previous=JSON.stringify(before).length, current=JSON.stringify(after).length;
      assert.ok(current<previous,'Responses must shrink without weakening persisted contracts');
      entries.push({tool:item.tool,previousCharacters:previous,currentCharacters:current});
    }
  }
  assert.ok(entries.length);
  const previous=entries.reduce((sum,row)=>sum+row.previousCharacters,0), current=entries.reduce((sum,row)=>sum+row.currentCharacters,0);
  rows.push({case:name,responses:entries.length,previousCharacters:previous,currentCharacters:current,reductionPercent:Number((100*(1-current/previous)).toFixed(1)),entries});
}
const report={modelCalls:0,archivedRun:archived,rows,limits:'Pure archived response projection, not an AI rerun or token/latency benchmark. Contract text, policy, issues, hashes, approval and full evidence access are preserved.'};
await mkdir('test/evals/fs-comparison/v4/validation',{recursive:true});
await writeFile('test/evals/fs-comparison/v4/validation/revision-response-regression.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
