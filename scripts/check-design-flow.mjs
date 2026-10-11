import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {copyFile, mkdir, mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {join, resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {chromium} from '../test/fixtures/frontend/node_modules/playwright/index.mjs';
import {flowSchema} from '../dist/src/application/flow-schema.js';
import {saveProjectAnalysis} from '../dist/src/application/project-flows.js';
import {renderProjectFlow} from '../dist/src/application/render-project-flow.js';

const root=await mkdtemp(join(tmpdir(),'fs-design-browser-'));
const output=resolve('dist/design-flow-check');await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true});
try {
  const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await mkdir(join(root,'design'));
  await page.setContent(`<html lang="en"><style>body{margin:0;padding:60px;background:#f4f6fa;color:#173044;font:18px system-ui}form{padding:32px;width:440px;border:1px solid #b4c9d2;border-radius:16px;background:white}label,input{display:block;margin:16px 0}input,button{font:inherit;padding:12px}button{background:#096779;color:white;border:0;border-radius:6px}</style><body><p>FS browser fixture — not a user project</p><h1>Edit order</h1><form><h2>Order #42</h2><label>Quantity<input type="number" value="2"></label><p>Total: $48</p><button type="button">Save order</button></form></body></html>`);
  const box=await page.locator('form').boundingBox();
  await page.screenshot({path:join(root,'design/page.png')});
  const data=await readFile(join(root,'design/page.png'));
  const image={path:'design/page.png',hash:createHash('sha256').update(data).digest('hex'),alt:'Synthetic order editor screenshot for browser verification'};
  await writeFile(join(root,'design/answers.md'),'Fixture confirmation: accept this exact mockup.\nFixture request: detail the component design.');
  const flow=flowSchema.parse({id:'design-ui',title:'Image-led flow — browser fixture',basis:'proposed',summary:'Synthetic fixture testing image embedding and component links, not an actual project design.',
    scope:{files:['design/page.png','design/answers.md'],discoveryRoots:['design']},evidence:{
      confirm:{path:'design/answers.md',quote:'Fixture confirmation: accept this exact mockup.'},
      request:{path:'design/answers.md',quote:'Fixture request: detail the component design.'}},
    nodes:[{id:'edit-page',kind:'page',label:'OrderEditPage',evidence:[]}],edges:[],scenarios:[],
    design:{stage:'visual-review',screens:[{id:'editor',page:'edit-page',title:'Order editor',reference:image,image,feedback:['Fixture: keep the quantity field visible.']}]},limitations:['No real user confirmation; no AI mockup generation tested.']});
  const saved=await saveProjectAnalysis(root,process.cwd(),{expectedHash:null,record:{kind:'flow',data:flow}});
  const preview=await renderProjectFlow(root,process.cwd(),{id:flow.id,expectedHash:saved.hash,allowUnverified:true});
  await page.goto(pathToFileURL(preview.path).href);
  assert.equal(await page.locator('.design-gallery img').count(),2);
  assert.ok(await page.locator('.design-gallery img').evaluateAll(images=>images.every(i=>i.complete&&i.naturalWidth>0)));
  assert.equal(await page.locator('#scenario').count(),0);
  assert.equal(await page.locator('.design-region').count(),0);
  await copyFile(preview.path,join(output,'visual-review.html'));
  const detailed=flowSchema.parse(JSON.parse(await readFile('docs/examples/frontend-flow.json','utf8')));
  detailed.id=flow.id;detailed.title=flow.title;detailed.summary=flow.summary;detailed.scope=flow.scope;detailed.evidence=flow.evidence;
  detailed.design=structuredClone(flow.design);detailed.design.stage='detailed-design';detailed.design.detailRequest='request';
  detailed.design.screens[0].confirmation={evidence:'confirm',imageHash:image.hash};
  detailed.design.screens[0].regions=[{node:'form',x:box.x/1280*100,y:box.y/900*100,width:box.width/1280*100,height:box.height/900*100}];
  detailed.design.quality=[{category:'accessibility',requirement:'Quantity field has an accessible name.',verification:'Inspect accessible name and keyboard tab order.',nodes:['form']}];
  const next=await saveProjectAnalysis(root,process.cwd(),{expectedHash:saved.hash,record:{kind:'flow',data:detailed}});
  const rendered=await renderProjectFlow(root,process.cwd(),{id:next.id,expectedHash:next.hash,allowUnverified:true,scenarioId:'save-failure'});
  await page.goto(pathToFileURL(rendered.path).href);
  await page.locator('.design-region').click();
  assert.equal(await page.evaluate(()=>document.activeElement.dataset.node),'form');
  assert.match(await page.locator('[data-node="form"] .contract').innerText(),/OrderFormProps/);
  assert.equal(await page.locator('#page-impact button').count(),2);
  await page.screenshot({path:join(output,'desktop.png'),fullPage:true});
  await page.setViewportSize({width:390,height:844});
  await page.locator('.design-region').click();
  assert.equal(await page.evaluate(()=>document.activeElement.dataset.node),'form');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  assert.deepEqual(errors,[]);
  await page.screenshot({path:join(output,'mobile.png'),fullPage:true});
  await copyFile(rendered.path,join(output,'detailed-design.html'));
  console.log(JSON.stringify({passed:true,imagesDecoded:2,visualReviewHasNoTechnicalGraph:true,componentLink:'form',crossPageLinks:2,mobileOverflow:false,jsErrors:errors,artifacts:output}));
} finally {await browser.close();await rm(root,{recursive:true,force:true});}
