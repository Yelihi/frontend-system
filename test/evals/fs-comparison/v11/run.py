#!/usr/bin/env python3
"""Frozen single-turn investigation regression. Never executes generated app code."""
import argparse
from concurrent.futures import ThreadPoolExecutor
import hashlib, importlib.util, json, os, random, shutil, subprocess, tempfile
from pathlib import Path
HERE=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('v10',HERE.parent/'v10/run.py');v10=importlib.util.module_from_spec(spec);spec.loader.exec_module(v10)
v9=v10.v9;ex=v9.executor;REPO=v9.REPO;save=v9.save
ARMS=['ordinary','raw-K1','fs-K1']

def inputs():
 files={str(p.relative_to(HERE)):hashlib.sha256(p.read_bytes()).hexdigest() for p in HERE.rglob('*') if p.is_file() and p.name!='README.md' and not any(x in {'results','__pycache__'} for x in p.relative_to(HERE).parts)}
 for name,p in [('v10',Path(v10.__file__)),('v9',Path(v9.__file__)),('executor',Path(ex.__file__))]:files[name]=hashlib.sha256(p.read_bytes()).hexdigest()
 return files

def prompt(arm):
 extra=''
 if arm=='raw-K1':extra='Learning material is available in learning/operation-boundary.md.'
 if arm=='fs-K1':extra='Use FS: read ../runtime/skills/fs-review/SKILL.md and use the frontend-system MCP with the isolated runtime knowledge. In addition to review.md, you are explicitly authorized to save the scoped knowledge investigation with save_knowledge_review; do not save project.md, plans or approvals. A pending investigation is valid when context is genuinely unavailable. This authorization overrides only the skill restriction against persisting review judgments, not the ban on product edits.'
 return f'''Review this document editor before its next extension. Read README.md, owner-contract.md and the code. Explain your recommendation, the code/contract evidence, tradeoffs and any material questions still needed. Keep the supplied contracts intact. Write review.md in English.
{extra}
This is review only: do not edit product code or tests, approve or implement changes, install packages, execute application code, access the network or launch nested AI. You may inspect source and use installed read-only FS helpers when applicable. You may write review.md and scratch JSON under .eval/; only FS may also save the explicitly authorized investigation record. Do not claim unrun checks passed. Finish after the review artifact and any pending questions; no need to wait for answers.'''

