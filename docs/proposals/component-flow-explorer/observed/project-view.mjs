import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,copyFile,rename,cp} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const additionPath=process.argv[2];
const viewOut=additionPath?'dist/observed-order-plan-view':'dist/observed-order-view';
const artifact=additionPath?'preview-with-plan.html':'preview.html';
const root='docs/proposals/component-flow-explorer/observed/';
const receipt=JSON.parse(await readFile(root+'receipts.json'));
const stored=JSON.parse(await readFile('dist/observed-order-project/.frontend-system/analysis/flow/order-observed.json'));
const flow=stored.record.data;
const trace=JSON.parse(await readFile(root+'runtime-trace.json'));
for(const [path,hash] of Object.entries(stored.hashes)){assert.equal(createHash('sha256').update(await readFile('test/fixtures/frontend/'+path)).digest('hex'),hash,'Captured app source drift: '+path);assert.equal(createHash('sha256').update(await readFile('dist/observed-order-project/'+path)).digest('hex'),hash,'Source drift: '+path);}
const events=trace.sequence.filter(e=>e.kind==='status');
const rows=(e)=>Object.keys(e.after).map(field=>({owner:'OrderForm',field:'status.'+field,before:e.before[field],after:e.after[field]}));
const steps=[];
function step(id,edge,scene,effect,changes,measurement='코드 해석'){const link=flow.edges.find(e=>e.id===edge);assert.ok(link);changes=changes.map(c=>({...c,ownerNode:c.owner==='OrderForm'?'form':c.owner==='send'?'send':'submitter'}));steps.push({id,edge,fromNode:link.from,toNode:link.to,page:'page',scene,label:link.label,effect,changes,measurement,evidence:link.evidence.map(id=>flow.evidence[id])});}
step('entry','submit','idle','onSubmit은 기본 제출을 막고 submit(1)을 호출한다.',[{owner:'submit',field:'quantity',before:'호출 전',after:1}]);
step('busy','busy','pending','changed 콜백으로 전달된 실제 값. React commit 시각은 별도다.',rows(events[0]),'실측 · 원본 함수의 changed 콜백');
step('send','transport','pending','주입된 전송 함수가 받은 실제 인자.',[{owner:'send',field:'quantity',before:'호출 전',after:1}], '실측 · 전송 테스트 경계');
step('duplicate','ignore','pending','추가 전송 없이 false 반환. 기존 요청은 계속된다.',[{owner:'send',field:'calls',before:1,after:1},{owner:'duplicate',field:'return',before:'호출 전',after:false}],'실측 · 중복 호출');
step('failure','fail','error','주입한 요청 실패가 오류 콜백으로 전달된다.',rows(events[1]),'실측 · 원본 함수의 changed 콜백');
step('unlock-failure','unlock','error','finally가 클로저 잠금을 해제한다. status.pending과 다른 변수다.',[{owner:'submitter closure',field:'pending',before:true,after:false}]);
step('retry','busy','pending','재시도에서 기존 오류를 비우고 pending으로 전환한다.',rows(events[2]),'실측 · 원본 함수의 changed 콜백');
step('success','ok','success','성공 콜백 시점의 payload. 아직 finally 전이므로 closure.pending은 true다.',rows(events[3]),'실측 · 원본 함수의 changed 콜백');
step('unlock-success','unlock','success','finally 후 제출 함수가 true를 반환한다.',[{owner:'submitter closure',field:'pending',before:true,after:false}]);
const spec={browserApis:[{name:'fetch',ownerNode:'send',detail:'POST /api/orders · Response.ok'}],schemaVersion:'discussion-2',title:'Order fixture · 관측 화면',basis:'observed',baseline:{commit:receipt.snapshot.commit,flow:{id:flow.id,hash:receipt.flow.hash}},nodes:flow.nodes.map(n=>({...n,name:n.label,environment:['api','action','catalog'].includes(n.id)?'backend':!['page','component'].includes(n.kind)?'app':undefined,basis:'observed',signature:n.contracts?.map(c=>c.signature).join('\n')??'',intent:n.id==='submitter'?'클로저 잠금과 changed 콜백을 분리한다.':n.id==='form'?'상태 payload를 받고 버튼·오류·완료 문구를 표시한다.':n.label,evidence:n.evidence.map(id=>flow.evidence[id]),...(n.id==='form'?{framework:{name:'Next.js / React',execution:'Client Component',reason:"app/order-form.jsx:1 · 'use client'",hooks:['useState(status)','useState(() => createOrderSubmitter(send, setStatus))']}}:{})})),instances:[{id:'form-1',node:'form',page:'page'}],pages:[{id:'page',title:'주문 페이지',route:'/',scenes:['idle','pending','error','success']}],scenarios:[{id:'failure-retry',title:'실제 함수 · 실패 → 재시도 → 성공',steps},...flow.scenarios.map(s=>{let scene=s.id==='duplicate'?'pending':'idle';return {...s,category:s.id==='initial'?'lifecycle':'event',title:s.title.replace('初期','초기'),steps:s.steps.map((v,i)=>{scene=({busy:'pending',transport:'pending',post:'pending',ok:'success',fail:'error'})[v.edge]??scene;const e=flow.edges.find(e=>e.id===v.edge);return {id:s.id+'-'+i,edge:e.id,fromNode:e.from,toNode:e.to,page:'page',scene,label:e.label,effect:v.effect,changes:[],measurement:'코드 해석',evidence:e.evidence.map(id=>flow.evidence[id])};})};})],capture:{environment:'Next dev + local fault-injection proxy; initial/pending/500-error/success',crop:{x:0,y:0,width:760,height:570},componentMapping:'OrderForm renders the main section; JSX evidence + clipped DOM rect',trace:'runtime-trace.json'}};
await writeFile(root+'view-model.json',JSON.stringify(spec,null,2)+'\n');
await mkdir(viewOut,{recursive:true});
const buildArgs=['docs/proposals/component-flow-explorer/build.mjs',root+'view-model.json',viewOut,...(additionPath?[additionPath]:[])];
// Freeze inputs: renderer output consumes a projection of the saved FS flow, not rewritten product HTML.
try{await rename(viewOut+'/assets.json',viewOut+'/assets.previous.json');}catch(e){if(e.code!=='ENOENT')throw e;}
execFileSync('node',buildArgs);
const hashes=JSON.parse(await readFile(viewOut+'/capture-input.json'));
const screens=JSON.parse(await readFile('dist/observed-order-screen-assets.json'));
await writeFile(viewOut+'/assets.json',JSON.stringify({...hashes,screens}));
execFileSync('node',buildArgs);
const modelFile=additionPath?'rendered-plan-model.json':'rendered-model.json';
await writeFile(root+artifact,(await readFile(viewOut+'/index.html','utf8')).replace('href="rendered-model.json"','href="'+modelFile+'"'));
await copyFile(viewOut+'/rendered-model.json',root+modelFile);
await copyFile(receipt.context.projectDocument,root+'project.md');
await copyFile(receipt.context.delivery.aiContext,root+'ai-context.json');
await copyFile(receipt.context.delivery.diagrams[0].path,root+'fs-flow.html');
for(const folder of ['evidence','analysis','diagrams'])await cp('dist/observed-order-project/.frontend-system/'+folder,root+folder,{recursive:true});
await copyFile('dist/observed-order-project/.frontend-system/init.md',root+'init.md');
console.log(JSON.stringify({path:root+artifact,baseline:spec.baseline,states:Object.keys(screens),steps:steps.length}));
