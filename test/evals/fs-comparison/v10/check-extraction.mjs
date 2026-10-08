// Real parser -> trigger check. Author supplied semantic observations stay explicit.
import assert from 'node:assert/strict';
import {readFile,readdir,mkdtemp,writeFile,rm} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {inspectCodeKnowledge} from '../../../../dist/src/application/knowledge/trigger-review.js';
const here=fileURLToPath(new URL('.',import.meta.url));
const runtime=resolve(process.argv[2]);
const cases=JSON.parse(await readFile(join(here,'cases.json'),'utf8'));
const specs=JSON.parse(await readFile(join(here,'knowledge-specs.json'),'utf8'));const rows=[];
for(const [name,fixture] of Object.entries(cases)){
 const spec=specs.find(s=>s.id===fixture.primaryKnowledge);
 const root=join(here,'projects',name);const files=(await readdir(join(root,'src'))).map(f=>'src/'+f);
 const before=performance.now();const plain=await inspectCodeKnowledge(root,runtime,{files});
 const staticMatch=plain.candidates.some(c=>c.id===spec.id);
 assert.equal(staticMatch,Boolean(spec.staticCall),name+' actual static binding');
 let semanticMatch=null;
 if(spec.observation){
  const {path,quote}=spec.observation;const body=await readFile(join(root,path),'utf8');const start=body.indexOf(quote);
  assert.ok(start>=0);const line=body.slice(0,start).split('\n').length;
  const routed=await inspectCodeKnowledge(root,runtime,{files,interpretations:[{path,line,evidence:quote,signal:'design.'+spec.id,interpretation:spec.condition}]});
  semanticMatch=routed.candidates.some(c=>c.id===spec.id);assert.equal(semanticMatch,true);
 }
 rows.push({case:name,primaryKnowledge:spec.id,staticMatch,authorSuppliedSemanticMatch:semanticMatch,milliseconds:performance.now()-before});
}
const negative=await mkdtemp(join(tmpdir(),'fs-v10-extraction-'));
try{
 await writeFile(join(negative,'unrelated.ts'),specs.map(s=>`function ${s.call}() {} ${s.call}();`).join('\n'));
 const inspected=await inspectCodeKnowledge(negative,runtime,{files:['unrelated.ts']});
 assert.equal(inspected.candidates.length,0,'Same-named local functions do not inherit imported/semantic meaning');
}finally{await rm(negative,{recursive:true,force:true});}
console.log(JSON.stringify({scope:'Authored parser/binding regression only; semantic observations explicitly supplied by author, not automatically inferred',rows,negativeLocalNamesRejected:true}));
