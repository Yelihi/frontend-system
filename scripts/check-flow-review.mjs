import assert from 'node:assert/strict';
import {chromium} from '../test/fixtures/frontend/node_modules/playwright/index.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const out=resolve('docs/experiments/flow-review/browser');await mkdir(out,{recursive:true});
const url=name=>pathToFileURL(resolve(`docs/experiments/flow-review/project/.frontend-system/diagrams/${name}.html`)).href;
const browser=await chromium.launch({headless:true});const errors=[],checks=[],geometry=[];
const page=await browser.newPage({viewport:{width:1440,height:1100},colorScheme:'light'});
page.on('pageerror',error=>errors.push(error.message));
const check=(label,value)=>{assert.ok(value,label);checks.push(label);};
const screenshot=async options=>{await page.mouse.move(1,1);await page.keyboard.press('Escape');return page.screenshot(options);};
const settle=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
try{
 await page.goto(url('echo-save-response-loss'));await page.locator('.navigation').waitFor();await page.evaluate(()=>localStorage.clear());await page.reload();
 check('four approved tabs',await page.locator('.navigation button').count()===4);
 check('nine canonical steps',await page.locator('[data-flow-step]').count()===9);
 check('no new Echo functions',await page.locator('.flow-heading').innerText().then(v=>v.includes('신규 함수 0')));
 for(const width of [1440,1024,390,320]){
  await page.setViewportSize({width,height:1100});
  for(let step=0;step<9;step++){
   await page.locator(`[data-flow-step="${step}"]`).click();await settle();
   const data=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,paths:[...document.querySelectorAll('[data-edge]')].map(el=>({id:el.dataset.edge,from:el.dataset.from,to:el.dataset.to,points:JSON.parse(el.dataset.points)})),expected:document.querySelectorAll('.flow-path-list>b,.flow-path-list>span').length,routeStatus:document.querySelector('[data-route-status]').textContent,
     alignment:[...document.querySelectorAll('.field-owner')].map(el=>Math.abs(el.querySelector('.symbol').getBoundingClientRect().left-el.querySelector('.field-identity').getBoundingClientRect().left)),
     obstacles:[...document.querySelectorAll('.flow-canvas [data-flow-endpoint],.flow-canvas .partner,.flow-canvas .orb')].map(el=>{const r=el.getBoundingClientRect(),o=document.querySelector('.flow-canvas').getBoundingClientRect();return {id:el.dataset.flowEndpoint,left:r.left-o.left,right:r.right-o.left,top:r.top-o.top,bottom:r.bottom-o.top};})}));
   geometry.push({width,step:step+1,...data});
   check(`${width}px step ${step+1}: no overflow`,data.scroll<=width+1);
   check(`${width}px step ${step+1}: all edges routed`,!data.routeStatus&&data.paths.length===data.expected);
   check(`${width}px step ${step+1}: left alignment`,data.alignment.every(v=>v<=1));
   for(const edge of data.paths)for(let i=1;i<edge.points.length;i++){
    const a=edge.points[i-1],b=edge.points[i];
    check(`${width}px ${edge.id} segment ${i}: avoids nodes`,!data.obstacles.some(r=>a[0]===b[0]?a[0]>r.left+.5&&a[0]<r.right-.5&&Math.max(a[1],b[1])>r.top+.5&&Math.min(a[1],b[1])<r.bottom-.5:a[1]>r.top+.5&&a[1]<r.bottom-.5&&Math.max(a[0],b[0])>r.left+.5&&Math.min(a[0],b[0])<r.right-.5));
   }
   if([0,2,3,4,6,8].includes(step))await screenshot({path:`${out}/${width}-step-${step+1}.png`,fullPage:true});
  }
  await page.locator('[data-tab="graph"]').first().click();await settle();
  const graph=await page.evaluate(()=>{const o=document.querySelector('.graph-grid').getBoundingClientRect();return {paths:[...document.querySelectorAll('[data-edge]')].map(el=>({id:el.dataset.edge,points:JSON.parse(el.dataset.points)})),obstacles:[...document.querySelectorAll('[data-graph-node]')].map(el=>{const r=el.getBoundingClientRect();return {left:r.left-o.left,right:r.right-o.left,top:r.top-o.top,bottom:r.bottom-o.top};}),status:document.querySelector('[data-route-status]').textContent,overflow:document.documentElement.scrollWidth>innerWidth+1};});
  check(`${width}px dependency graph routes all nine edges`,graph.paths.length===9&&!graph.status);check(`${width}px graph no overflow`,!graph.overflow);
  for(const edge of graph.paths)for(let i=1;i<edge.points.length;i++){const a=edge.points[i-1],b=edge.points[i];check(`${width}px graph ${edge.id} segment ${i}: avoids nodes`,!graph.obstacles.some(r=>a[0]===b[0]?a[0]>r.left+.5&&a[0]<r.right-.5&&Math.max(a[1],b[1])>r.top+.5&&Math.min(a[1],b[1])<r.bottom-.5:a[1]>r.top+.5&&a[1]<r.bottom-.5&&Math.max(a[0],b[0])>r.left+.5&&Math.min(a[0],b[0])<r.right-.5));}
  await screenshot({path:`${out}/${width}-graph.png`,fullPage:true});
  await page.locator('[data-tab="screen"]').first().click();
 }
 await page.setViewportSize({width:1440,height:1100});
 const reference=await browser.newPage({viewport:{width:1440,height:1100},colorScheme:'light'});
 await reference.goto(pathToFileURL(resolve('test/fixtures/flow-review/reference/approved-echo.html')).href);
 const ref=reference.frameLocator('#codex-visualization');await ref.locator('.navigation').waitFor();
 const comparison=resolve('docs/experiments/flow-review/comparison');await mkdir(comparison,{recursive:true});
 for(const step of [0,2,3,4,6,8]){
  await ref.locator(`[data-flow-step="${step}"]`).click();await page.locator(`[data-flow-step="${step}"]`).click();await settle();
  await reference.mouse.move(1,1);await reference.keyboard.press('Escape');await page.mouse.move(1,1);await page.keyboard.press('Escape');
  await ref.locator('.review-app').screenshot({path:`${comparison}/reference-step-${step+1}.png`});await page.locator('.review-app').screenshot({path:`${comparison}/implementation-step-${step+1}.png`});
 }
 for(const tab of ['domain','graph','tests']){
  await ref.locator(`[data-tab="${tab}"]`).first().click();await page.locator(`[data-tab="${tab}"]`).first().click();
  if(tab==='tests'){await ref.locator('[data-test="p-db"]').first().click();await page.locator('[data-test="p-db"]').first().click();}
  await settle();await reference.mouse.move(1,1);await reference.keyboard.press('Escape');await page.mouse.move(1,1);await page.keyboard.press('Escape');await ref.locator('.review-app').screenshot({path:`${comparison}/reference-${tab}.png`});await page.locator('.review-app').screenshot({path:`${comparison}/implementation-${tab}.png`});
 }
 await reference.close();await page.locator('[data-tab="screen"]').first().click();
 await page.locator('[data-flow-step="4"]').click();await settle();
 await page.locator('[data-function="turn"]').hover();check('hover opens matching contract',await page.locator('.function-popup').isVisible());check('popup belongs to selected function',await page.locator('.function-popup').innerText().then(v=>v.includes('useRecordingTurn')));
 await page.locator('.function-popup').hover();check('popup remains open when entering',await page.locator('.function-popup').isVisible());
 await page.keyboard.press('Escape');check('Escape closes popup',await page.locator('.function-popup').isHidden());
 await page.locator('[data-function="capture"]').focus();check('focus opens contract',await page.locator('.function-popup').isVisible());await page.keyboard.press('Escape');
 for(const id of ['j-state','j-id','j-lock','j-conflict','p-ui','p-db','m-a11y']){await page.locator(`[data-test="${id}"]`).first().click();await page.locator(`[data-confirm="${id}"]`).check();}
 check('confirming plans does not execute tests',(await page.locator('.footer').innerText()).includes('실제 실행 0'));
 await page.locator('[data-action="approve"]').click();check('plan confirmation succeeds',(await page.locator('.footer').innerText()).includes('이 버전의 테스트 계획 확인됨'));
 await page.locator('[data-tab="screen"]').first().click();await page.locator('[data-region="error-feedback"]').first().click();await page.locator('[data-action="edit"]').click();
 await page.locator('[data-edit="d1"]').fill('녹음을 보존했습니다. 다시 저장해 주세요.');await page.locator('[data-edit="d2"]').fill('같은 녹음 저장');await page.locator('[data-field="reason"]').fill('재시도 의미를 명확히 표시');await page.locator('[data-action="apply"]').click();
 check('edited text updates wireframe',(await page.locator('.flow-view').innerText()).includes('같은 녹음 저장'));
 check('only affected confirmations invalidated',(await page.locator('.footer').innerText()).includes('5 / 7'));
 await page.locator('[data-tab="domain"]').first().click();check('edits update contract proposal',(await page.locator('.interface-list').innerText()).includes('같은 녹음 저장'));
 await page.locator('[data-test="p-ui"]').first().click();check('edits update test conditions',(await page.locator('.test-detail').innerText()).includes('녹음을 보존했습니다.'));
 await page.reload();check('draft restores across reload',(await page.locator('.footer').innerText()).includes('5 / 7'));
 const draft=await page.evaluate(()=>JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k=>k.startsWith('fs-review:')))));
 await page.locator('[data-draft-file]').setInputFiles({name:'wrong.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({...draft,flowHash:'0'.repeat(64)}))});
 await page.waitForFunction(()=>document.querySelector('[data-storage-status]').textContent.includes('다른 흐름'));
 check('different flow draft is rejected',(await page.locator('[data-storage-status]').innerText()).includes('다른 흐름'));
 await page.locator('[data-draft-file]').setInputFiles({name:'review.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(draft))});
 await page.waitForFunction(()=>document.querySelector('[data-storage-status]').textContent.includes('불러왔습니다'));
 check('matching draft import restores confirmations',(await page.locator('.footer').innerText()).includes('5 / 7'));
 await page.evaluate(()=>{Storage.prototype.setItem=()=>{throw new DOMException('Blocked','SecurityError');};});
 await page.locator('[data-tab="domain"]').first().click();check('storage failure is visible',(await page.locator('[data-storage-status]').innerText()).includes('로컬 저장 실패'));
 await page.reload();
 for(const theme of ['light','dark']){
  await page.emulateMedia({colorScheme:theme});
  for(const tab of ['screen','domain','graph','tests']){await page.locator(`[data-tab="${tab}"]`).first().click();await settle();await screenshot({path:`${out}/${theme}-${tab}.png`,fullPage:true});}
 }
 await page.setViewportSize({width:720,height:550});await page.locator('[data-tab="screen"]').first().click();await settle();check('200 percent effective viewport has no overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await screenshot({path:`${out}/zoom-200-equivalent.png`,fullPage:true});
 const touch=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});const touchPage=await touch.newPage();
 await touchPage.goto(url('echo-save-response-loss'));await touchPage.locator('[data-function="turn"]').tap();
 check('touch opens function contract',await touchPage.locator('.function-popup').isVisible());
 const popupBounds=await touchPage.locator('.function-popup').boundingBox();check('touch popup fits viewport',popupBounds.x>=0&&popupBounds.x+popupBounds.width<=390+1&&popupBounds.y>=0&&popupBounds.y+popupBounds.height<=844+1);await touch.close();
 await page.goto(url('upload-review'));await page.locator('.navigation').waitFor();check('different fixture has one step',await page.locator('[data-flow-step]').count()===1);check('new function badge is data-driven',(await page.locator('.flow-heading').innerText()).includes('신규 함수 1'));
 await page.locator('[data-tab="tests"]').first().click();check('runner is data-driven',(await page.locator('.test-nav').innerText()).includes('Vitest'));
 await page.locator('[data-tab="domain"]').first().click();await page.locator('.interface-item').evaluate(el=>el.open=true);check('signature markup remains inert',await page.evaluate(()=>!window.injected));check('script text is displayed',(await page.locator('.interface-list').innerText()).includes('</script>'));
 check('browser has no runtime errors',errors.length===0);
 console.log(JSON.stringify({passed:checks.length,errors}));
}finally{await writeFile(`${out}/verification.json`,JSON.stringify({checks,errors,geometry},null,2));await browser.close();}
