// Authored files only; response size is not billed tokens or model performance.
import assert from 'node:assert/strict';
import {cp, mkdtemp, mkdir, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {FileSystemProjectDiscovery} from '../../../../dist/src/adapters/filesystem/project-discovery.js';
import {taskContext, summarizeTaskContext} from '../../../../dist/src/application/task-context.js';

const here=resolve('test/evals/fs-comparison/v5'), root=await mkdtemp(join(tmpdir(),'fs-reuse-'));
try {
  await cp(join(here,'reference'),root,{recursive:true});
  await writeFile(join(root,'package.json'),JSON.stringify({type:'module',dependencies:{react:'19.1.0'}}));
  await writeFile(join(root,'CONTRACT.md'),'Preserve caller inputs and request boundaries.');
  const request={raw:'공통 요청 인증 오류 처리와 주문 상태 소유권',mode:'prepare',constraints:[],
    files:['App.jsx','shared/http.mjs','domain/orders.mjs','data/orders.mjs','application/orders.mjs','ui/OrderList.jsx','ui/Checkout.jsx'],requirements:['CONTRACT.md']};
  const discovery=new FileSystemProjectDiscovery();
  const first=await taskContext(discovery,resolve('.'),root,request);
  const current=await taskContext(discovery,resolve('.'),root,request);
  const full=summarizeTaskContext(current), reused=summarizeTaskContext(current,first.contextId);
  assert.equal(reused.routing.reused,true);
  assert.deepEqual(reused.context,full.context); assert.deepEqual(reused.workflow,full.workflow);
  assert.deepEqual(reused.routing.warnings,full.routing.warnings);
  const characters=value=>JSON.stringify(value).length;
  const source=join(root,'domain/orders.mjs'); await writeFile(source,(await readFile(source,'utf8'))+'\n// new evidence\n');
  const changed=summarizeTaskContext(await taskContext(discovery,resolve('.'),root,request),first.contextId);
  assert.equal(changed.routing.reused,false); assert.ok(changed.routing.candidates);
  const result={modelCalls:0,files:request.files.length,firstCharacters:characters(full),repeatedCharacters:characters(reused),
    responseReductionPercent:Number((100*(1-characters(reused)/characters(full))).toFixed(1)),
    candidates:full.routing.candidates.length,changedSourceRestoresMetadata:true,
    limits:'Explicit reuse of already-read metadata. Current routing still computed; no CPU, total-token, billing or AI-quality improvement inferred.'};
  await mkdir(join(here,'validation'),{recursive:true});
  await writeFile(join(here,'validation/context-reuse.json'),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result,null,2));
} finally {await rm(root,{recursive:true,force:true});}
