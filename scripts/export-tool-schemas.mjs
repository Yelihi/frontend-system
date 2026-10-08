import {projectContextPayloadSchema} from '../dist/src/application/project-analysis-input.js';
import {copyFile, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import * as z from 'zod/v4';
import {revisionPayloadSchema} from '../dist/src/application/revision-input.js';
import {analysisWriteSchema} from '../dist/src/application/flow-schema.js';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';

// Export the actual bundled server's public schemas, never a handwritten copy.
const client = new Client({name: 'fs-schema-export', version: '1'});
try {
  await client.connect(new StdioClientTransport({command: process.execPath,
    args: [fileURLToPath(new URL('../bundle/mcp.js', import.meta.url))]}));
  const {tools} = await client.listTools();
  // The revision repeats citation/judgment/route schemas across new and patch inputs.
  // Standard local JSON Schema refs share those definitions without changing validation.
  await writeFile(new URL('../bundle/tool-schemas.json', import.meta.url), JSON.stringify({version: 1, tools, payloadSchemas: {save_project_context: z.toJSONSchema(projectContextPayloadSchema, {io: "input"}), save_revision: z.toJSONSchema(revisionPayloadSchema, {io: "input", reused: "ref"}), save_project_analysis: z.toJSONSchema(analysisWriteSchema, {io: "input"})}}) + '\n');
  await copyFile(new URL('./tool-help.mjs', import.meta.url), new URL('../bundle/tool-help.mjs', import.meta.url));
  console.log(`Exported read-only help for ${tools.length} MCP tools.`);
} finally { await client.close(); }
