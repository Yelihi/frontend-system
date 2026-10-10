import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {promisify} from 'node:util';
import test from 'node:test';
import {FileSystemProjectDiscovery} from '../src/adapters/filesystem/project-discovery.js';
import {git} from '../src/application/git-state.js';
import {checkPrReadiness} from '../src/application/pr-readiness.js';
import {prScope} from '../src/application/pr-scope.js';
import {runProjectChecks} from '../src/application/run-capabilities.js';
import {approveRevision, beginAttempt, saveExecution, saveReview, saveRevision, workflowContext} from '../src/application/workflow-store.js';
import type {VerificationPolicy} from '../src/application/policy.js';

test('PR gate binds full branch scope, fresh checks and both reviews; never models correctness', async () => {
  const root = await mkdtemp(join(tmpdir(), 'fs-pr-gate-'));
  try {
    await git(root, ['init', '-b', 'main']);
    await git(root, ['config', 'user.name', 'FS test']);
    await git(root, ['config', 'user.email', 'fs-test@example.invalid']);
    await writeFile(join(root, '.gitignore'), '.frontend-system/\n');
    await writeFile(join(root, 'package.json'), JSON.stringify({scripts: {test: 'node --test order.test.cjs'}}));
    await writeFile(join(root, 'order.cjs'), 'exports.total = xs => xs.reduce((sum, x) => sum + x, 0);');
    await writeFile(join(root, 'obsolete.txt'), 'An obsolete public contract');
    await writeFile(join(root, 'order.test.cjs'), "const {test}=require('node:test');const a=require('node:assert/strict');test('total',()=>{a.equal(require('./order.cjs').total([2,3]),5);a.equal(require('./order.cjs').total([]),0)});");
    await git(root, ['add', '.']); await git(root, ['commit', '-m', 'baseline']);
    await git(root, ['checkout', '-b', 'feature']);
    await writeFile(join(root, 'order.cjs'), 'exports.total = (xs = []) => xs.reduce((sum, x) => sum + x, 0);');
    await git(root, ['add', '.']); await git(root, ['commit', '-m', 'default empty input']);
    await rm(join(root, 'obsolete.txt'));
    await git(root, ['add', '.']); await git(root, ['commit', '-m', 'remove obsolete contract']);
    const initial = await checkPrReadiness(root, undefined, 'main');
    assert.equal(initial.status, 'blocked');
    assert.deepEqual(initial.files, ['obsolete.txt', 'order.cjs'], 'Review all branch commits, including deletions');
    await assert.rejects(prScope(root, '--help'));
    await assert.rejects(prScope(root, 'missing-base'));

    const policy: VerificationPolicy = {version: 1, rules: [{id:'orders', version:1, title:'Order contract',
      statement:'Handle empty input without hiding failures; no additional checkout behavior', layer:'domain', obligation:'required',
      conditions:[], exclusions:[], evidence:['Test task'], verification:'behavior-test', examples:[], validation:'proposed', limitations:[]}],
      checks:[{id:'order-test', script:'test', command:'node --test order.test.cjs', ruleIds:['orders']}],
      reviews:['pr-safety','pr-scope'].map(id => ({id,ruleIds:['orders'],description:id === 'pr-safety' ? 'Error paths and safety in scoped code' : 'Entire PR matches approved behavior'})), guards:[], exceptions:[]};
    const revision = await saveRevision(root, '# Empty input; remove obsolete contract', null, policy);
    await approveRevision(root, revision.hash!, 'Approve scoped fixture contract');
    const execution = {revisionHash:revision.hash!, status:'in-progress' as const,
      steps:[{id:'order', title:'Order', status:'pending' as const, files:initial.files, checkIds:[], remaining:['Review']}], note:'Test fixture'};
    const saved = await saveExecution(root, execution, null);
    const attempt = await beginAttempt(root, 'order', saved.hash);
    const discovery = new FileSystemProjectDiscovery();
    const check = await runProjectChecks(await discovery.discover(await discovery.createRef(root)), {required:true, attemptId:attempt.id});
    assert.ok(check.results.every(result => result.status === 'passed'));
    const review = {stepId:'order', attemptId:attempt.id, status:'passed' as const,
      findings:[{ruleId:'orders', files:initial.files, evidence:'Fixture host assertion over committed changes and order test; not independent semantic proof', conclusion:'Scoped fixture accepted'}],
      remaining:[], resolvedExceptions:[], prScope:initial.scope};
    const safety = await saveReview(root, {...review,reviewId:'pr-safety'});
    const incompleteScope = await saveReview(root, {...review,reviewId:'pr-scope', findings:[{...review.findings[0]!,files:['order.cjs']}]});
    const done = {...execution,status:'complete' as const,finalCheckId:check.id,
      steps:[{...execution.steps[0]!,status:'complete' as const,remaining:[],checkIds:[check.id],reviewIds:[safety.id,incompleteScope.id],attemptId:attempt.id}]};
    const completed = await saveExecution(root, done, saved.hash);
    assert.ok((await checkPrReadiness(root, undefined, 'main')).failures.some(failure => failure.includes('omitted changed files: obsolete.txt')));
    const scope = await saveReview(root, {...review,reviewId:'pr-scope'});
    done.steps[0]!.reviewIds = [safety.id,scope.id];
    await saveExecution(root, done, completed.hash);
    assert.equal((await checkPrReadiness(root, undefined, 'main')).status, 'ready');
    const cli = join(process.cwd(), 'dist/src/cli.js');
    const result = await promisify(execFile)(process.execPath, [cli,'pr-check',root,'--base','main']);
    assert.equal(JSON.parse(result.stdout).status,'ready');
    await writeFile(join(root, 'extra.cjs'), 'exports.unrequested = true;');
    assert.equal((await checkPrReadiness(root, undefined, 'main')).status,'blocked');
    await assert.rejects(promisify(execFile)(process.execPath, [cli,'pr-check',root,'--base','main']), (error: unknown) => (error as {code:number}).code === 1);
    await assert.rejects(saveReview(root, {...review,reviewId:'pr-scope'}), /uncommitted/);
    await rm(join(root,'extra.cjs'));
    const checkPath = join(root, '.frontend-system/checks', `${check.id}.json`);
    const originalCheck = await readFile(checkPath, 'utf8');
    await writeFile(checkPath, JSON.stringify({...JSON.parse(originalCheck),results:[]}));
    assert.ok((await checkPrReadiness(root,undefined,'main')).failures.some(failure => failure.includes('Final checks')));
    await writeFile(checkPath, originalCheck);
    await saveReview(root, {...review,reviewId:'pr-safety',status:'failed',remaining:['Newly identified required error path']});
    assert.equal((await checkPrReadiness(root,undefined,'main')).status,'blocked','A later failure invalidates completed evidence');
    await assert.rejects(saveExecution(root,done,(await workflowContext(root)).executionHash), /later failed review/);
    const repaired = await saveReview(root, {...review,reviewId:'pr-safety'});
    done.steps[0]!.reviewIds = [repaired.id,scope.id];
    await saveExecution(root,done,(await workflowContext(root)).executionHash);
    assert.equal((await checkPrReadiness(root,undefined,'main')).status,'ready','A newer explicit review can resolve a failed judgment');
    await git(root, ['commit','--allow-empty','-m','new PR head']);
    assert.ok((await checkPrReadiness(root,undefined,'main')).failures.some(failure => failure.includes('exact PR base/head')));
    await assert.rejects(saveReview(root, {...review,reviewId:'pr-safety'}), /PR scope changed/);
    await git(root,['branch','-f','main','HEAD']);
    assert.notEqual((await prScope(root,'main')).scope.baseCommit,initial.scope.baseCommit);
  } finally {await rm(root,{recursive:true,force:true});}
});