def prepare(out,args):
 out.mkdir(parents=True,exist_ok=False);root=Path(tempfile.mkdtemp(prefix='fs-v11-')).resolve();runtime=root/'seed/runtime';runtime.mkdir(parents=True)
 for name in ['bundle','skills','references','mandatory-rules']:shutil.copytree(REPO/name,runtime/name)
 shutil.copy(REPO/'package.json',runtime/'package.json')
 sync=subprocess.run(['node',str(HERE/'prepare-knowledge.mjs'),str(runtime)],capture_output=True,text=True)
 (out/'prepare.stdout').write_text(sync.stdout);(out/'prepare.stderr').write_text(sync.stderr);sync.check_returncode();save(out/'sync.json',json.loads(sync.stdout))
 cases=json.loads((HERE/'cases.json').read_text());cells=[]
 for case,data in cases.items():
  for arm in ARMS:
   ident=case+'-'+arm;project=root/ident/'project';rt=project.parent/'runtime';shutil.copytree(HERE/'fixture',project);shutil.copytree(runtime,rt)
   (project/'src/wiring.ts').write_text(data['wiring']);(project/'owner-contract.md').write_text('# Supplied owner contract\n\n'+data['contract']+'\n')
   if data.get('replay'):(project/'src/replay.ts').write_text("import type {Document, Edit, Result} from './model';\nimport {applyEdit} from './edits';\nexport function replay(initial: Document, commands: readonly Edit[]): Result { let current=initial; for(const command of commands){ const result=applyEdit(current,command); if(!result.ok)return result; current=result.document; } return {ok:true,document:current}; }\n")
   (project/'README.md').write_text('# Document editor\n\nReview the current design before the next extension. Explain suitable boundaries, costs, preserved behavior and unresolved choices. See owner-contract.md for the supplied scope. Source is under src/. There are no installed product test scripts in this fixture.\n')
   if arm=='raw-K1':shutil.copytree(HERE/'corpus',project/'learning')
   subprocess.run([str(REPO/'node_modules/.bin/tsc'),'--project',str(project/'tsconfig.json')],check=True,capture_output=True)
   for cmd in [['git','init','-q','-b','main'],['git','add','.'],['git','-c','user.name=FS Eval','-c','user.email=eval@localhost','commit','-qm','Authored review fixture']]:subprocess.run(cmd,cwd=project,check=True,capture_output=True,env={**os.environ,**ex.runtime_env()})
   cells.append({'id':ident,'case':case,'arm':arm,'project':str(project),'runtime':str(rt)})
   save(out/ident/'state.json',{'protected':{k:v for k,v in ex.inventory(project).items() if not k.startswith('.git/')},'runtimeInventory':ex.inventory(rt)})
   shutil.copytree(project,out/ident/'initial-project',ignore=shutil.ignore_patterns('.git'))
 random.Random(1101).shuffle(cells)
 manifest={'version':11,'model':args.model,'timeout':600,'cells':cells,'inputs':inputs(),'prompts':{arm:prompt(arm) for arm in ARMS},'maxParallel':2,'scope':'Single-turn review, not full planning or implementation'};save(out/'manifest.json',manifest)
 shutil.copytree(runtime,out/'frozen-runtime');shutil.copytree(HERE/'corpus',out/'frozen-corpus')
 for p in HERE.iterdir():
  if p.is_file():shutil.copy(p,out/('frozen-'+p.name))
 probes=[]
 for arm in ARMS:
  cell=next(c for c in cells if c['arm']==arm);project=Path(cell['project']);sibling=next(c for c in cells if c['id']!=cell['id'])
  paths={'own':str(project/'owner-contract.md'),'repo':str(HERE/'protocol.md'),'sibling':str(Path(sibling['project'])/'owner-contract.md'),'runtime':str(Path(cell['runtime'])/'skills/fs-review/SKILL.md')}
  code='import {readFile} from "node:fs/promises";const paths='+json.dumps(paths)+';const r={};for(const[k,p]of Object.entries(paths)){try{await readFile(p);r[k]="read";}catch{r[k]="denied";}}console.log(JSON.stringify(r));'
  result=v10.restricted(project,arm,code);row={'arm':arm,'exitCode':result.returncode,'stdout':result.stdout,'stderr':result.stderr};probes.append(row);save(out/'isolation-probes.json',probes)
  expected={'own':'read','repo':'denied','sibling':'denied','runtime':'read' if arm=='fs-K1' else 'denied'}
  if result.returncode or json.loads(result.stdout)!=expected:raise RuntimeError('Isolation probe failed')
 print(out,flush=True)

def run_cell(cell,out,m):
 project=Path(cell['project']);state=json.loads((out/cell['id']/'state.json').read_text());target=out/cell['id']/'review'
 if ex.inventory(Path(cell['runtime']))!=state['runtimeInventory']:raise RuntimeError('Frozen runtime changed')
 print('Running '+cell['id'],flush=True)
 r=ex.invoke(project,target,m['model'],m['prompts'][cell['arm']],v10.configs(project,cell['arm']),m['timeout'],ex.runtime_env())
 inventory=ex.inventory(project);changed=[p for p,h in state['protected'].items() if inventory.get(p)!=h]
 extra=[p for p in inventory if p not in state['protected'] and p!='review.md' and not p.startswith(('.git/','.eval/','.frontend-system/'))]
 audit={'id':cell['id'],'sourceUnchanged':not changed and not extra,'changedInputs':changed,'unexpectedFiles':extra,'runtimeUnchanged':ex.inventory(Path(cell['runtime']))==state['runtimeInventory'],'environmentFailure':ex.environment_failure(r,target)}
 try:audit['reviewCharacters']=len(v9.safe_read(project,'review.md'))
 except (ValueError,OSError) as e:audit['artifactError']=str(e)
 shutil.copytree(project,target/'project',symlinks=True,ignore=shutil.ignore_patterns('.git'));save(target/'audit.json',audit)
 print('Finished '+cell['id']+': '+('complete' if r['completedTurns']==1 and r['usage'] and not r['exitCode'] and not r['timedOut'] and not audit.get('artifactError') else 'unverified'),flush=True)
 return audit

