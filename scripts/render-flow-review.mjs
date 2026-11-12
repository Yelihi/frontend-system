import {readFile,mkdir,copyFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {saveProjectAnalysis,getProjectAnalysis} from '../dist/src/application/project-flows.js';
import {renderProjectFlow} from '../dist/src/application/render-project-flow.js';
const root=resolve(process.argv[2]??'docs/experiments/flow-review/project');
await mkdir(root,{recursive:true});
await copyFile('test/fixtures/flow-review/source-evidence.txt',join(root,'source-evidence.txt'));
for(const name of ['echo','upload']){
 const flow=JSON.parse(await readFile(`test/fixtures/flow-review/${name}.json`,'utf8'));
 const current=(await getProjectAnalysis(root,process.cwd(),{ids:[flow.id],kind:'flow',full:true})).records[0];
 const saved=await saveProjectAnalysis(root,process.cwd(),{expectedHash:current?.hash??null,record:{kind:'flow',data:flow}});
 console.log(JSON.stringify(await renderProjectFlow(root,process.cwd(),{id:flow.id,expectedHash:saved.hash,allowUnverified:true})));
}
