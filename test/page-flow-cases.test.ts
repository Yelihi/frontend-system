import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import test from 'node:test';

test('page explorer keeps planned scenario cases separate from verified results', async () => {
  const root=await mkdtemp(join(tmpdir(),'fs-page-cases-'));
  const script=join(process.cwd(),'skills/fs-plan-visualize/scripts/build.mjs');
  const example=JSON.parse(await readFile(join(process.cwd(),'skills/fs-plan-visualize/references/page-flow-input.json'),'utf8'));
  try {
    example.scenarios[0].testCases=[{id:'no-session',expected:'Request is rejected before repository access'}];
    const source=join(root,'input.json'),output=join(root,'output');
    await writeFile(source,JSON.stringify(example));
    execFileSync(process.execPath,[script,source,output]);
    const rendered=JSON.parse(await readFile(join(output,'rendered-model.json'),'utf8'));
    assert.deepEqual(rendered.scenarios[0].testCases,example.scenarios[0].testCases);
    const html=await readFile(join(output,'index.html'),'utf8');
    assert.match(html,/scenario-cases/);
    assert.doesNotMatch(html,/verified.*no-session/);
    example.scenarios[0].testCases.push({id:'no-session',expected:'Duplicate'});
    await writeFile(source,JSON.stringify(example));
    assert.throws(()=>execFileSync(process.execPath,[script,source,output],{stdio:'pipe'}),/Duplicate scenario test case/);
  } finally {await rm(root,{recursive:true,force:true});}
});
