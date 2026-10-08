// Authored synthetic corpus only. Never reviews or publishes repository knowledge.
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { addKnowledgeNote, readKnowledgeDocument, reviewKnowledgeSource, markKnowledgeSynced, validateKnowledgeSync, knowledgeStatus } from '../../../../dist/src/application/knowledge/catalog.js';
import { contentHash } from '../../../../dist/src/application/knowledge/reference-index.js';
const here = fileURLToPath(new URL('.', import.meta.url));
const [target, level] = process.argv.slice(2);
if (!target || !['K0', 'K1'].includes(level)) throw Error('Expected isolated target and K0/K1');
const root = resolve(target);
if (!root.includes('fs-v9-') || root === resolve(here, '../../../..')) throw Error('Only an isolated fs-v9 runtime is allowed');
await rm(join(root, 'references/learned'), {recursive:true, force:true});
await mkdir(join(root, 'references/learned'), {recursive:true});
const index = {version:3, entries:[], outcomes:[], triggerChecks:[], retrievalChecks:[]};
const specs = [
  {id:'request-ownership', file:'boundaries.md', title:'Request policy ownership',
   summary:'Trace shared request authentication and error ownership before extracting a common interface.',
   keywords:['request','fetch','send','authentication','boundary','error','session','retry'],
   domains:['network'], signal:'network.request-ownership',
   conditions:['Multiple callers repeat request behavior; inspect actual identity and error owners.'],
   exclusions:['Do not impose one shared mutable auth policy across independent identities.', 'No new abstraction required for an adequate existing boundary.'],
   question:'Which policy is actually shared, who owns errors, and is retry behavior authorized?',
   guidance:'Keep domain messages with domains; compare keeping current, stateless reuse and scoped instances. Ask only unresolved product choices.'},
  {id:'identity-continuity', file:'generations.md', title:'Async identity continuity',
   summary:'Captured credential equality can miss a changed logical identity; inspect replacement and asynchronous side effects.',
   keywords:['session','token','replace','async','request','stale','generation','identity'],
   domains:['state','network'], signal:'async.identity-continuity',
   conditions:['Async work reads credentials and later updates state or expires a session.'],
   exclusions:['Same-value replacement may preserve logical identity; do not force invalidation without a contract.', 'Independent owners must not share an invalidation counter.'],
   question:'What invalidates pending work, including identical credentials, and which owner should be affected?',
   guidance:'Trace every async side effect and separate identity lifetime, latest-request ordering and disposal. Ask the host contract when unknown.'},
];
if (level === 'K1') for (const spec of specs) {
  const body = await readFile(join(here, 'corpus', spec.file), 'utf8');
  const note = await addKnowledgeNote(root, {title:spec.title, content:body});
  const source = await readKnowledgeDocument(root, note.document.id);
  await reviewKnowledgeSource(root, note.document.id, source.sourceHash, source.metadataHash, source.reviewHash, {
    status:'approved', reviewer:'host', summary:'Author-reviewed conditional experiment note', scope:'Synthetic v9 planning corpus only',
    claims:[{quote:body.split('\n').filter(line => line.trim())[1], assessment:'Conditional advice with explicit exclusions; no asserted project fact', evidence:'Authored fixture, preserved verbatim in source and reference', verdict:'qualified'}],
    conditions:spec.conditions, exclusions:spec.exclusions, unresolved:[],
  });
  await writeFile(join(root,'references/learned',spec.file), body);
  index.entries.push({id:spec.id, kind:'concept', title:spec.title, summary:spec.summary, path:spec.file,
    contentHash:contentHash(body), keywords:spec.keywords, domains:spec.domains, technologies:[], excludedTechnologies:[],
    conditions:spec.conditions, exclusions:spec.exclusions, evidenceKind:'experience', review:'reviewed',
    sources:{[note.document.id]:note.document.contentHash}, related:[], routing:{mode:'direct', reason:'Conditional planning review, never an automatic rule'},
    triggers:[{kind:'call',value:'global#fetch'}, {kind:'semantic',value:spec.signal,description:spec.conditions[0]}],
    checks:[{id:spec.id, question:spec.question, guidance:spec.guidance, verification:'review'}],
  });
  index.outcomes.push({sourceId:note.document.id,sourceHash:note.document.contentHash,action:'represented',reason:'Verbatim body plus conditional metadata; no policy promotion'});
  index.triggerChecks.push(
    {signals:[{kind:'semantic',value:spec.signal}],technologies:[],expectedIds:[spec.id],forbiddenIds:[]},
    {signals:[{kind:'call',value:'unrelated#formatCurrency'}],technologies:[],expectedIds:[],forbiddenIds:[spec.id]},
  );
  index.retrievalChecks.push({query:spec.title,technologies:[],expectedIds:[spec.id],forbiddenIds:[]});
}
await writeFile(join(root,'references/learned/index.json'),JSON.stringify(index,null,2));
const ids=index.outcomes.map(row=>row.sourceId);
const validation=await validateKnowledgeSync(root,ids);
if(ids.length) await markKnowledgeSynced(root,ids);
console.log(JSON.stringify({level,validation,status:await knowledgeStatus(root)}));
