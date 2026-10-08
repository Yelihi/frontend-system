#!/usr/bin/env python3
"""Two-stage, fresh-session flow reuse comparison; never executes generated app code."""
import argparse, hashlib, importlib.util, json, os, random, shutil, subprocess, tempfile
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
HERE=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('v10',HERE.parent/'v10/run.py');v10=importlib.util.module_from_spec(spec);spec.loader.exec_module(v10)
v9=v10.v9;ex=v9.executor;REPO=v9.REPO;save=v9.save
ARMS=['ordinary','raw-K1','fs-K1']
CHANGES={
 'request':{'src/background.ts':"import {request} from './client';\nexport async function refreshOrders(serviceToken:string){return request('/orders',{headers:{Authorization:'Bearer '+serviceToken,'X-Mode':'background'}});}\n",'change-request.md':'''# Next change and supplied answer
Add the supplied read-only background consumer to the planned request refactor.
The background request must keep its supplied service token. It must not inherit the
interactive session token or UI login effects; interactive requests keep their established
session-expired classification. A background auth failure is classified for its caller,
which owns logging. Keep the common transport but select authentication/error policy
at the call boundary. Do not add automatic retry to any request in this change.
All previous input preservation, order validation/cache, newer-draft and cleanup contracts remain.
There is still no multi-writer product requirement. Reuse prior analysis where current;
inspect the changed consumer and any affected ownership assumption. Plan only.
'''},
 'styles':{'src/BulkAction.tsx':"import {Button} from './Button';\nimport {ticketStore} from './store';\nexport function BulkAction(){return <Button size=\"large\" tone=\"danger\" onClick={()=>ticketStore.select('bulk')}>Select bulk</Button>;}\n",'change-request.md':'''# Next change and supplied answer
Include the supplied BulkAction caller when checking Button variant compatibility.
Owner answer: keep the current palette and do not introduce semantic theme tokens in
this refactor. No dark mode or rebranding. The approved Button-only JSX-direct and
CVA decision is unchanged. Keep both public axes required, preserve all four combinations
and onClick/type/focus behavior, and keep Indicator excluded. Do not invent default
variants that make previously required props optional. Store ownership and unsubscribe
remain unchanged. Reuse existing analysis where valid and inspect the new caller. Plan only.
'''}}

def inputs():
 d={str(p.relative_to(HERE)):hashlib.sha256(p.read_bytes()).hexdigest() for p in HERE.rglob('*') if p.is_file() and p!=HERE/'README.md' and not any(x in {'results','__pycache__','.frontend-system'} for x in p.relative_to(HERE).parts)}
 for p in [Path(v10.__file__),Path(v9.__file__),Path(ex.__file__)]:d[str(p.relative_to(REPO))]=hashlib.sha256(p.read_bytes()).hexdigest()
 return d

def prompt(arm,stage):
 extra=''
 if arm=='raw-K1':extra='The full learning corpus and metadata are available under learning/. Read relevant material when useful.'
 if arm=='fs-K1':extra='Use FS: read ../runtime/skills/fs-plan/SKILL.md and use the frontend-system MCP. Read tool-help for uncertain payloads. The runtime contains the actual learned corpus, not a single synthetic note.'
 if stage=='analysis':
  task='''Read README.md, owner-contract.md and the existing code. Analyze this project before its requested refactor. Write analysis.md with environment/architecture, actual event/state/error flows, cited improvement points and only material unresolved questions. Preserve implementation facts separately from proposals. Do not draft the implementation plan yet.'''
  if arm=='fs-K1':task+=' Also persist the relevant observed flow(s) and actionable finding(s) with save_project_analysis, and the concise project context with FS. Persistence is explicitly authorized. Scope discovery to catch new callers. No need to render a diagram for this experiment.'
 else:
  task='''Read change-request.md and the earlier analysis artifacts. In this fresh session, prepare plan.md for the requested refactor including this new input. Reuse valid analysis, recheck affected assumptions, preserve the supplied answers, and make obligations/verification/discretion and any unresolved intent clear. Do not claim unrun checks passed.'''
  if arm=='fs-K1':task+=' Query stored analysis before rescanning. Refresh stale affected flow/finding records, then save an unapproved revision with planId flow-refactor and evidence.analysisRefs linking the relevant current records. Use the saved plan projection as plan.md; avoid maintaining two independent plans.'
 return task+'\n'+extra+'''\nAll output in English. You may inspect source and installed read-only helpers; write analysis.md, plan.md and scratch under .eval/ or .frontend-system/drafts/. FS may also persist the authorized analysis/project/plan records through tools. No product/contract edits, installs, application execution, network, nested AI, approval or implementation. User answers are the supplied documents. Record unresolved questions and finish without waiting. Do not add extra documentation outside these artifacts.'''

