import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../../../test/fixtures/frontend/package.json',import.meta.url));
const {chromium}=require('@playwright/test');
const temp=await mkdtemp(join(tmpdir(),'fs-page-browser-'));
const spec=JSON.parse(await readFile(new URL('spec.json',import.meta.url)));
for(const node of spec.nodes.filter(n=>!['page','component'].includes(n.kind))){
 node.name='GrammarNoteRepositoryWithAnIntentionallyLongIdentifier';
 node.state=['findHistory({noteId,page,pageSize:10,filter:longUnbrokenParameterValue})'];
}
const input=join(temp,'input.json');await writeFile(input,JSON.stringify(spec));
const build=()=>execFileSync(process.execPath,[new URL('build.mjs',import.meta.url).pathname,input,temp]);
build();
const browser=await chromium.launch();
try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
 for(const width of [1440,1920,390]){
  await page.setViewportSize({width,height:1100});await page.goto(pathToFileURL(join(temp,'index.html')).href);
  await page.locator('.route-node').first().click();await page.locator('[data-open-flow]').first().click();
  await page.locator('#screen .structure-node[data-instance]').first().click();
  assert.ok(await page.locator('#inspector .instance').textContent());
  assert.match(await page.locator('#screen-state').textContent(),/컴포넌트 구조/);
  assert.ok(await page.locator('#external button').count());
  assert.deepEqual(await page.locator('#external button').evaluateAll(items=>items.filter(el=>el.scrollWidth>el.clientWidth+1).map(el=>el.textContent)),[],'External card text overflows');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Page overflows horizontally');
  await page.locator('#board-toggle').click();
  assert.ok(await page.locator('#board .structure-node').count(),'Board lost structural fallback');
  assert.deepEqual(await page.locator('.board-node').evaluateAll(items=>items.filter(el=>el.scrollWidth>el.clientWidth+1).map(el=>el.textContent)),[]);
 }
 await page.setViewportSize({width:1440,height:1100});await page.locator('#page-search').click();
 await page.screenshot({path:join(temp,'structural-view.png'),fullPage:true});
 // A real browser screenshot here is a renderer test asset, not product evidence.
 const image='data:image/png;base64,'+(await page.screenshot()).toString('base64');
 const capture=JSON.parse(await readFile(join(temp,'capture-input.json'),'utf8'));
 const screens=Object.fromEntries(capture.captureCoverage.missing.map(key=>[key,{image,width:1440,height:1100,regions:[]}]));
 await writeFile(join(temp,'assets.json'),JSON.stringify({...capture,screens}));build();
 await page.reload();await page.locator('.route-node').first().click();await page.locator('[data-open-flow]').first().click();
 await page.locator('#screen .screen-image').waitFor();
 assert.ok(await page.locator('#screen .screen-image').evaluate(img=>img.complete&&img.naturalWidth>0),'Capture does not decode');
 assert.equal(await page.locator('#screen .structure-node').count(),0);
 const example=new URL('../../../docs/diagrams/routed-flow/index.html',import.meta.url);
 await page.goto(example.href);
 assert.equal(await page.locator('.route-node').count(),2);
 await page.locator('.route-node').first().click();
 await page.locator('[data-open-flow]').first().click();
 await page.locator('#page-activity').click();
 await page.locator('#track [data-step="5"]').click();
 assert.match(await page.locator('#screen-state').textContent(),/populated · 실행 화면/);
 assert.ok(await page.locator('#screen .screen-image').evaluate(img=>img.complete&&img.naturalWidth>0),'README example must show the captured app');
 const actualCapture='data:image/png;base64,'+(await readFile(new URL('../../../docs/diagrams/routed-flow/captures/activity:populated.png',import.meta.url))).toString('base64');
 assert.equal(await page.locator('#screen .screen-image').getAttribute('src'),actualCapture,'README example must embed the actual activity-page capture');
 const exampleCoverage=JSON.parse(await readFile(new URL('../../../docs/diagrams/routed-flow/capture-input.json',import.meta.url),'utf8')).captureCoverage;
 assert.deepEqual(exampleCoverage,{status:'complete',expected:4,captured:4,missing:[]});
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({viewports:3,structuralFallback:true,capturedScreen:true,readmeExample:true,longNames:true,screenshot:join(temp,'structural-view.png')}));
}finally{await browser.close();}
