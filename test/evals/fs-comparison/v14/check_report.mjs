// Exercise the actual selector script without claiming browser/layout verification.
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {runInNewContext} from 'node:vm';
const html=readFileSync(process.argv[2],'utf8');
const data=JSON.parse(html.match(/<script id="data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const element=()=>({children:[],value:'0',textContent:'',append(...nodes){this.children.push(...nodes)},replaceChildren(...nodes){this.children=nodes}});
const ids=Object.fromEntries(['data','run','metrics','detail','missing','rows'].map(id=>[id,element()]));
ids.data.textContent=JSON.stringify(data);
runInNewContext(script,{document:{getElementById:id=>{assert.ok(ids[id],id);return ids[id]},createElement:element}});
assert.equal(ids.run.children.length,data.length);
for(const [i,r]of data.entries()){
 ids.run.value=String(i);ids.run.onchange();
 assert.equal(ids.rows.children.length,r.points.length);
 assert.equal(ids.detail.hidden,!r.chart);
 assert.equal(ids.missing.hidden,!!r.chart);
 if(r.chart)assert.equal(ids.detail.src,r.chart);
 assert.ok(ids.metrics.textContent.includes(String(r.seconds)));
}
console.log(`Selector, row counts, charts, missing-state and metrics checked for ${data.length} runs. Not browser rendering.`);