def prepare(out,args):
 out.mkdir(parents=True,exist_ok=False);root=Path(tempfile.mkdtemp(prefix='fs-v12-')).resolve();cells=[]
 for case in CHANGES:
  for arm in ARMS:
   ident=case+'-'+arm;project=root/ident/'project';rt=project.parent/'runtime';shutil.copytree(HERE/'projects'/case,project,ignore=shutil.ignore_patterns('.frontend-system'));rt.mkdir()
   for name in ['bundle','skills','references','mandatory-rules']:shutil.copytree(REPO/name,rt/name)
   shutil.copy(REPO/'package.json',rt/'package.json')
   if arm=='raw-K1':shutil.copytree(rt/'references/learned',project/'learning')
   for cmd in [['git','init','-q','-b','main'],['git','add','.'],['git','-c','user.name=FS Eval','-c','user.email=eval@localhost','commit','-qm','Frozen flow fixture']]:subprocess.run(cmd,cwd=project,check=True,capture_output=True,env={**os.environ,**ex.runtime_env()})
   cells.append({'id':ident,'case':case,'arm':arm,'project':str(project),'runtime':str(rt)})
   save(out/ident/'state.json',{'protected':{k:v for k,v in ex.inventory(project).items() if not k.startswith('.git/')},'runtimeInventory':ex.inventory(rt)})
   shutil.copytree(project,out/ident/'initial-project',ignore=shutil.ignore_patterns('.git'))
 random.Random(1201).shuffle(cells)
 m={'version':12,'model':args.model,'timeout':900,'cells':cells,'inputs':inputs(),'changes':CHANGES,'prompts':{s:{a:prompt(a,s) for a in ARMS} for s in ['analysis','plan']},'maxParallel':2};save(out/'manifest.json',m)
 shutil.copytree(Path(cells[0]['runtime']),out/'frozen-runtime')
 for p in HERE.iterdir():
  if p.is_file():shutil.copy(p,out/('frozen-'+p.name))
 probes=[]
 for arm in ARMS:
  c=next(c for c in cells if c['arm']==arm);project=Path(c['project']);sibling=next(x for x in cells if x['id']!=c['id'])
  paths={'own':str(project/'owner-contract.md'),'repo':str(HERE/'protocol.md'),'sibling':str(Path(sibling['project'])/'owner-contract.md'),'runtime':str(Path(c['runtime'])/'skills/fs-plan/SKILL.md')}
  code='import {readFile} from "node:fs/promises";const paths='+json.dumps(paths)+';const r={};for(const[k,p]of Object.entries(paths)){try{await readFile(p);r[k]="read";}catch{r[k]="denied";}}console.log(JSON.stringify(r));'
  r=v10.restricted(project,arm,code);probes.append({'arm':arm,'exitCode':r.returncode,'stdout':r.stdout,'stderr':r.stderr});save(out/'isolation-probes.json',probes)
  if r.returncode or json.loads(r.stdout)!={'own':'read','repo':'denied','sibling':'denied','runtime':'read' if arm=='fs-K1' else 'denied'}:raise RuntimeError('Isolation probe failed')
 print(out,flush=True)

def trace(target):
 result=[]
 for line in (target/'events.jsonl').read_text().splitlines():
  e=json.loads(line);i=e.get('item',{})
  if e.get('type')!='item.completed' or i.get('type')!='mcp_tool_call':continue
  r=i.get('result') or {};data=r.get('structured_content')
  if data is None:
   try:data=json.loads('\n'.join(x['text'] for x in r.get('content',[]) if x.get('type')=='text'))
   except ValueError:data=r.get('content')
  result.append({'tool':i.get('tool'),'arguments':i.get('arguments'),'response':data,'error':i.get('status')=='failed' or r.get('isError',False) or bool(i.get('error'))})
 return result

