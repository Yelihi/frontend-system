import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {resolve} from 'node:path';
import {readFile,writeFile} from 'node:fs/promises';
const client=new Client({name:'component-flow-project-test',version:'1'});
try {
 await client.connect(new StdioClientTransport({command:process.execPath,args:[resolve('bundle/mcp.js')]}));
 const args=JSON.parse(process.argv[3]??'{}');
 const result=await client.callTool({name:process.argv[2],arguments:{projectPath:resolve('dist/observed-order-project'),...args}});
 if(result.isError)throw Error(JSON.stringify(result));
 const data=JSON.parse(result.content.find(c=>c.type==='text').text);
 if(process.argv[4])await writeFile(process.argv[4],JSON.stringify(data,null,2)+'\n');
 console.log(JSON.stringify(data,null,2));
} finally {await client.close();}
