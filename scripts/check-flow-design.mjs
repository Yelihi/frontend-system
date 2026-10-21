// Run after npm run build and starting test/fixtures/frontend on port 3217.
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,copyFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {searchDesign} from '../dist/test/flow-contract-fixture.js';
import {flowSchema} from '../dist/src/application/flow-schema.js';
import {saveProjectAnalysis} from '../dist/src/application/project-flows.js';
import {renderProjectFlow} from '../dist/src/application/render-project-flow.js';
import {readReferenceIndex,contentHash} from '../dist/src/application/knowledge/reference-index.js';
const {chromium}=createRequire(new URL('../test/fixtures/frontend/package.json',import.meta.url))('@playwright/test');
const output=await mkdtemp(join(tmpdir(),'fs-design-browser-')), systemRoot=resolve('.');
const appUrl=process.env.FS_TEST_APP_URL??'http://127.0.0.1:3217';
const hash=buffer=>createHash('sha256').update(buffer).digest('hex');
const write=async(path,value)=>{await mkdir(resolve(path,'..'),{recursive:true});await writeFile(path,typeof value==='string'?value:JSON.stringify(value,null,2));};
const browser=await chromium.launch();const errors=[];const checks=[];
try {
 const page=await browser.newPage({viewport:{width:1280,height:800}});page.on('pageerror',e=>errors.push(e.message));
 let pending;
 await page.route('**/api/orders',route=>{pending=route;});
 await page.goto(appUrl);await page.getByRole('heading',{name:'Order acceptance fixture'}).waitFor();
 const root=join(output,'observed');await mkdir(root,{recursive:true});
 const files=['app/page.jsx','app/order-form.jsx','src/domain/orders.js'];
 const sourceHashes={};
 for(const file of files){await mkdir(resolve(root,file,'..'),{recursive:true});await copyFile(join(systemRoot,'test/fixtures/frontend',file),join(root,file));sourceHashes[file]=hash(await readFile(join(root,file)));}
 const observed=flowSchema.parse({id:'order-runtime',title:'주문 제출 · 실제 테스트 앱',basis:'observed',summary:'중복 요청 방지와 주문 성공/실패 상태를 실제 주문 폼에서 확인한다.',
  scope:{files,discoveryRoots:['app','src']},evidence:{page:{path:files[0],quote:'export default function Page()'},form:{path:files[1],quote:'export default function OrderForm({ children })'},send:{path:files[1],quote:'async function send(quantity)'},submit:{path:files[2],quote:'export function createOrderSubmitter(send, changed)'}},
  nodes:[{id:'page',kind:'page',label:'OrderPage',evidence:['page']},
   {id:'form',kind:'component',label:'OrderForm',parent:'page',state:['status.pending: boolean','status.error: string','status.submitted: boolean'],events:['onSubmit → submit(1)'],evidence:['form'],architecture:{layer:'presentation',runtime:'browser',responsibility:'주문 입력과 결과 표시'},contracts:[{kind:'function',name:'OrderForm',path:files[1],signature:'OrderForm({ children })',evidence:['form']}]},
   {id:'submit',kind:'service',label:'createOrderSubmitter',evidence:['submit'],architecture:{layer:'domain',runtime:'browser',responsibility:'중복 제출 차단, 수량 검증, 성공/실패 상태 전달'},contracts:[{kind:'function',name:'createOrderSubmitter',path:files[2],signature:'createOrderSubmitter(send, changed)',evidence:['submit']}]},
   {id:'send',kind:'module',label:'send',evidence:['send'],architecture:{layer:'transport',runtime:'browser',responsibility:'POST /api/orders와 실패 응답 처리'}}],
  pages:[{node:'page',route:'/',domain:'주문',scenes:['idle','loading','error','success'].map(kind=>({id:kind,kind,title:kind,description:'실제 주문 폼 '+kind}))}],
  edges:[{id:'submit',from:'form',to:'submit',kind:'call',label:'submit(1)',evidence:['form']},{id:'send',from:'submit',to:'send',kind:'call',label:'await send(quantity)',evidence:['submit','send']},{id:'result',from:'submit',to:'form',kind:'write',label:'changed(status)',evidence:['submit']}],
  scenarios:['error','success'].map(variant=>({id:variant,title:variant==='error'?'주문 실패와 오류 표시':'재시도 성공과 완료 표시',entry:'form',event:'submit',variant,steps:[
   {edge:'submit',effect:'주문을 접수하고 중복 제출을 막는다.',views:[{page:'page',scene:'loading'}],changes:[{ownerNode:'form',field:'status.pending',before:'false',after:'true',basis:'source'}]},
   {edge:'send',effect:'서버 응답을 기다린다.',views:[{page:'page',scene:'loading'}]},
   {edge:'result',effect:variant==='error'?'오류를 보여주고 재시도를 허용한다.':'완료 메시지를 표시한다.',views:[{page:'page',scene:variant}],changes:[{ownerNode:'form',field:'status.pending',before:'true',after:'false',basis:'source'}]}],outcome:variant})),
  testCases:['error','success'].map(id=>({id:'order-'+id,scenarioId:id,given:'An idle order form',when:id==='error'?'POST returns 500':'POST returns 200',then:id==='error'?'Show error and enable retry':'Show Order received',method:'e2e'})),limitations:['테스트 앱이며 서버 응답은 Playwright에서 500/200으로 주입한다. 상태값 표는 소스 해석이며 런타임 계측이 아니다.']});
 const saved=await saveProjectAnalysis(root,systemRoot,{expectedHash:null,record:{kind:'flow',data:observed}});
 const screens=[];
 const capture=async(scene)=>{
  const file=`design/fs/captures/${scene}.png`;await mkdir(join(root,'design/fs/captures'),{recursive:true});
  const image=await page.screenshot({path:join(root,file)}),box=await page.locator('main > section').boundingBox();
  screens.push({page:'page',scene,kind:'capture',path:file,hash:hash(image),url:appUrl,capturedAt:new Date().toISOString(),width:1280,height:800,
   regions:[{node:'form',x:box.x/1280,y:box.y/800,width:box.width/1280,height:box.height/800}]});
 };
 await capture('idle');await page.getByRole('button',{name:'Place order',exact:true}).click();await page.getByRole('button',{name:'Submitting'}).waitFor();await capture('loading');
 assert.ok(pending,'Submit must issue a request');await pending.fulfill({status:500,body:'failure'});pending=null;
 await page.getByRole('alert').filter({hasText:'Order failed. Try again.'}).waitFor();await capture('error');
 await Promise.all([page.waitForRequest('**/api/orders'),page.getByRole('button',{name:'Place order',exact:true}).click()]);
 assert.ok(pending,'Retry must issue a request');await pending.fulfill({status:200,body:'{}'});
 await page.getByRole('status').filter({hasText:'Order received'}).waitFor();await capture('success');
 await write(join(root,'design/fs/order-runtime.captures.json'),{flowHash:saved.hash,screens});
 const actual=await renderProjectFlow(root,systemRoot,{id:observed.id,expectedHash:saved.hash,scenarioId:'error'});
 assert.deepEqual(actual.captureCoverage,{status:'complete',expected:4,captured:4,missing:[]});
 await page.goto(pathToFileURL(actual.path).href);await page.locator('#screen .screen-image').waitFor();
 assert.match(await page.locator('#screen-state').textContent(),/loading · 실행 화면/);
 await page.locator('#next').click();await page.locator('#next').click();
 assert.match(await page.locator('#screen-state').textContent(),/error · 실행 화면/);
 assert.ok(await page.locator('#screen .screen-image').evaluate(img=>img.complete&&img.naturalWidth===1280));
 await page.screenshot({path:join(output,'actual-error.png'),fullPage:true});checks.push('actual app: idle/loading/error/success PNGs, exact scene switching');
 const proposedRoot=join(output,'proposed');await mkdir(proposedRoot);await write(join(proposedRoot,'requirements.md'),'Keep the selected filter on failure.');
 const flow=searchDesign();
 // A second proposed consumer checks cross-page state projection; it is not observed app behavior.
 flow.nodes.push({id:'history-page',kind:'page',label:'SearchHistory',props:[],state:[],events:[],lifecycle:[],evidence:[]});
 flow.pages.push({node:'history-page',route:'/search-history',domain:'검색 이력',scenes:['loading','success','error'].map(kind=>({id:kind,kind,title:kind,description:'최근 검색 상태',blocks:[{node:'history-page',role:'feedback',label:'최근 검색: '+kind}]}))});
 flow.navigation=[{id:'open-history',from:'page',to:'history-page',label:'검색 이력 열기',condition:'사용자가 이력 링크 선택',evidence:[]}];
 for(const scenario of flow.scenarios)for(const step of scenario.steps)step.views.push({page:'history-page',scene:step.views[0].scene});
 const index=await readReferenceIndex(join(systemRoot,'references/learned'));
 const learned=index.entries.find(e=>e.id==='code-quality-context-and-contracts');assert.ok(learned);
 flow.knowledge=[{id:'contract-choice',referenceId:learned.id,referenceHash:contentHash(JSON.stringify(learned)),judgment:'keep',rationale:'검증용 연결: 검색 함수의 요청·결과 계약을 UI 입력 책임과 구별해 표시한다. 이 시각화 검사는 의미 판단의 정답을 검증하지 않는다.',evidence:['request'],nodes:['search'],edges:[],scenarios:['error']}];
 const proposedSaved=await saveProjectAnalysis(proposedRoot,systemRoot,{expectedHash:null,record:{kind:'flow',data:flow}});
 const proposed=await renderProjectFlow(proposedRoot,systemRoot,{id:flow.id,expectedHash:proposedSaved.hash,allowUnverified:true});
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:1000});await page.goto(pathToFileURL(proposed.path).href);
  await page.locator('.route-node').first().focus();await page.keyboard.press('Enter');await page.locator('[data-open-flow]').last().click();
  assert.equal(await page.locator('#screen .wireframe').count(),1);await page.locator('#next').click();
  assert.match(await page.locator('#screen').textContent(),/다시 시도/);
  assert.match(await page.locator('#inspector').textContent(),/code-quality-context-and-contracts/);
  assert.match(await page.locator('#scenario-cases').textContent(),/case-error/);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Viewport overflow');
  await page.locator('#board-toggle').click();assert.equal(await page.locator('#board .wireframe').count(),2);
  assert.deepEqual(await page.locator('.board-node').evaluateAll(nodes=>nodes.filter(n=>n.scrollWidth>n.clientWidth+1).map(n=>n.textContent)),[]);
 }
 await page.locator('.scene-head button[id^="page-"]').last().click();assert.match(await page.locator('#screen').textContent(),/최근 검색: error/);
 checks.push('wireframe: cross-page state projection, keyboard route selection, error scenario, learned/version, tests, board; widths 1440/390');
 await page.setViewportSize({width:1440,height:1000});await page.locator('.scene-head button[id^="page-"]').first().click();await page.screenshot({path:join(output,'wireframe-error.png'),fullPage:true});
 const draft=searchDesign();draft.id='early-draft';draft.designState='draft';draft.scenarios=[];draft.testCases=[];draft.checks=[];
 const draftSaved=await saveProjectAnalysis(proposedRoot,systemRoot,{expectedHash:null,record:{kind:'flow',data:draft}});
 const draftView=await renderProjectFlow(proposedRoot,systemRoot,{id:draft.id,expectedHash:draftSaved.hash,allowUnverified:true});
 await page.goto(pathToFileURL(draftView.path).href);await page.locator('.route-node').click();await page.getByRole('button',{name:'화면 구조 보기',exact:true}).click();assert.equal(await page.locator('#screen .wireframe').count(),1);
 checks.push('draft without invented scenarios opens its wireframe');assert.deepEqual(errors,[]);
 const report={output,checks,sourceHashes,actualPreview:actual.path,wireframePreview:proposed.path,browserErrors:errors,limits:['HTTP results are injected; no backend verification','Learned link display checked, not semantic correctness','Chromium only']};
 await write(join(output,'report.json'),report);console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
