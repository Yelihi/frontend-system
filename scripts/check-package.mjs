import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const exec = promisify(execFile);
const temp = await mkdtemp(join(tmpdir(), 'fs-package-'));
const client = new Client({ name: 'package-smoke', version: '1' });
try {
  const { stdout } = await exec('npm', ['pack', '--json', '--ignore-scripts', '--pack-destination', temp]);
  const [pack] = JSON.parse(stdout);
  assert.deepEqual(pack.files.map(file => file.path).filter(path => /^skills\/[^/]+\/SKILL.md$/.test(path)).sort(),
    ['fs-knowledge', 'fs-plan', 'fs-review', 'fs-work'].map(name => `skills/${name}/SKILL.md`));
  assert.ok(!pack.files.some(file => file.path.startsWith('knowledge/')));
  await exec('tar', ['-xzf', join(temp, pack.filename), '-C', temp]);
  // Bundled MCP must start independently of the source checkout and its node_modules.
  await client.connect(new StdioClientTransport({ command: process.execPath, args: [join(temp, 'package/bundle/mcp.js')], cwd: temp }));
  const tools = (await client.listTools()).tools.map(tool => tool.name);
  for (const name of ['save_revision', 'run_project_checks', 'begin_work_attempt', 'save_semantic_review', 'save_rule_proposal', 'check_knowledge_sources', 'read_source_change']) assert.ok(tools.includes(name), name);
  const context = await client.callTool({ name: 'inspect_project', arguments: { projectPath: temp } });
  assert.ok(!context.isError);
  console.log('Package smoke passed: four skills, no raw knowledge, standalone MCP tools.');
} finally { await client.close(); await rm(temp, { recursive: true, force: true }); }
