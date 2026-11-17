import {createHash} from 'node:crypto';
import {mkdir,readFile,readdir,realpath,rm,writeFile,lstat} from 'node:fs/promises';
import {dirname,join,resolve} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import * as z from 'zod/v4';
import {localPath,sha256} from './policy.js';
import {projectFileBytes} from './source-file.js';
import {atomic,directory,digest,locked,recordId} from './workflow-store.js';

export const skillName=z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(63);
const text=z.string().trim().min(1).max(2000);
const originSchema=z.strictObject({url:z.url(),revision:z.string().regex(/^[a-f0-9]{40,64}$/),license:text,attribution:text});
export const saveSkillInput=z.strictObject({name:skillName,content:z.string().min(1).max(64000),expectedHash:sha256.nullable(),origin:originSchema.optional()});
export const pinSkillsInput=z.strictObject({id:recordId,selections:z.array(z.strictObject({name:skillName,reason:text})).min(1).max(12)});
export const skillEvaluationInput=z.strictObject({name:skillName,expectedHash:sha256,expectedCaseHash:sha256,evaluator:z.enum(['host','user']),
  cases:z.array(z.strictObject({id:recordId,result:z.enum(['passed','failed','not-run']),observation:text,
    evidence:z.array(z.strictObject({path:localPath,hash:sha256})).max(20)})).min(1).max(100),
});
const bytesHash=(value:Buffer)=>createHash('sha256').update(value).digest('hex');
const missing=(error:unknown)=>(error as NodeJS.ErrnoException).code==='ENOENT';
const packagePath=(path:string)=>/^(skills|references|mandatory-rules)\//.test(path);

