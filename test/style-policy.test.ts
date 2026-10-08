import assert from 'node:assert/strict';
import {mkdtemp, writeFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import test from 'node:test';
import {checkStylePolicy} from '../src/application/style-policy.js';

test('team class policy distinguishes inline/classes, maps, data objects and partial tokens', async () => {
  const root = await mkdtemp(join(tmpdir(), 'fs-style-'));
  const check = async (source: string, enabled = true) => {
    await writeFile(join(root, 'view.jsx'), source);
    return checkStylePolicy(root, {version: 1, files: ['view.jsx'], inlineStaticClasses: enabled});
  };
  try {
    assert.equal((await check('const data={title:"Report"}; export default () => <div className="p-4">{data.title}</div>')).status, 'passed');
    assert.equal((await check('const styles={root:"p-4"}; export default () => <div className={styles.root}/>')).diagnostics[0]?.rule, 'inline-static-classes');
    assert.equal((await check('const styles={root:"p-4"}; export default () => <div className={styles.root}/>', false)).status, 'passed');
    assert.equal((await check('export default ({bad}) => <div className={bad ? "text-red-500" : "text-green-500"}/>')).status, 'passed');
    assert.equal((await check('const data={busy:true}; export default()=> <div className={data.busy ? "p-4" : "p-2"}/>')).status,'passed');
    assert.equal((await check('export default({status})=> <div className={status.startsWith("ok") ? "p-4" : "p-2"}/>')).status,'passed');
    assert.equal((await check('const data={busy:true}; export default()=> <div className={data.busy && "p-4"}/>')).status,'passed');
    assert.equal((await check('const styles={root:"p-4"};export default({ok})=> <div className={ok ? styles.root : "p-2"}/>')).status,'failed');
    assert.equal((await check('export default()=> <div className={"p-4 " + "text-sm"}/>')).status,'passed');
    assert.equal((await check('export default({extra})=> <div className={"p-4" + " " + extra}/>')).status,'passed');
    assert.equal((await check('export default({color})=> <div className={"bg-" + color}/>')).status,'failed');
    assert.equal((await check('export default ({color}) => <div className={`text-${color}-500`}/>')).diagnostics[0]?.rule, 'complete-class-tokens');
    assert.equal((await check('export default ({extra}) => <div className={`p-4 ${extra}`}/>')).status, 'passed');
    assert.equal((await check('const styles={root:"p-4"}; const get=()=>styles.root; export default ()=><div className={get()}/>')).diagnostics[0]?.rule,'unresolved-class-helper');
    assert.equal((await check('const styles={root:"p-4"}; export default ({styles}) => <div className={styles.root}/>')).status, 'passed', 'shadowed input is not the local map');
  } finally {await rm(root, {recursive: true, force: true});}
});

test('CVA needs a bound imported definition consumed by JSX with the approved axes', async () => {
  const root = await mkdtemp(join(tmpdir(), 'fs-style-'));
  const definition = 'const button=cv("rounded",{variants:{tone:{primary:"bg-blue-500"},size:{sm:"px-2"}},defaultVariants:{tone:"primary",size:"sm"}});';
  const check = async (source: string) => {
    await writeFile(join(root,'Button.jsx'),source);
    return checkStylePolicy(root,{version:1,files:['Button.jsx'],inlineStaticClasses:true,variants:[{file:'Button.jsx',axes:['tone','size']}]});
  };
  try {
    const good='import {cva as cv} from "class-variance-authority";'+definition+'export default ({tone,size})=><button className={button({tone,size})}/>;';
    assert.equal((await check(good)).status,'passed');
    assert.equal((await check(good + 'const diagnosticId = value => `item-${value}`;')).status, 'passed');
    assert.equal((await check(good.replace('tone:"primary",size:"sm"', 'tone:`pri${"mary"}`,size:"sm"'))).status, 'passed', 'Default labels are data, not classes');
    assert.equal((await check(good.replace('primary:"bg-blue-500"', '[`pri${"mary"}`]:"bg-blue-500"'))).status, 'passed', 'Variant case labels are data');
    assert.equal((await check(good.replace('defaultVariants:', 'compoundVariants:[{tone:`pri${"mary"}`,class:"font-bold"}],defaultVariants:'))).status, 'passed');
    assert.ok((await check(good.replace('defaultVariants:', 'compoundVariants:[{tone:"primary",class:`font-${weight}`}],defaultVariants:'))).diagnostics.some(item=>item.rule==='complete-class-tokens'));
    assert.equal((await check(good.replace('=><button className={button({tone,size})}/>;', '=>{const applied=button({tone,size});return <button className={applied}/>;}'))).status,'passed');
    assert.ok((await check(good.replace('\"bg-blue-500\"','`bg-${color}-500`'))).diagnostics.some(item=>item.rule==='complete-class-tokens'));
    assert.equal((await check(good.replace('button({tone,size})','"rounded"'))).status,'failed','unused CVA does not count');
    assert.equal((await check(good.replace('import {cva as cv} from "class-variance-authority";','const cv=()=>()=>"rounded";'))).status,'failed','lookalike is not CVA');
    assert.equal((await check(good.replace('defaultVariants:{tone:"primary",size:"sm"}','defaultVariants:{tone:"primary"}'))).status,'failed');
    await writeFile(join(root,'Button.jsx'),'export default()=> <button className="rounded"/>;');
    assert.equal((await checkStylePolicy(root,{version:1,files:['./Button.jsx'],variants:[{file:'./Button.jsx',axes:['tone','size']}]})).status,'failed','relative path spelling must not skip variant checks');
    await assert.rejects(checkStylePolicy(root,{version:1,files:['Button.jsx'],variants:[{file:'Button.jsx',axes:['tone','tone']}]}), /distinct/);
    await assert.rejects(checkStylePolicy(root,{version:1,files:['Button.jsx'],variants:[{file:'Button.jsx',axes:['tone','size']},{file:'Button.jsx',axes:['tone','density']}]}), /distinct/);
    await assert.rejects(checkStylePolicy(root,{version:1,files:['../outside.jsx']}), /ENOENT|outside/);
    await assert.rejects(checkStylePolicy(root,{version:1,files:['Button.jsx'],variants:[{file:'Other.jsx',axes:['tone','size']}]}), /checked scope/);
  } finally {await rm(root,{recursive:true,force:true});}
});

test('CVA default policy preserves an approved no-default contract without weakening legacy checks', async () => {
  const root = await mkdtemp(join(tmpdir(), 'fs-style-defaults-'));
  const source = 'import {cva} from "class-variance-authority";const button=cva("",{variants:{size:{small:"text-sm"},tone:{danger:"text-red-500"}}});export default ({size,tone})=><button className={button({size,tone})}/>;';
  const check = (defaults?: 'none' | 'per-axis') => checkStylePolicy(root, {version: 1, files: ['Button.jsx'], variants: [{file: 'Button.jsx', axes: ['size', 'tone'], ...(defaults ? {defaults} : {})}]});
  try {
    await writeFile(join(root, 'Button.jsx'), source);
    assert.equal((await check('none')).status, 'passed');
    assert.equal((await check()).status, 'failed', 'Legacy policies still require their default axes');
    await writeFile(join(root, 'Button.jsx'), source.replace('variants:', 'defaultVariants:{size:"small",tone:"danger"},variants:'));
    assert.equal((await check('none')).status, 'failed', 'Do not silently add defaults to pass the checker');
    assert.equal((await check('per-axis')).status, 'passed');
    await writeFile(join(root, 'Button.jsx'), source.replace('tone:{danger:"text-red-500"}', 'other:{danger:"text-red-500"}'));
    assert.equal((await check('none')).status, 'failed', 'No-default policy still requires every approved variant axis');
  } finally {await rm(root, {recursive: true, force: true});}
});

test('published team knowledge routes from actual JSX and excludes unrelated technology', async () => {
  const {inspectCodeKnowledge} = await import('../src/index.js');
  const root=await mkdtemp(join(tmpdir(),'fs-style-routing-'));
  try {
    await writeFile(join(root,'View.jsx'),'const styles={root:"p-4"}; export default ()=><div className={styles.root}/>;');
    const found=await inspectCodeKnowledge(root,process.cwd(),{files:['View.jsx'],technologies:['Tailwind CSS','react']});
    const entry=found.candidates.find(item=>item.id==='tailwind-team-authorship');
    assert.ok(entry);assert.equal(entry.checks.length,3);assert.ok(entry.matches.some(item=>item.kind==='jsx-attribute'));
    const excluded=await inspectCodeKnowledge(root,process.cwd(),{files:['View.jsx'],technologies:['react']});
    assert.ok(!excluded.candidates.some(item=>item.id==='tailwind-team-authorship'));
  } finally {await rm(root,{recursive:true,force:true});}
});
