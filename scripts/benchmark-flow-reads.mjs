import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {performance} from 'node:perf_hooks';
import {saveProjectAnalysis,getProjectAnalysis} from '../dist/src/application/project-flows.js';
const root=await mkdtemp(join(tmpdir(),'fs-flow-reads-'));
try {
  await mkdir(join(root,'src'));
  for(let i=0;i<32;i++)await writeFile(join(root,`src/f${i}.ts`),`export const f${i}=()=>${i};\n`+'// padding\n'.repeat(100));
  const ids=Array.from({length:12},(_,i)=>`flow-${String(i).padStart(2,'0')}`);
  for(const id of ids)await saveProjectAnalysis(root,process.cwd(),{expectedHash:null,record:{kind:'flow',data:{
    id,title:id,basis:'observed',summary:'Shared discovery coverage benchmark',scope:{files:['src/f0.ts'],discoveryRoots:['src']},
    evidence:{call:{path:'src/f0.ts',quote:'export const f0=()=>0;'}},nodes:[{id:'m',kind:'module',label:'f0',evidence:['call']}],
    edges:[{id:'return',from:'m',to:'m',kind:'return',label:'return 0',evidence:['call']}],
    scenarios:[{id:'read',title:'read',entry:'m',event:'call',steps:[{edge:'return',effect:'returns zero'}],outcome:'zero'}],limitations:['Authored benchmark; no semantic/model comparison']}}});
  const samples=[];
  for(let round=0;round<3;round++)for(const mode of round%2?['batch','separate']:['separate','batch']){
    const start=performance.now(),stats={inventoryReads:0,sourceReads:0,sourceBytes:0};
    for(const group of mode==='batch'?[ids]:ids.map(id=>[id])){
      const data=await getProjectAnalysis(root,process.cwd(),{kind:'flow',ids:group,limit:20});
      if(data.records.some(r=>r.freshness.status!=='current'))throw Error('Unexpected stale analysis');
      for(const key of Object.keys(stats))stats[key]+=data.scan[key];
    }
    samples.push({round,mode,elapsedMs:performance.now()-start,...stats});
  }
  const result={flows:12,discoveryFiles:32,samples,meaning:'Same correct content coverage. One batch vs 12 independent queries; request-local sharing only. Warm OS cache/order affects timing. Not model tokens or the former incomplete freshness algorithm.'};
  await writeFile('docs/reliability/read-benchmark.json',JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result));
} finally {await rm(root,{recursive:true,force:true});}