def summarize(out,m):
 rows=[]
 for c in m['cells']:
  p=out/c['id']/'review'
  if not (p/'result.json').exists():continue
  r=json.loads((p/'result.json').read_text());a=json.loads((p/'audit.json').read_text());trace=[]
  for line in (p/'events.jsonl').read_text().splitlines():
   e=json.loads(line);i=e.get('item',{})
   if e.get('type')!='item.completed' or i.get('type')!='mcp_tool_call':continue
   result=i.get('result') or {};data=result.get('structured_content')
   if data is None:
    try:data=json.loads('\n'.join(x['text'] for x in result.get('content',[]) if x.get('type')=='text'))
    except ValueError:data=result.get('content')
   trace.append({'tool':i.get('tool'),'arguments':i.get('arguments'),'response':data,'error':i.get('status')=='failed' or result.get('isError',False) or bool(i.get('error'))})
  save(out/c['id']/'mcp-trace.json',trace)
  row={'id':c['id'],'case':c['case'],'arm':c['arm'],'totalTokens':r['usage']['total_tokens'] if r['usage'] else None,'uncachedPlusOutput':r['usage']['uncached_input_tokens']+r['usage']['output_tokens'] if r['usage'] else None,'seconds':r['elapsedSeconds'],'threadId':r['threadId'],'mcpCalls':len(trace),'mcpErrors':sum(bool(t['error']) for t in trace),'audit':a,'complete':bool(r['completedTurns']==1 and r['usage'] and not r['exitCode'] and not r['timedOut'] and a['sourceUnchanged'] and a['runtimeUnchanged'] and not a.get('artifactError') and not a['environmentFailure'])};rows.append(row)
 summary={'calls':len(rows),'complete':sum(r['complete'] for r in rows),'knownTotalTokens':sum(r['totalTokens'] or 0 for r in rows),'knownUncachedPlusOutput':sum(r['uncachedPlusOutput'] or 0 for r in rows),'unknownUsage':sum(r['totalTokens'] is None for r in rows),'summedSeconds':sum(r['seconds'] for r in rows),'mcpErrors':sum(r['mcpErrors'] for r in rows),'uniqueThreads':len({r['threadId'] for r in rows})==len(rows)}
 save(out/'summary.json',{'summary':summary,'rows':rows});print(json.dumps(summary),flush=True)

def main():
 p=argparse.ArgumentParser();p.add_argument('phase',choices=['prepare','run','summarize']);p.add_argument('--output',required=True,type=Path);p.add_argument('--model',default='gpt-6-sol');p.add_argument('--ids',nargs='+');args=p.parse_args();out=args.output.resolve()
 if args.phase=='prepare':prepare(out,args);return
 m=json.loads((out/'manifest.json').read_text())
 if args.phase=='summarize':summarize(out,m);return
 if inputs()!=m['inputs']:raise RuntimeError('Frozen inputs changed')
 if json.loads((out/'isolation/summary.json').read_text())['status']!='preflight-passed':raise RuntimeError('Preflight required')
 cells=[c for c in m['cells'] if not args.ids or c['id'] in args.ids]
 if args.ids and set(args.ids)!={c['id'] for c in cells}:raise ValueError('Unknown cell IDs')
 for c in cells:
  if (out/c['id']/'review').exists():raise ValueError('Never overwrite an attempt')
 with ThreadPoolExecutor(max_workers=2) as pool:list(pool.map(lambda c:run_cell(c,out,m),cells))
 summarize(out,m)
if __name__=='__main__':main()
