import {readFile, writeFile} from 'node:fs/promises';
import {readReferenceIndex, searchReferenceIndex, contentHash} from '../../../../dist/src/application/knowledge/reference-index.js';
const index = await readReferenceIndex('references/learned');
const cases = JSON.parse(await readFile(new URL('retrieval-cases.json', import.meta.url), 'utf8'));
const rows = cases.map(c => {
  const hits = searchReferenceIndex(index, c.query, c.technologies ?? [], 5);
  const ids = hits.map(h => h.id);
  return {...c, ids, found: c.expected ? ids.includes(c.expected) : null,
    safe: (!c.empty || ids.length === 0) && (c.forbidden ?? []).every(id => !ids.includes(id))};
});
const report = {corpusHash: contentHash(JSON.stringify(index)), casesHash:contentHash(JSON.stringify(cases)),
  groups: Object.fromEntries(['dev','holdout'].map(split => {
    const group = rows.filter(r => r.split === split);
    return [split, {expected:group.filter(r => r.expected).length, found:group.filter(r => r.found).length,
      safetyFailures:group.filter(r => !r.safe).length, candidates:group.reduce((sum,r) => sum+r.ids.length,0)}];
  })), rows};
if (!process.argv[2]) throw new Error('Supply an immutable result file');
await writeFile(process.argv[2], JSON.stringify(report,null,2)+'\n', {flag:'wx'});
console.log(JSON.stringify(report.groups));
