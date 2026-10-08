import {readFile} from 'node:fs/promises';

const names = process.argv.slice(2);
if (!names.length || names.length > 8) {
  console.error('Usage: node <plugin-root>/bundle/tool-help.mjs <tool-name> [up to 8 names]. Read only the schemas you need.');
  process.exitCode = 2;
} else {
  const {tools, payloadSchemas = {}} = JSON.parse(await readFile(new URL('./tool-schemas.json', import.meta.url), 'utf8'));
  const selected = names.map(name => tools.find(tool => tool.name === name));
  const missing = names.filter((_, index) => !selected[index]);
  if (missing.length) {
    console.error(`Unknown tool: ${missing.join(', ')}`);
    process.exitCode = 2;
  } else {
    console.log(JSON.stringify(selected.map(({name, description, inputSchema}) => ({name, description, inputSchema, ...(payloadSchemas[name] ? {payloadSchema: payloadSchemas[name]} : {})}))));
  }
}
