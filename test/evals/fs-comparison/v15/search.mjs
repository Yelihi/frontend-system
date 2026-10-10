// Bundled by the evaluator; calls the production search and verified reference reader.
import {readReferenceIndex, searchReferenceIndex, readIndexedReference} from '../../../../src/application/knowledge/reference-index.ts';
const root = 'learning';
const index = await readReferenceIndex(root);
if (!index || !process.argv[2]) throw new Error('Usage: node search.mjs "query"');
const candidates = searchReferenceIndex(index, process.argv[2], [], 5);
console.log(JSON.stringify({authority:'Candidates only. Check code, conditions, exclusions and current owner decisions. Exact quotes do not prove applicability.',
  candidates: await Promise.all(candidates.map(async hit => ({...hit,
    reference: await readIndexedReference(root, hit.id, 0, 12000)})))}));
