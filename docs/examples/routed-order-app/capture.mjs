import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {join, resolve} from 'node:path';

const require=createRequire(new URL('../../../test/fixtures/frontend/package.json',import.meta.url));
const {chromium}=require('@playwright/test');
const root=fileURLToPath(new URL('.',import.meta.url));
const output=resolve(process.argv[2]??'docs/diagrams/routed-flow/captures');
const files={'/':['index.html','text/html'],'/activity/':['activity/index.html','text/html'],'/app.js':['app.js','text/javascript'],'/styles.css':['styles.css','text/css']};
const server=createServer(async(request,response)=>{
 const [file,type]=files[request.url]??[];
 if(!file){response.writeHead(404).end();return;}
 response.setHeader('Content-Type',type);
 try{response.end(await readFile(join(root,file)));}catch{response.writeHead(500).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch();
const screens={};
async function capture(page,key,selector){
 const width=760,height=570;
 const region=await page.locator(selector).evaluate(el=>{const r=el.getBoundingClientRect();return {x:r.x/innerWidth,y:r.y/innerHeight,width:r.width/innerWidth,height:r.height/innerHeight};});
 const png=await page.screenshot({path:join(output,key+'.png')});
 screens[key]={image:'data:image/png;base64,'+png.toString('base64'),width,height,regions:[{instance:key.startsWith('order')?'order-form':'activity-list',...region}]};
}
try{
 await mkdir(output,{recursive:true});
 const context=await browser.newContext({viewport:{width:760,height:570}});
 const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto(base+'/');
 assert.equal(await page.locator('h1').textContent(),'Create an order');
 await capture(page,'order:idle','#order-form');
 await page.locator('#order-form button').click();
 assert.match(await page.locator('#order-result').textContent(),/Saved ORD-001/);
 await capture(page,'order:saved','.panel');
 await page.locator('#order-result a').click();
 assert.equal(new URL(page.url()).pathname,'/activity/');
 assert.match(await page.locator('#activity-list').textContent(),/Desk lamp/);
 assert.match(await page.locator('#order-count').textContent(),/1 entry/);
 await capture(page,'activity:populated','#activity-list');
 const empty=await browser.newContext({viewport:{width:760,height:570}});
 const emptyPage=await empty.newPage();await emptyPage.goto(base+'/activity/');
 assert.match(await emptyPage.locator('#activity-list').textContent(),/No orders yet/);
 await capture(emptyPage,'activity:empty','#activity-list');
 assert.deepEqual(errors,[]);
 await writeFile(join(output,'screens.json'),JSON.stringify(screens,null,2)+'\n');
 console.log(JSON.stringify({routes:['/','/activity/'],screens:Object.keys(screens),savedOrder:'ORD-001',errors}));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
