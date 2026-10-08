// Authored evaluation corpus only; never modifies the repository knowledge catalog.
import {readFile,writeFile,mkdir,rm} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {addKnowledgeNote,readKnowledgeDocument,reviewKnowledgeSource,markKnowledgeSynced,validateKnowledgeSync,knowledgeStatus} from '../../../../dist/src/application/knowledge/catalog.js';
import {contentHash} from '../../../../dist/src/application/knowledge/reference-index.js';
const here=fileURLToPath(new URL('.',import.meta.url));
const root=resolve(process.argv[2]||'.');
if(!root.includes('fs-v10-') || !root.endsWith('/runtime')) throw Error('Isolated v10 runtime required');
await rm(join(root,'references/learned'),{recursive:true,force:true});
await mkdir(join(root,'references/learned'),{recursive:true});
const index={version:3,entries:[],outcomes:[],triggerChecks:[],retrievalChecks:[]};
for(const spec of JSON.parse(await readFile(join(here,'knowledge-specs.json'),'utf8'))){
 const body=await readFile(join(here,'corpus',spec.file),'utf8');
 const note=await addKnowledgeNote(root,{title:spec.title,content:body});
 const source=await readKnowledgeDocument(root,note.document.id);
 await reviewKnowledgeSource(root,note.document.id,source.sourceHash,source.metadataHash,source.reviewHash,{
 status:'approved',reviewer:'host',summary:'Authored conditional experimental note; no project decision or mandatory rule',scope:'v10 isolated planning corpus',
 claims:[{quote:body.split('\n').filter(Boolean)[1],assessment:'Conditional design advice with exclusions, not project facts',evidence:'Authored note preserved verbatim',verdict:'qualified'}],
 conditions:[spec.condition],exclusions:[spec.exclusion],unresolved:[]});
 await writeFile(join(root,'references/learned',spec.file),body);
 index.entries.push({id:spec.id,kind:'concept',title:spec.title,summary:spec.title+'; trace caller conditions before adoption.',path:spec.file,contentHash:contentHash(body),keywords:spec.keywords,domains:[],technologies:[],excludedTechnologies:[],conditions:[spec.condition],exclusions:[spec.exclusion],evidenceKind:'experience',review:'reviewed',sources:{[note.document.id]:note.document.contentHash},related:[],routing:{mode:'direct',reason:'Conditional advice, not automatic policy'},triggers:[...(spec.staticCall ? [{kind:'call',value:spec.staticCall}] : []),{kind:'semantic',value:'design.'+spec.id,description:spec.condition}],checks:[{id:spec.id,question:'Which observed owner and contract make this advice applicable?',guidance:'Read the conditional note, respect exclusions and explicit owner decisions; keep unsupported changes open.',verification:'review'}]});
 index.outcomes.push({sourceId:note.document.id,sourceHash:note.document.contentHash,action:'represented',reason:'Verbatim note and conditional metadata; no mandatory promotion'});
 index.triggerChecks.push({signals:[spec.staticCall ? {kind:'call',value:spec.staticCall} : {kind:'semantic',value:'design.'+spec.id}],technologies:[],expectedIds:[spec.id],forbiddenIds:[]},{signals:[{kind:'call',value:'unrelated#utility'}],technologies:[],expectedIds:[],forbiddenIds:[spec.id]});
 index.retrievalChecks.push({query:spec.title,technologies:[],expectedIds:[spec.id],forbiddenIds:[]});
}
await writeFile(join(root,'references/learned/index.json'),JSON.stringify(index,null,2));
const ids=index.outcomes.map(r=>r.sourceId);const validation=await validateKnowledgeSync(root,ids);await markKnowledgeSynced(root,ids);
console.log(JSON.stringify({validation,status:await knowledgeStatus(root)}));
