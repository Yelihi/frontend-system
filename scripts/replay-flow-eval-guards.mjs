// Recheck retained plans with current guards. Does not repair or re-score model output.
import {readFile, writeFile} from 'node:fs/promises';
import {join, resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {designContractFailures} from '../dist/src/application/design-contract.js';
import {policyProtectionFailures} from '../dist/src/application/policy.js';

const root = resolve(process.argv[2]);
const manifest = JSON.parse(await readFile(join(root, 'manifest.json'), 'utf8'));
const rows = [];
for (const cell of manifest.cells.filter(cell => cell.arm === 'fs-K1')) {
  const path = join(root, cell.id, 'plan/project/.frontend-system/plans/flow-refactor/revision.json');
  const raw = await readFile(path, 'utf8'), plan = JSON.parse(raw);
  rows.push({id: cell.id, recordedPlanHash: createHash('sha256').update(raw).digest('hex'),
    originalApproved: plan.approved,
    currentContractFailures: designContractFailures(plan.evidence, plan.policy, plan.issues),
    currentPolicyFailures: policyProtectionFailures(plan.policy)});
}
const report = {meaning: 'Post-evaluation read-only replay of declared domain authority and direct npm recursion guards. Not a new model run or proof of semantic correctness. Original plans/results are unchanged.',
  modelCalls: 0, guards: Object.fromEntries(await Promise.all(['design-contract.ts', 'policy.ts'].map(async name => [name,
    createHash('sha256').update(await readFile(new URL('../src/application/'+name, import.meta.url))).digest('hex')]))), rows};
await writeFile(join(root, 'post-eval-guard-replay.json'), JSON.stringify(report, null, 2)+'\n');
console.log(JSON.stringify(rows));