def run_cell(c,out,m,stage):
 project=Path(c['project']);target=out/c['id']/stage;state=json.loads((out/c['id']/'state.json').read_text())
 if ex.inventory(Path(c['runtime']))!=state['runtimeInventory']:raise RuntimeError('Frozen runtime changed')
 if stage=='plan':
  prior=out/c['id']/'analysis/audit.json'
  if not prior.exists():raise RuntimeError('Initial analysis required')
  if not json.loads(prior.read_text())['complete']:
   recovery=out/c['id']/'artifact-recovery.json'
   if not recovery.exists():raise RuntimeError('Complete initial analysis or documented artifact-location recovery required')
   rec=json.loads(recovery.read_text());initial=json.loads((prior.parent/'result.json').read_text());audit=json.loads(prior.read_text())
   if not (initial['completedTurns']==1 and initial['usage'] and not initial['exitCode'] and not initial['timedOut'] and audit['sourceUnchanged'] and audit['runtimeUnchanged'] and not audit['environmentFailure']):raise RuntimeError('Location recovery cannot repair model or isolation failures')
   if hashlib.sha256(v9.safe_read(project,'analysis.md').encode()).hexdigest()!=rec['hash']:raise RuntimeError('Recovered analysis changed')
  for name,body in m['changes'][c['case']].items():(project/name).write_text(body)
 protected={k:v for k,v in ex.inventory(project).items() if not k.startswith(('.git/','.frontend-system/','.eval/')) and k not in {'analysis.md','plan.md'}}
 save(target.parent/(stage+'-inputs.json'),protected)
 print('Running '+stage+' '+c['id'],flush=True)
 r=ex.invoke(project,target,m['model'],m['prompts'][stage][c['arm']],v10.configs(project,c['arm']),m['timeout'],ex.runtime_env())
 now=ex.inventory(project);changed=[p for p,h in protected.items() if now.get(p)!=h];extra=[p for p in now if p not in protected and not p.startswith(('.git/','.frontend-system/','.eval/')) and p not in {'analysis.md','plan.md'}]
 a={'sourceUnchanged':not changed and not extra,'changedInputs':changed,'unexpectedFiles':extra,'runtimeUnchanged':ex.inventory(Path(c['runtime']))==state['runtimeInventory'],'environmentFailure':ex.environment_failure(r,target)}
 try:a['artifactCharacters']=len(v9.safe_read(project,stage+'.md'))
 except (ValueError,OSError) as e:a['artifactError']=str(e)
 a['complete']=bool(r['completedTurns']==1 and r['usage'] and not r['exitCode'] and not r['timedOut'] and a['sourceUnchanged'] and a['runtimeUnchanged'] and not a.get('artifactError') and not a['environmentFailure'])
 save(target/'audit.json',a);save(target/'mcp-trace.json',trace(target));shutil.copytree(project,target/'project',symlinks=True,ignore=shutil.ignore_patterns('.git'))
 print('Finished '+stage+' '+c['id']+': '+('complete' if a['complete'] else 'unverified'),flush=True)

def summarize(out,m):
 rows=[]
 for c in m['cells']:
  for stage in ['analysis','plan']:
   t=out/c['id']/stage
   if not (t/'audit.json').exists():continue
   r=json.loads((t/'result.json').read_text());a=json.loads((t/'audit.json').read_text());tr=json.loads((t/'mcp-trace.json').read_text());u=r['usage']
   rows.append({'id':c['id'],'arm':c['arm'],'case':c['case'],'stage':stage,'complete':a['complete'],'totalTokens':u['total_tokens'] if u else None,'uncachedPlusOutput':u['uncached_input_tokens']+u['output_tokens'] if u else None,'seconds':r['elapsedSeconds'],'threadId':r['threadId'],'mcpCalls':len(tr),'mcpErrors':sum(bool(x['error']) for x in tr),'audit':a})
 summary={'calls':len(rows),'complete':sum(r['complete'] for r in rows),'knownTotalTokens':sum(r['totalTokens'] or 0 for r in rows),'knownUncachedPlusOutput':sum(r['uncachedPlusOutput'] or 0 for r in rows),'unknownUsage':sum(r['totalTokens'] is None for r in rows),'mcpErrors':sum(r['mcpErrors'] for r in rows),'uniqueThreads':len({r['threadId'] for r in rows})==len(rows)}
 save(out/'summary.json',{'summary':summary,'rows':rows});print(json.dumps(summary),flush=True)

def main():
 p=argparse.ArgumentParser();p.add_argument('phase',choices=['prepare','analysis','plan','summarize']);p.add_argument('--output',required=True,type=Path);p.add_argument('--model',default='gpt-6-sol');p.add_argument('--ids',nargs='+');a=p.parse_args();out=a.output.resolve()
 if a.phase=='prepare':prepare(out,a);return
 m=json.loads((out/'manifest.json').read_text())
 if a.phase=='summarize':summarize(out,m);return
 if inputs()!=m['inputs']:
  amendment=out/'harness-amendment.json'
  if not amendment.exists() or json.loads(amendment.read_text())['currentInputs']!=inputs():raise RuntimeError('Frozen inputs changed without a documented harness-only amendment')
 if json.loads((out/'isolation/summary.json').read_text())['status']!='preflight-passed':raise RuntimeError('Preflight required')
 cells=[c for c in m['cells'] if not a.ids or c['id'] in a.ids]
 if a.ids and set(a.ids)!={c['id'] for c in cells}:raise ValueError('Unknown cell')
 for c in cells:
  if (out/c['id']/a.phase).exists():raise ValueError('Never overwrite an attempt')
 with ThreadPoolExecutor(max_workers=2) as pool:list(pool.map(lambda c:run_cell(c,out,m,a.phase),cells))
 summarize(out,m)
if __name__=='__main__':main()
