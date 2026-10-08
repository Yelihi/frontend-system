import {readFile,writeFile} from 'node:fs/promises';
import {compile} from './node_modules/@tailwindcss/node/dist/index.mjs';
const engine=await compile(await readFile('theme.css','utf8'),{base:process.cwd(),onDependency(){}});
// Finite public design tokens + variant classes in this fixture; no network or browser.
const classes=['bg-action','text-on-action','border-action','inline-flex','items-center','justify-center','rounded','font-medium','disabled:opacity-50','bg-slate-100','text-slate-900','px-3','py-1','text-sm','px-4','py-2','text-base','bg-amber-100','text-amber-900','bg-green-100','text-green-900','bg-red-100','text-red-900','px-1','py-0.5','text-xs','px-2','border','border-slate-200','bg-white','p-2','p-4','mx-auto','max-w-5xl','space-y-4','p-6','tabular-nums'];
await writeFile('dist/theme.css',engine.build(classes));
