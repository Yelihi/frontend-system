import assert from 'node:assert/strict';
import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {browserLayout} from './layout.mjs';
import {addPlannedFlows} from './compose.mjs';

assert.ok(process.argv[2] && process.argv[3], 'Usage: node build.mjs <view-model.json> <output-directory> [planned-addition.json]');
const source = new URL('./', import.meta.url);
const output = process.argv[3] ? pathToFileURL(resolve(process.argv[3])+'/') : new URL('../../../dist/component-flow-explorer/', source);
let spec = JSON.parse(await readFile(process.argv[2] ?? new URL('spec.json', source), 'utf8'));
if(process.argv[4])spec=addPlannedFlows(spec,JSON.parse(await readFile(process.argv[4],'utf8')));
assert.ok(['observed','proposed'].includes(spec.basis),'Unknown view basis');
for(const key of ['nodes','pages','instances','scenarios','navigation']){
 if(key==='navigation')spec[key]??=[];
 assert.ok(Array.isArray(spec[key]),'Missing view collection: '+key);
 for(const item of spec[key])assert.match(item.id,/^[a-zA-Z][a-zA-Z0-9_-]*$/,'Unsafe or missing view ID');
}
assert.ok(spec.pages.length && spec.scenarios.length,'View needs pages and scenarios');
for(const node of spec.nodes){for(const key of ['state','events','lifecycle','props'])assert.ok(Array.isArray(node[key]),'Node needs '+key);}
if(spec.basis==='observed'){
 assert.match(spec.baseline?.commit??'',/^[a-f0-9]{40}$/,'Observed view needs a pinned commit');
 assert.match(spec.baseline?.flow?.hash??'',/^[a-f0-9]{64}$/,'Observed view needs a saved flow hash');
}
for (const node of spec.nodes.filter(node=>!['page','component'].includes(node.kind))) {
  assert.ok(['app','backend','external'].includes(node.environment),'Missing runtime environment');
}
for(const api of spec.browserApis??[]) {
  assert.ok(spec.nodes.some(node=>node.id===api.ownerNode && node.environment==='app'),'Browser API must reference an app owner');
  assert.ok(typeof api.name==='string' && api.name.trim(),'Browser API needs a name');
}
spec.board=browserLayout(spec);
const nodes = new Map(spec.nodes.map(node => [node.id, node]));
assert.equal(nodes.size, spec.nodes.length, 'Duplicate semantic nodes');
const instances = new Map(spec.instances.map(instance => [instance.id, instance]));
assert.equal(instances.size, spec.instances.length, 'Duplicate visual instances');
for (const node of nodes.values()) {
  const seen = new Set([node.id]);
  for (let parent = node.parent; parent; parent = nodes.get(parent).parent) {
    assert.ok(nodes.has(parent) && !seen.has(parent), 'Missing parent or cycle');
    seen.add(parent);
  }
}
for (const instance of instances.values()) {
  assert.equal(nodes.get(instance.node)?.kind, 'component');
  assert.equal(nodes.get(instance.page)?.kind, 'page');
  let owner = nodes.get(instance.node);
  while (owner.parent) owner = nodes.get(owner.parent);
  assert.equal(owner.id, instance.page, 'Instance belongs to another page');
  if (instance.parentInstance) {
    const parent = instances.get(instance.parentInstance);
    assert.equal(parent?.page, instance.page);
    assert.equal(parent?.node, nodes.get(instance.node).parent);
  }
}
const scenes = Object.fromEntries(spec.pages.map(page=>[page.id,page.scenes]));
assert.equal(new Set(spec.pages.map(page=>page.id)).size,spec.pages.length,'Duplicate page');
for (const page of spec.pages) {
  assert.equal(nodes.get(page.id)?.kind,'page');
  for(const scene of page.scenes)assert.match(scene,/^[a-zA-Z][a-zA-Z0-9_-]*$/,'Unsafe visual state ID');
  assert.ok(page.scenes.length && new Set(page.scenes).size===page.scenes.length,'Invalid scenes');
}
assert.equal(new Set((spec.navigation??[]).map(e=>e.id)).size,(spec.navigation??[]).length,'Duplicate navigation');
for(const edge of spec.navigation??[]){
 assert.ok(edge.id && scenes[edge.from] && scenes[edge.to],'Dangling navigation route');
 assert.ok(typeof edge.label==='string' && edge.label.trim() && typeof edge.condition==='string' && edge.condition.trim(),'Navigation needs trigger and condition');
 edge.basis??=spec.basis;
 assert.ok(['observed','proposed'].includes(edge.basis),'Unknown navigation basis');
 if(edge.basis==='observed')assert.ok(edge.evidence?.length,'Observed navigation needs evidence');
}
assert.equal(new Set(spec.scenarios.map(s=>s.id)).size,spec.scenarios.length,'Duplicate scenario');
for (const scenario of spec.scenarios) {
  scenario.basis??=spec.basis;
  scenario.category??='event';
  assert.ok(['event','lifecycle'].includes(scenario.category),'Unknown scenario category');
  assert.ok(['observed','proposed'].includes(scenario.basis),'Unknown scenario basis');
  assert.ok(scenario.steps.length,'Scenario needs steps');
  assert.equal(new Set(scenario.steps.map(step => step.id)).size, scenario.steps.length);
  for (const step of scenario.steps) {
    assert.ok(nodes.has(step.fromNode) && nodes.has(step.toNode), 'Dangling scenario edge');
    assert.ok(scenes[step.page]?.includes(step.scene), 'Unknown visual state');
    for (const side of ['from','to']) if(step[side+'Instance']) {
      assert.equal(instances.get(step[side+'Instance'])?.node,step[side+'Node'],'Wrong edge instance');
    }
    if(step.changes)for(const change of step.changes) {
      assert.ok(nodes.has(change.ownerNode),'State owner must reference a graph node');
      assert.ok(typeof change.owner==='string' && change.owner.trim() && typeof change.field==='string' && change.field.trim(),'State change needs owner and field');
      assert.ok(Object.hasOwn(change,'before') && Object.hasOwn(change,'after'),'State change needs both values');
    }
    if (step.effects) {
      assert.equal(step.ordering, 'unordered-consumers');
      assert.ok(step.effects.length > 1, 'Impact group needs multiple consumers');
      for (const effect of step.effects) {
        assert.ok(nodes.has(effect.fromNode) && nodes.has(effect.toNode));
        assert.ok(scenes[effect.page]?.includes(effect.scene));
        if (effect.toInstance) {
          assert.equal(instances.get(effect.toInstance)?.node, effect.toNode);
          assert.equal(instances.get(effect.toInstance)?.page, effect.page);
        }
      }
    }
  }
  const related=new Set();
  const addOwner=id=>{let node=nodes.get(id);while(node?.parent)node=nodes.get(node.parent);if(node?.kind==='page')related.add(node.id);};
  for(const step of scenario.steps)for(const effect of [step,...(step.effects??[])]) {
    related.add(effect.page);addOwner(effect.fromNode);addOwner(effect.toNode);
  }
  scenario.pages=[...related];
}
assert.deepEqual(new Set(spec.board.frames.map(frame => frame.page)), new Set(spec.pages.map(page => page.id)));
for (const frame of spec.board.frames) {
  assert.ok(frame.x >= 0 && frame.y >= 0 && frame.width > 0);
  assert.ok(frame.x + frame.width <= spec.board.width && frame.y + frame.width * .75 + 50 <= spec.board.height);
}
for (const node of spec.nodes.filter(node=>!['page','component'].includes(node.kind))) {
  const placement=spec.board.placements[node.id];
  assert.ok(placement && placement.x>=0 && placement.y>=0 && placement.width>0,'Missing external placement');
  assert.ok(placement.x+placement.width<=spec.board.width && placement.y+100<=spec.board.height,'External outside board');
}
let assets = {};
try { assets = JSON.parse(await readFile(new URL('assets.json', output), 'utf8')); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
const specHash = createHash('sha256').update(JSON.stringify(spec)).digest('hex');
const boardScript = await readFile(new URL('board.js', source), 'utf8');
const routesScript = await readFile(new URL('routes.js', source), 'utf8');
const template = (await readFile(new URL('viewer.html', source), 'utf8'))
  .replace('/*__BOARD_SCRIPT__*/', () => boardScript).replace('/*__ROUTES_SCRIPT__*/', () => routesScript);
const templateHash = createHash('sha256').update(template).digest('hex');
if (Object.keys(assets).length) {
  assert.equal(assets.specHash, specHash, 'Recapture screenshots after changing the spec');
  assert.equal(assets.templateHash, templateHash, 'Recapture screenshots after changing the template');
  for (const [key, asset] of Object.entries(assets.screens)) {
    const [page, scene] = key.split(':');
    assert.ok(scenes[page]?.includes(scene));
    assert.match(asset.image, /^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/);
    assert.ok(asset.width > 0 && asset.height > 0);
    for (const region of asset.regions) {
      assert.equal(instances.get(region.instance)?.page, page);
      assert.ok(region.width > 0 && region.height > 0 && region.x >= 0 && region.y >= 0);
      assert.ok(region.x + region.width <= 1.001 && region.y + region.height <= 1.001);
    }
  }
}
const expectedScreens=spec.pages.flatMap(page=>page.scenes.map(scene=>page.id+':'+scene));
const missingScreens=expectedScreens.filter(key=>!assets.screens?.[key]);
const captureCoverage={status:missingScreens.length?'incomplete':'complete',expected:expectedScreens.length,captured:expectedScreens.length-missingScreens.length,missing:missingScreens};
await mkdir(output, {recursive: true});
const json = value => JSON.stringify(value).replaceAll('<', '\\u003c');
await writeFile(new URL('index.html', output), template.replace('/*__SPEC__*/', () => json(spec)).replace('/*__ASSETS__*/', () => json(assets.screens ?? {})));
await writeFile(new URL('rendered-model.json', output), JSON.stringify(spec,null,2)+'\n');
await writeFile(new URL('capture-input.json', output), JSON.stringify({specHash, templateHash, scenes, captureCoverage}));
console.log(JSON.stringify({path: new URL('index.html', output).pathname, semanticNodes:nodes.size, instances:instances.size, scenarios:spec.scenarios.length, capturedScreens:Object.keys(assets.screens ?? {}).length,captureCoverage}));
