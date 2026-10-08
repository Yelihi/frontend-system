// Replays request inputs and authored starter files, never executes archived model code.
import assert from 'node:assert/strict';
import {mkdtemp, readFile, writeFile, rm, mkdir, symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {FileSystemProjectDiscovery} from '../../../../dist/src/adapters/filesystem/project-discovery.js';
import {taskContext, summarizeTaskContext} from '../../../../dist/src/application/task-context.js';

const repo=resolve('.');
const archived=resolve(process.argv[2] ?? 'test/evals/fs-comparison/v4/results/2026-10-03T171521');
const rows=[];
for (const name of ['duplicated','existing-good','different-policies']) {
  const folder=join(archived,`${name}-fs/prepare/0`);
  const events=(await readFile(join(folder,'model/events.jsonl'),'utf8')).trim().split('\n').map(JSON.parse);
  const item=events.find(({type,item})=>type==='item.completed' && item?.tool==='get_work_context' && item.status==='completed').item;
  const old=JSON.parse(item.result.content[0].text), args=item.arguments;
  const root=await mkdtemp(join(tmpdir(),'fs-context-regression-'));
  try {
    await symlink(join(repo,'test/fixtures/frontend/node_modules'),join(root,'node_modules'),'dir');
    for (const file of ['App.jsx','api.mjs','money.mjs','package.json','CONTRACT.md','PROVIDED_PLAN.md']) {
      await writeFile(join(root,file),await readFile(join(folder,'snapshot',file)));
    }
    for(const [file, hash] of Object.entries(old.routing.inspection.analysis.hashes)) {
      assert.equal(createHash('sha256').update(await readFile(join(root,file))).digest('hex'),hash,'Replay the inspected source, not a later edit');
    }
    for (const command of [['init','-q','-b','main'],['add','App.jsx','api.mjs','money.mjs','package.json','CONTRACT.md'],['-c','user.name=FS Eval','-c','user.email=eval@localhost','commit','-qm','Baseline']]) {
      execFileSync('git',command,{cwd:root,env:{...process.env,GIT_CONFIG_GLOBAL:'/dev/null',GIT_CONFIG_NOSYSTEM:'1'}});
    }
    const request={raw:args.request,mode:args.mode ?? 'implement',constraints:args.constraints ?? [],files:args.files,
      ...(args.observations ? {observations:args.observations}:{}),...(args.interpretations ? {interpretations:args.interpretations}:{})};
    const times=[];let compact;
    for(let i=0;i<3;i++) {
      const started=performance.now();
      compact=summarizeTaskContext(await taskContext(new FileSystemProjectDiscovery(),repo,root,request));
      times.push(performance.now()-started);
    }
    const candidates=compact.routing.candidates.map(({id})=>id).sort();
    assert.deepEqual(candidates,old.routing.candidates.map(({id})=>id).sort());
    const mandatory=old.context.applicableRules.filter(({mandatory})=>mandatory).map(({id})=>id).sort();
    assert.deepEqual(compact.context.applicableRules.filter(({mandatory})=>mandatory).map(({id})=>id).sort(),mandatory);
    assert.deepEqual(compact.routing.warnings,old.routing.inspection.analysis.warnings);
    const bytes=JSON.stringify(compact).length, previous=JSON.stringify(old).length;
    assert.ok(bytes<previous*0.65,'At least 35% structural reduction on the archived fixture, without dropping candidates or required rules');
    rows.push({case:name,previousWireCharacters:item.result.content[0].text.length,previousCompactCharacters:previous,
      currentWireCharacters:bytes,structuralReductionPercent:Number((100*(1-bytes/previous)).toFixed(1)),
      candidatesPreserved:candidates.length,mandatoryRulesPreserved:mandatory.length,currentMilliseconds:times.map(value=>Number(value.toFixed(2)))});
  } finally {await rm(root,{recursive:true,force:true});}
}
const result={modelCalls:0,archivedRun:archived,rows,
  limits:'Local response regression only. Reconstructed temp Git roots; no inference about AI quality, tokens or speed. Three current timing samples, no controlled old timing baseline.'};
await mkdir(join(repo,'test/evals/fs-comparison/v4/validation'),{recursive:true});
await writeFile(join(repo,'test/evals/fs-comparison/v4/validation/context-regression.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
