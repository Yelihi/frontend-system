#!/usr/bin/env node
import {resolve} from 'node:path';
import * as z from 'zod/v4';
import {checkStylePolicy, readStylePolicy, stylePolicySchema} from './application/style-policy.js';
const [root, policyPath] = process.argv.slice(2);
try {
  if (root === '--schema') {
    process.stdout.write(JSON.stringify(z.toJSONSchema(stylePolicySchema, {io: 'input'})) + '\n');
  } else {
  if (!root || !policyPath) throw new Error('Usage: node <plugin>/bundle/style-check.js <project> <project-relative-policy.json>, or --schema');
  const report = await checkStylePolicy(resolve(root), await readStylePolicy(resolve(root), policyPath));
  process.stdout.write(JSON.stringify(report) + '\n');
  if (report.status !== 'passed') process.exitCode = 1;
  }
} catch (error) {process.stderr.write(String(error) + '\n'); process.exitCode = 1;}
