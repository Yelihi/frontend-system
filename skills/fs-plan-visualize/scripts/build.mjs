import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {addPlannedFlows} from './compose.mjs';
import {prepareExplorer} from './renderer.mjs';
assert.ok(process.argv[2]&&process.argv[3],'Usage: node build.mjs <view-model.json> <output-directory> [planned-addition.json]');
const output=resolve(process.argv[3]);
let spec=JSON.parse(await readFile(process.argv[2],'utf8'));
if(process.argv[4])spec=addPlannedFlows(spec,JSON.parse(await readFile(process.argv[4],'utf8')));
let assets={};
try {assets=JSON.parse(await readFile(join(output,'assets.json'),'utf8'));} catch(error){if(error.code!=='ENOENT')throw error;}
const rendered=await prepareExplorer(spec,assets);
await mkdir(output,{recursive:true});
await writeFile(join(output,'index.html'),rendered.html);
await writeFile(join(output,'rendered-model.json'),JSON.stringify(rendered.spec,null,2)+'\n');
await writeFile(join(output,'capture-input.json'),JSON.stringify(rendered.captureInput));
console.log(JSON.stringify({path:join(output,'index.html'),semanticNodes:spec.nodes.length,instances:spec.instances.length,scenarios:spec.scenarios.length,capturedScreens:Object.keys(assets.screens??{}).length,captureCoverage:rendered.captureCoverage}));
