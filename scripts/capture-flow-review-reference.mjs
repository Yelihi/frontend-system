import {chromium} from '../test/fixtures/frontend/node_modules/playwright/index.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const out=resolve('docs/experiments/flow-review/baseline'); await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1100},colorScheme:'light'});
await page.goto(pathToFileURL(resolve('test/fixtures/flow-review/reference/approved-echo.html')).href);
const frame=page.frameLocator('#codex-visualization'); await frame.locator('.review-app .navigation').waitFor();
for(const tab of ['screen','domain','graph','tests']){await frame.locator(`[data-tab="${tab}"]`).first().click();await page.screenshot({path:`${out}/${tab}.png`,fullPage:true});}
await frame.locator('[data-tab="screen"]').first().click();
for(const step of [0,2,3,4,6,8]){await frame.locator(`[data-flow-step="${step}"]`).click();await page.screenshot({path:`${out}/step-${step+1}.png`,fullPage:true});}
await writeFile(`${out}/manifest.json`,JSON.stringify({source:'test/fixtures/flow-review/reference/approved-echo.html',viewport:{width:1440,height:1100},steps:[1,3,4,5,7,9],tabs:['screen','domain','graph','tests'],note:'Unmodified approved reference; original theme. Product theme retained by user request.'},null,2));
await browser.close(); console.log('Approved reference baseline captured');
