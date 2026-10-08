import {readFile, writeFile} from 'node:fs/promises';
import {flowSchema} from '../dist/src/application/flow-schema.js';
import {flowToHtml,flowToMermaid} from '../dist/src/application/flow-view.js';
const input=new URL('../docs/examples/frontend-flow.json',import.meta.url);
const flow=flowSchema.parse(JSON.parse(await readFile(input,'utf8')));
await writeFile(new URL('../docs/examples/frontend-flow.html',import.meta.url),flowToHtml(flow,'제안 · 코드/실행 검증 전'));
await writeFile(new URL('../docs/examples/frontend-flow.mmd',import.meta.url),flowToMermaid(flow,'save-success'));
console.log('Rendered docs/examples/frontend-flow.html and .mmd from one record');
