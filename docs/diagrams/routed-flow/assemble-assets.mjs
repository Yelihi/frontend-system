import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';

const input=JSON.parse(await readFile(new URL('capture-input.json',import.meta.url)));
const screens=JSON.parse(await readFile(new URL('captures/screens.json',import.meta.url)));
const expected=Object.entries(input.scenes).flatMap(([page,scenes])=>scenes.map(scene=>`${page}:${scene}`));
assert.deepEqual(Object.keys(screens).sort(),expected.sort());
for(const [key,screen] of Object.entries(screens)){
 assert.match(screen.image,/^data:image\/png;base64,/);
 assert.ok(screen.width>0&&screen.height>0&&screen.regions.length,`Invalid screen: ${key}`);
}
await writeFile(new URL('assets.json',import.meta.url),JSON.stringify({specHash:input.specHash,templateHash:input.templateHash,screens}));
