import assert from 'node:assert/strict';
import {readFile, writeFile, mkdir, copyFile} from 'node:fs/promises';
import {resolve, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';

// Reviewed analyses of existing eval source. This reproduces the artifacts; it is
// not an automatic analyzer for arbitrary projects. Code drift requires rereview.
const root=fileURLToPath(new URL('..',import.meta.url));
const client=new Client({name:'observed-flow-export',version:'1'});
const hash=text=>createHash('sha256').update(text).digest('hex');
const reports=[];
try {
  await client.connect(new StdioClientTransport({command:process.execPath,args:[join(root,'bundle/mcp.js')]}));
  for (const [fixture,id] of [['request','order-workspace'],['styles','ticket-selection']]) {
    const projectPath=resolve(root,'test/evals/fs-comparison/v12/projects',fixture);
    const call=async(name,args)=>{
      const result=await client.callTool({name,arguments:{projectPath,...args}});
      if(result.isError)throw new Error(JSON.stringify(result));
      return JSON.parse(result.content.find(c=>c.type==='text').text);
    };
    const data=JSON.parse(await readFile(join(root,'docs/flows',id+'.json'),'utf8'));
    const hashes=async()=>Object.fromEntries(await Promise.all(data.scope.files.map(async p=>[p,hash(await readFile(join(projectPath,p)))])));
    const before=await hashes();
    // Hashes pin the independently inspected implementation, not just matching snippets.
    const approved=JSON.parse(await readFile(join(root,'docs/flows/source-hashes.json'),'utf8'))[fixture];
    assert.deepEqual(before,approved,'Source changed: review the analysis before repinning source-hashes.json');
    const prior=(await call('get_project_analysis',{kind:'flow',ids:[id]})).records[0];
    await mkdir(join(projectPath,'.frontend-system/drafts'),{recursive:true});
    const draftFile='.frontend-system/drafts/'+id+'.json';
    await writeFile(join(projectPath,draftFile),JSON.stringify({expectedHash:prior?.hash??null,record:{kind:'flow',data}},null,2));
    const saved=await call('save_project_analysis',{draftFile});
    const html=await call('render_project_flow',{id,expectedHash:saved.hash,format:'html'});
    const mermaid=await call('render_project_flow',{id,expectedHash:saved.hash,format:'mermaid'});
    await copyFile(html.path,join(root,'docs/flows',id+'.html'));
    await copyFile(mermaid.path,join(root,'docs/flows',id+'.mmd'));
    assert.deepEqual(await hashes(),before,'Export must not mutate application code');
    reports.push({fixture,projectPath,id,sourceHashes:before,flowHash:saved.hash,html,mermaid,
      coverage:{nodes:data.nodes.length,edges:data.edges.length,scenarios:data.scenarios.length,citations:Object.keys(data.evidence).length},sourceUnchanged:true});
  }
  await writeFile(join(root,'docs/flows/export-report.json'),JSON.stringify(reports,null,2)+'\n');
  console.log(JSON.stringify(reports.map(r=>({id:r.id,path:r.html.path,...r.coverage,sourceUnchanged:r.sourceUnchanged})),null,2));
} finally {await client.close();}
