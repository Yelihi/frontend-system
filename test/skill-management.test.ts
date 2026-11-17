import assert from 'node:assert/strict';
import {test} from 'node:test';
import {mkdtemp,mkdir,writeFile,readFile,rm,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {inspectSkill,listSkills,saveSkill,skillMetadata,pinSkills,readSkillRun,saveSkillEvaluation} from '../src/application/skill-management.js';
import {digest} from '../src/application/workflow-store.js';

const content=(body='Use the relevant evidence.')=>`---\nname: example\ndescription: A focused example procedure.\nmetadata:\n  owner: team\n---\n${body}\n`;
async function fixture(){
  const root=await mkdtemp(join(tmpdir(),'fs-skills-'));
  await mkdir(join(root,'skills'),{recursive:true});
  await writeFile(join(root,'package.json'),JSON.stringify({name:'frontend-system',version:'0.13.0'}));
  execFileSync('git',['init','-q',root]);return root;
}
async function put(root:string,path:string,body:string){await mkdir(resolve(root,path,'..'),{recursive:true});await writeFile(join(root,path),body);}

test('metadata preserves supported scalar forms and rejects ambiguous or duplicate required fields',()=>{
  assert.equal(skillMetadata(content()).name,'example');
  assert.equal(skillMetadata(content().replace('A focused example procedure.', '"Write: a scoped issue."')).description,'Write: a scoped issue.');
  assert.equal(skillMetadata(content().replace('A focused example procedure.', '>\n  A focused\n  procedure.')).description,'A focused procedure.');
  for(const bad of [content().replace('A focused example procedure.','true'),content().replace('A focused example procedure.','Write: issue'),content().replace('name: example','name: example\nname: other'),content().replace('Use the relevant evidence.','')])assert.throws(()=>skillMetadata(bad));
});

test('source saves use full closure CAS, preserve metadata and reject broken or escaping references',async()=>{
  const root=await fixture();
  try{
    const body=content('[Guide](references/guide.md)');await put(root,'skills/example/references/guide.md','Original guide');
    const first=await saveSkill(root,{name:'example',content:body,expectedHash:null});
    assert.equal(first.status,'draft');assert.equal(await readFile(join(root,'skills/example/SKILL.md'),'utf8'),body);
    await assert.rejects(saveSkill(root,{name:'example',content:body,expectedHash:null}),/changed/);
    await put(root,'skills/example/references/guide.md','Changed guide');
    await assert.rejects(saveSkill(root,{name:'example',content:body,expectedHash:first.hash}),/changed/);
    const current=await inspectSkill(root,'example');
    await assert.rejects(saveSkill(root,{name:'example',content:content('[bad](../../../secret.md)'),expectedHash:current.hash}),/leaves packaged/);
    await assert.rejects(saveSkill(root,{name:'example',content:content('[missing](references/missing.md)'),expectedHash:current.hash}),/ENOENT/);
    assert.equal(await readFile(join(root,'skills/example/SKILL.md'),'utf8'),body);
    const origin={url:'https://example.com/skill',revision:'a'.repeat(40),license:'MIT',attribution:'Example author'};
    const updated=await saveSkill(root,{name:'example',content:body,expectedHash:current.hash,origin});assert.deepEqual(updated.origin,origin);
    await put(root,'secret.md','private');await symlink(join(root,'secret.md'),join(root,'skills/example/references/link.md'));
    await assert.rejects(inspectSkill(root,'example'),/symlink/);
  }finally{await rm(root,{recursive:true,force:true});}
});

test('source guard rejects installed caches and non-FS checkouts',async()=>{
  const root=await fixture();
  try{
    const cache=join(root,'plugins/cache/fs');await mkdir(cache,{recursive:true});
    await assert.rejects(saveSkill(cache,{name:'example',content:content(),expectedHash:null}),/cache/);
    await writeFile(join(root,'package.json'),'{"name":"another-project"}');
    await assert.rejects(saveSkill(root,{name:'example',content:content(),expectedHash:null}),/explicit FS/);
  }finally{await rm(root,{recursive:true,force:true});}
});

test('pinned guidance survives installation replacement, refuses overwrite and detects snapshot/receipt tampering',async()=>{
  const root=await fixture(),project=await mkdtemp(join(tmpdir(),'fs-consumer-'));
  try{
    await put(root,'references/shared.md','Shared original');
    await saveSkill(root,{name:'example',content:content('[Guide](../../references/shared.md)'),expectedHash:null});
    await put(root,'skills/example/scripts/helper.js','export const value=1;');
    const input={id:'issue-42',selections:[{name:'example',reason:'Write requested issue'}]};
    const pin=await pinSkills(project,root,input);
    await assert.rejects(pinSkills(project,root,input),/EEXIST/);
    await assert.rejects(pinSkills(project,root,{...input,id:'duplicate',selections:[...input.selections,...input.selections]}),/once/);
    await rm(join(root,'skills'),{recursive:true});await rm(join(root,'references'),{recursive:true});
    const run=await readSkillRun(project,pin.id,pin.hash);
    assert.equal(await readFile(join(run.snapshotRoot,'references/shared.md'),'utf8'),'Shared original');
    assert.equal(await readFile(join(run.snapshotRoot,'skills/example/scripts/helper.js'),'utf8'),'export const value=1;');
    await writeFile(join(run.snapshotRoot,'references/shared.md'),'tampered');
    await assert.rejects(readSkillRun(project,pin.id,pin.hash),/Pinned skill changed/);
    await writeFile(join(run.snapshotRoot,'references/shared.md'),'Shared original');
    await writeFile(pin.path,'{}');await assert.rejects(readSkillRun(project,pin.id,pin.hash),/receipt changed/);
  }finally{await rm(root,{recursive:true,force:true});await rm(project,{recursive:true,force:true});}
});

test('evaluations bind cases, skill and actual artifacts; omitted cases remain not-run',async()=>{
  const root=await fixture();
  try{
    const skill=await saveSkill(root,{name:'example',content:content(),expectedHash:null});
    const cases=JSON.stringify({skill:'example',cases:[{id:'success'},{id:'wrong-task'}]});
    await put(root,'test/evals/skills/example.json',cases);await put(root,'test/evals/outputs/trace.txt','Observed output');
    const input={name:'example',expectedHash:skill.hash,expectedCaseHash:digest(cases),evaluator:'host' as const,cases:[{id:'success',result:'passed' as const,observation:'Checked observed output.',evidence:[{path:'test/evals/outputs/trace.txt',hash:digest('Observed output')}]}]};
    const report=await saveSkillEvaluation(root,input);
    assert.deepEqual(report.coverage,[{id:'success',result:'passed'},{id:'wrong-task',result:'not-run'}]);
    assert.equal(JSON.parse(await readFile(report.path,'utf8')).caseHash,digest(cases));
    await assert.rejects(saveSkillEvaluation(root,{...input,cases:[{...input.cases[0]!,evidence:[]}]}),/artifacts/);
    await assert.rejects(saveSkillEvaluation(root,{...input,cases:[{...input.cases[0]!,id:'unknown'}]}),/Unknown/);
    await assert.rejects(saveSkillEvaluation(root,{...input,cases:[...input.cases,...input.cases]}),/duplicate/);
    await assert.rejects(saveSkillEvaluation(root,{...input,expectedCaseHash:'0'.repeat(64)}),/cases changed/);
    await put(root,'test/evals/outputs/trace.txt','Changed');await assert.rejects(saveSkillEvaluation(root,input),/artifact changed/);
    await put(root,'skills/example/SKILL.md',content('Revised behavior'));await assert.rejects(saveSkillEvaluation(root,input),/Skill changed/);
  }finally{await rm(root,{recursive:true,force:true});}
});

test('every shipped skill has valid confined guidance and content identity',async()=>{
  const result=await listSkills(process.cwd());
  assert.equal(result.valid,true,JSON.stringify(result));assert.equal(result.skills.length,8);
});

test('CLI connects confined source drafts, catalog checks, evaluation and pinned resumption',async()=>{
  const root=await fixture(),project=await mkdtemp(join(tmpdir(),'fs-cli-consumer-'));
  const cli=resolve('dist/src/cli.js');
  const run=(...args:string[])=>JSON.parse(execFileSync(process.execPath,[cli,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
  try{
    await put(root,'.frontend-system/drafts/skill.json',JSON.stringify({name:'example',content:content(),expectedHash:null}));
    const saved=run('skill-save',root,'.frontend-system/drafts/skill.json');assert.equal(saved.status,'draft');
    assert.equal(run('skill-list',root).skills.length,1);
    const pinned=run('skill-pin',project,'example-run','--source',root,'--skill','example','--reason','Exercise the approved procedure');
    assert.equal(run('skill-run',project,pinned.id,'--expected-hash',pinned.hash).selections[0].hash,saved.hash);
    const cases=JSON.stringify({skill:'example',cases:[{id:'positive'}]});await put(root,'test/evals/skills/example.json',cases);
    await put(root,'.frontend-system/drafts/eval.json',JSON.stringify({name:'example',expectedHash:saved.hash,expectedCaseHash:digest(cases),evaluator:'user',cases:[{id:'positive',result:'not-run',observation:'Not executed.',evidence:[]}]}));
    assert.equal(run('skill-evaluate',root,'.frontend-system/drafts/eval.json').coverage[0].result,'not-run');
    await put(root,'skills/broken/SKILL.md','Invalid');
    assert.throws(()=>run('skill-check',root),(error:unknown)=>(error as {status:number}).status===1);
  }finally{await rm(root,{recursive:true,force:true});await rm(project,{recursive:true,force:true});}
});