/** Parse only the required scalar fields; preserve all other frontmatter verbatim on save. */
export function skillMetadata(content:string){
  const match=/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(content);
  if(!match)throw new Error('Skill requires YAML frontmatter');
  const lines=match[1]!.split(/\r?\n/);
  const scalar=(key:string)=>{
    const indexes=lines.flatMap((line,i)=>new RegExp('^'+key+'\\s*:').test(line)?[i]:[]);
    if(indexes.length!==1)throw new Error(`Skill needs exactly one ${key}`);
    const index=indexes[0]!,value=lines[index]!.slice(lines[index]!.indexOf(':')+1).trim();
    if(/^[>|][-+]?$/.test(value)){
      const block=[];for(let i=index+1;i<lines.length&&(/^\s/.test(lines[i]!)||!lines[i]!.trim());i++)block.push(lines[i]!.trim());
      return block.join(value.startsWith('>')?' ':'\n').trim();
    }
    if(value.startsWith('"'))return z.string().parse(JSON.parse(value));
    if(value.startsWith("'")){if(!/^'(?:[^']|'')*'$/.test(value))throw new Error('Unclosed frontmatter scalar');return value.slice(1,-1).replaceAll("''", "'");}
    // shortcut: required metadata uses plain/quoted/block scalars; add a YAML parser if imports need aliases or complex syntax.
    if(!value||/^(?:true|false|null|~|[-+]?\d+(?:\.\d+)?)$/i.test(value)||/^[&*!{[]/.test(value)||value.includes(' #')||value.includes(': '))throw new Error(`Quote the ${key} scalar`);
    return value;
  };
  const name=skillName.parse(scalar('name')),description=text.parse(scalar('description'));
  if(!content.slice(match[0].length).trim())throw new Error('Skill body is empty');
  return {name,description};
}

function links(content:string,path:string){
  return [...content.matchAll(/\]\(<?([^\s)>]+)>?(?:\s+"[^"]*")?\)/g)].flatMap(match=>{
    const target=match[1]!.split('#')[0]!;
    if(!target||/^[a-z][a-z0-9+.-]*:/i.test(target))return [];
    const absolute=resolve('/',dirname(path),decodeURIComponent(target)),normalized=absolute.slice(1);
    if(!packagePath(normalized))throw new Error(`Skill link leaves packaged guidance: ${path} -> ${target}`);
    return [normalized];
  });
}

async function skillFiles(root:string,name:string){
  const found:string[]=[];
  async function visit(path:string){
    let entries;try{entries=await readdir(join(root,path),{withFileTypes:true});}catch(error){if(missing(error))return;throw error;}
    for(const entry of entries){
      const next=path+'/'+entry.name;
      if(entry.isSymbolicLink())throw new Error(`Skill files cannot be symlinks: ${next}`);
      if(entry.isDirectory())await visit(next);else if(entry.isFile())found.push(next);
    }
  }
  const folder=join(root,'skills',name);
  try{if((await lstat(folder)).isSymbolicLink())throw new Error('Skill directory cannot be a symlink');}catch(error){if(!missing(error))throw error;}
  await visit('skills/'+name);return found;
}

export async function inspectSkill(root:string,name:string,override?:Map<string,Buffer>){
  skillName.parse(name);
  const entry=`skills/${name}/SKILL.md`,queue=[entry,...await skillFiles(root,name)],files=new Map<string,Buffer>();
  let size=0;
  while(queue.length){
    const path=queue.shift()!;if(files.has(path))continue;
    const absolute=resolve(await realpath(root),path);
    if(!override?.has(path)&&await realpath(absolute)!==absolute)throw new Error('Guidance cannot traverse symlinks');
    const data=override?.get(path)??await projectFileBytes(root,path);
    size+=data.length;if(size>8*1024*1024||files.size>=500)throw new Error('Skill reference closure exceeds 8 MiB or 500 files');
    files.set(path,data);
    if(path.endsWith('.md'))queue.push(...links(data.toString('utf8'),path));
  }
  for(const [path,data] of override??[])if(!files.has(path)){files.set(path,data);}
  const metadata=skillMetadata(files.get(entry)!.toString('utf8'));if(metadata.name!==name)throw new Error('Skill name must match its directory');
  const hashes=Object.fromEntries([...files].sort(([a],[b])=>a.localeCompare(b)).map(([path,data])=>[path,bytesHash(data)]));
  const originData=files.get(`skills/${name}/origin.json`);
  const origin=originData?originSchema.parse(JSON.parse(originData.toString('utf8'))):null;
  return {...metadata,hash:digest(JSON.stringify(hashes)),files:hashes,origin,contents:files};
}

export async function listSkills(root:string){
  const entries=await readdir(join(root,'skills'),{withFileTypes:true});
  const skills=[];
  for(const entry of entries.sort((a,b)=>a.name.localeCompare(b.name))){
    if(entry.isSymbolicLink())throw new Error('Skill directories cannot be symlinks');
    if(!entry.isDirectory())continue;
    try{const {contents,files,...skill}=await inspectSkill(root,entry.name);skills.push({...skill,valid:true,fileCount:Object.keys(files).length,bytes:[...contents.values()].reduce((n,b)=>n+b.length,0)});}
    catch(error){skills.push({name:entry.name,valid:false,error:String(error)});}
  }
  return {root:resolve(root),skills,valid:skills.every(s=>s.valid),meaning:'Metadata, confined references and content identity only; behavioral evaluation is separate'};
}

async function sourceCheckout(root:string){
  const actual=await realpath(root);
  if(/[\/]plugins[\/](cache|marketplaces)[\/]/.test(actual))throw new Error('Do not modify an installed plugin cache');
  const {stdout}=await promisify(execFile)('git',['-C',actual,'rev-parse','--show-toplevel']);
  if(await realpath(stdout.trim())!==actual||JSON.parse(await readFile(join(actual,'package.json'),'utf8')).name!=='frontend-system')throw new Error('Choose an explicit FS source checkout');
  return actual;
}

export async function saveSkill(root:string,input:z.input<typeof saveSkillInput>){
  const data=saveSkillInput.parse(input),source=await sourceCheckout(root);
  const metadata=skillMetadata(data.content);if(metadata.name!==data.name)throw new Error('Skill name differs from requested directory');
  return locked(source,async()=>{
    let current:Awaited<ReturnType<typeof inspectSkill>>|undefined;
    let exists=true;try{await lstat(join(source,`skills/${data.name}/SKILL.md`));}catch(error){if(!missing(error))throw error;exists=false;}
    if(exists)current=await inspectSkill(source,data.name);
    if((current?.hash??null)!==data.expectedHash)throw new Error('Skill changed; read its current hash before saving');
    const path=`skills/${data.name}/SKILL.md`,overrides=new Map([[path,Buffer.from(data.content)]]);
    if(data.origin)overrides.set(`skills/${data.name}/origin.json`,Buffer.from(JSON.stringify(data.origin,null,2)+'\n'));
    await inspectSkill(source,data.name,overrides);
    const folder=join(source,'skills',data.name);await mkdir(folder,{recursive:true});
    if(await realpath(folder)!==join(source,'skills',data.name))throw new Error('Skill directory cannot traverse a symlink');
    if(data.origin)await atomic(join(folder,'origin.json'),overrides.get(`skills/${data.name}/origin.json`)!.toString());
    await atomic(join(folder,'SKILL.md'),data.content);
    const {contents,...saved}=await inspectSkill(source,data.name);void contents;
    return {...saved,status:'draft' as const,meaning:'Saved to source only; not installed, semantically approved or published'};
  });
}

const receiptSchema=z.strictObject({version:z.literal(1),id:recordId,pluginVersion:z.string(),manifestHash:sha256.nullable(),
  selections:z.array(z.strictObject({name:skillName,hash:sha256,reason:text})).min(1),files:z.record(localPath,sha256),createdAt:z.string()});

export async function pinSkills(project:string,systemRoot:string,input:z.input<typeof pinSkillsInput>){
  const data=pinSkillsInput.parse(input);
  if(new Set(data.selections.map(s=>s.name)).size!==data.selections.length)throw new Error('Select each skill once');
  const files=new Map<string,Buffer>(),selections:Array<{name:string;reason:string;hash:string}>=[];
  for(const selection of data.selections){const skill=await inspectSkill(systemRoot,selection.name);selections.push({...selection,hash:skill.hash});for(const [path,body] of skill.contents){if(files.has(path)&&!files.get(path)!.equals(body))throw new Error('Shared guidance changed during selection');files.set(path,body);}}
  if(files.size>1000||[...files.values()].reduce((n,b)=>n+b.length,0)>16*1024*1024)throw new Error('Combined skill snapshot exceeds its size budget');
  let manifest:Buffer|undefined;try{manifest=await readFile(join(systemRoot,'release-manifest.json'));}catch(error){if(!missing(error))throw error;}
  const receipt=receiptSchema.parse({version:1,id:data.id,pluginVersion:JSON.parse(await readFile(join(systemRoot,'package.json'),'utf8')).version,
    manifestHash:manifest?bytesHash(manifest):null,selections,files:Object.fromEntries([...files].map(([path,body])=>[path,bytesHash(body)])),createdAt:new Date().toISOString()});
  return locked(project,async()=>{
    const parent=await directory(project,'skill-runs'),folder=join(parent,data.id);await mkdir(folder,{mode:0o700});
    try{
      for(const [path,body] of files){const target=join(folder,'files',path);await mkdir(dirname(target),{recursive:true});await writeFile(target,body,{flag:'wx'});}
      const body=JSON.stringify(receipt);await writeFile(join(folder,'receipt.json'),body,{flag:'wx'});
      return {id:data.id,hash:digest(body),selections,path:join(folder,'receipt.json'),meaning:'Frozen skill guidance; resume by this id/hash, never silently select the latest version. Runtime and tool permissions are not frozen.'};
    }catch(error){await rm(folder,{recursive:true,force:true});throw error;}
  });
}

export async function readSkillRun(project:string,id:string,expectedHash:string){
  recordId.parse(id);sha256.parse(expectedHash);
  const base=await realpath(project),folder=join(base,'.frontend-system/skill-runs',id);
  if(await realpath(folder)!==folder)throw new Error('Skill run cannot traverse symlinks');
  const receiptPath=join(folder,'receipt.json');if(await realpath(receiptPath)!==receiptPath)throw new Error('Skill receipt cannot be a symlink');
  const body=await readFile(receiptPath,'utf8');if(digest(body)!==expectedHash)throw new Error('Skill run receipt changed');
  const receipt=receiptSchema.parse(JSON.parse(body));if(receipt.id!==id)throw new Error('Skill run identity mismatch');
  for(const [path,hash] of Object.entries(receipt.files)){
    if(!packagePath(path))throw new Error('Invalid snapshot guidance path');
    const target=join(folder,'files',path);if(await realpath(target)!==target||!(await lstat(target)).isFile())throw new Error('Snapshot file cannot traverse symlinks');
    if(bytesHash(await readFile(target))!==hash)throw new Error(`Pinned skill changed: ${path}`);
  }
  return {...receipt,hash:expectedHash,snapshotRoot:join(folder,'files'),meaning:'Verified frozen guidance, not proof of execution, model quality or current external state'};
}

export async function saveSkillEvaluation(root:string,input:z.input<typeof skillEvaluationInput>){
  const data=skillEvaluationInput.parse(input),source=await sourceCheckout(root),skill=await inspectSkill(source,data.name);
  if(skill.hash!==data.expectedHash)throw new Error('Skill changed; evaluate the current or an isolated pinned version');
  const caseFile=`test/evals/skills/${data.name}.json`,caseBytes=await projectFileBytes(source,caseFile);
  if(bytesHash(caseBytes)!==data.expectedCaseHash)throw new Error('Evaluation cases changed');
  const cases=z.object({skill:skillName,cases:z.array(z.object({id:recordId})).min(1)}).parse(JSON.parse(caseBytes.toString('utf8')));
  if(cases.skill!==data.name||new Set(cases.cases.map(c=>c.id)).size!==cases.cases.length)throw new Error('Invalid skill evaluation cases');
  if(new Set(data.cases.map(c=>c.id)).size!==data.cases.length||data.cases.some(c=>!cases.cases.some(item=>item.id===c.id)))throw new Error('Unknown or duplicate evaluation case');
  for(const c of data.cases){if(c.result!=='not-run'&&!c.evidence.length)throw new Error('Assessed cases require artifacts');for(const e of c.evidence)if(bytesHash(await projectFileBytes(source,e.path))!==e.hash)throw new Error('Evaluation artifact changed');}
  return locked(source,async()=>{
    if((await inspectSkill(source,data.name)).hash!==data.expectedHash||bytesHash(await projectFileBytes(source,caseFile))!==bytesHash(caseBytes))throw new Error('Evaluation inputs changed');
    for(const c of data.cases)for(const e of c.evidence)if(bytesHash(await projectFileBytes(source,e.path))!==e.hash)throw new Error('Evaluation artifact changed');
    const report={...data,caseHash:bytesHash(caseBytes),coverage:cases.cases.map(c=>({id:c.id,result:data.cases.find(v=>v.id===c.id)?.result??'not-run'})),authority:'host-assessment',createdAt:new Date().toISOString(),meaning:'Artifact hashes and reported observations only; no model was executed by this tool and no skill was published'};
    const content=JSON.stringify(report),hash=digest(content),folder=await directory(source,'skill-evaluations');await atomic(join(folder,hash+'.json'),content);
    return {hash,path:join(folder,hash+'.json'),coverage:report.coverage,authority:report.authority,meaning:report.meaning};
  });
}
