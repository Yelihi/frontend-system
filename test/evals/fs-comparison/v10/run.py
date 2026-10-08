#!/usr/bin/env python3
"""Diverse planning journeys; reuse the measured CLI executor, never generated code."""
import argparse
from concurrent.futures import ThreadPoolExecutor
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import random
import shutil
import subprocess
import tempfile

HERE=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('v9',HERE.parent/'v9/run.py')
v9=importlib.util.module_from_spec(spec);spec.loader.exec_module(v9)
REPO=v9.REPO
ARMS=['ordinary','raw-K1','fs-K1']
save=v9.save
_original_plan_prompt = v9.plan_prompt
_original_question_prompt = v9.question_prompt
_original_check_questions = v9.check_questions

def question_prompt(arm, prompt_mode='guided'):
 if prompt_mode=='guided':return _original_question_prompt(arm)
 extra=''
 if arm=='raw-K1':extra='Original learning notes are available in learning/*.md.'
 if arm.startswith('fs-'):extra='Use FS: read ../runtime/skills/fs-plan/SKILL.md and use the frontend-system MCP. Select planId portal-refactor. The runtime corpus is the learned knowledge for this run.'
 return f'''Read README.md and the existing project. Help the owner plan the requested refactor.
{extra}
First write questions.json as {{"questions":[{{"id":"q1","question":"..."}}]}} with any questions you need answered before drafting the plan. At most six; an empty list is allowed. Optional evidence and options arrays may be included.
This turn is planning only. Do not edit product code, approve, implement, install, execute product code, access network or launch nested AI. Write in English for this comparison. Stop after writing questions.json; answers arrive next turn. The final reply lists only the artifact and blockers.'''

def check_questions(project, prompt_mode='guided'):
 if prompt_mode=='guided':return _original_check_questions(project)
 data=json.loads(v9.safe_read(project,'questions.json'));questions=data.get('questions')
 if not isinstance(questions,list) or len(questions)>6:raise ValueError('Expected at most six questions')
 ids=set();citations=[];uncited=[]
 for q in questions:
  if not isinstance(q,dict) or not isinstance(q.get('id'),str) or q['id'] in ids or not q.get('question'):raise ValueError('Invalid/duplicate question')
  ids.add(q['id'])
  if not isinstance(q.get('options',[]),list) or not isinstance(q.get('evidence',[]),list):raise ValueError('Optional evidence/options must be arrays')
  for item in q.get('evidence',[]):
   if not isinstance(item,dict) or not isinstance(item.get('path'),str) or not isinstance(item.get('quote'),str):
    uncited.append({'questionId':q['id'],'evidence':item});continue
   text=v9.safe_read(project,item['path']);quote=item['quote']
   citations.append({'questionId':q['id'],'path':item['path'],'quote':quote,'exact':isinstance(quote,str) and bool(quote.strip()) and quote in text})
 return {'count':len(questions),'citations':citations,'uncitedEvidence':uncited,'allQuotesExact':all(x['exact'] for x in citations),'note':'Optional citations; prose is retained for semantic review, never counted as verified quotations. Absence is not proof of grounding.'}

def plan_prompt(arm, prompt_mode='guided'):
 if prompt_mode=='natural':
  extra=('Follow FS and save an unapproved named revision portal-refactor. Inspect contractDiagnostics from the save receipt and repair correctable errors. Also deliver a readable plan.md.' if arm.startswith('fs-') else '')
  return f'''Read owner-answers.json and draft plan.md for the refactor requested in README.md.
{extra}
Use the supplied answers; do not invent user approval. Do not edit product code, implement, install, execute product code, access network or launch nested AI. Write in English. Finish with the artifact path and blockers.'''
 # Provenance measurement is performed by audit.py, outside the generation loop.
 return _original_plan_prompt(arm).replace(
  'Inspect contractDiagnostics and get_revision(detail:influence) to report recorded links, without claiming causal benefit. ',
  'Inspect contractDiagnostics from the save receipt and repair correctable errors; provenance is not proof of correctness. ')


# README fixture requests are inputs; only the report README at this directory is excluded.
def inputs():
 result={str(p.relative_to(HERE)):hashlib.sha256(p.read_bytes()).hexdigest() for p in HERE.rglob('*') if p.is_file() and p!=HERE/'README.md' and not any(x in {'results','__pycache__'} for x in p.relative_to(HERE).parts)}
 result['../v9/run.py']=hashlib.sha256(Path(v9.__file__).read_bytes()).hexdigest()
 return result

def configs(project,arm):
 values=v9.executor.permissions(project,'fs' if arm.startswith('fs-') else 'baseline')
 blocked={str(p.resolve()):'deny' for p in Path(tempfile.gettempdir()).glob('fs-v*') if p.is_dir()}
 blocked[str(project.parent.parent)]='deny'
 if not arm.startswith('fs-'):blocked[str(project.parent/'runtime')]='deny'
 # Specific project/runtime grants already in permission table override ancestor denies.
 values=[v[:-1]+','+','.join(json.dumps(k)+'='+json.dumps(x) for k,x in blocked.items())+'}' if v.startswith('permissions.eval.filesystem=') else v for v in values]
 # Avoid duplicate runtime table keys for ordinary/raw.
 if not arm.startswith('fs-'):
  key=json.dumps(str(project.parent/'runtime'))+'=';values=[v.replace(key+'"read",','') for v in values]
 if arm.startswith('fs-'):
  wrapper=['sandbox','-C',str(project),'-P','eval']
  for v in values:wrapper+=['-c',v]
  wrapper+=['node',str(project.parent/'runtime/bundle/mcp.js')]
  values+=['mcp_servers.frontend-system.command='+json.dumps(v9.executor.codex_binary()),'mcp_servers.frontend-system.args='+json.dumps(wrapper),'mcp_servers.frontend-system.env={'+','.join(k+'='+json.dumps(v) for k,v in v9.executor.runtime_env().items())+'}','mcp_servers.frontend-system.startup_timeout_sec=30','mcp_servers.frontend-system.tool_timeout_sec=120']
 return values

def restricted(project,arm,code):
 argv=[v9.executor.codex_binary(),'sandbox','-C',str(project),'-P','eval']
 for v in configs(project,arm):argv+=['-c',v]
 return subprocess.run([*argv,'node','--input-type=module','-'],input=code,text=True,capture_output=True,timeout=40,cwd=project,env={**os.environ,**v9.executor.runtime_env()})

def prepare(out,args):
 out.mkdir(parents=True,exist_ok=False)
 root=Path(tempfile.mkdtemp(prefix='fs-v10-')).resolve()
 runtime=root/'seed/runtime';runtime.mkdir(parents=True)
 for name in ['bundle','skills','references','mandatory-rules']:shutil.copytree(REPO/name,runtime/name)
 shutil.copy(REPO/'package.json',runtime/'package.json')
 sync=subprocess.run(['node',str(HERE/'prepare-knowledge.mjs'),str(runtime)],text=True,capture_output=True)
 (out/'prepare.stdout').write_text(sync.stdout);(out/'prepare.stderr').write_text(sync.stderr)
 sync.check_returncode();save(out/'sync.json',json.loads(sync.stdout))
 extraction=subprocess.run(['node',str(HERE/'check-extraction.mjs'),str(runtime)],text=True,capture_output=True)
 (out/'extraction.stderr').write_text(extraction.stderr);extraction.check_returncode();save(out/'extraction-checks.json',json.loads(extraction.stdout))
 cases=json.loads((HERE/'cases.json').read_text());cells=[]
 chosen=args.cases or [name for name,c in cases.items() if c['cohort']==args.cohort]
 for name in chosen:
  source=HERE/'projects'/name
  subprocess.run([str(REPO/'node_modules/.bin/tsc'),'--project',str(source/'tsconfig.json')],check=True,capture_output=True)
  for arm in args.arms:
   ident=name+'-'+arm;folder=root/ident;project=folder/'project';rt=folder/'runtime'
   shutil.copytree(source,project);shutil.copytree(runtime,rt)
   if arm=='raw-K1':shutil.copytree(HERE/'corpus',project/'learning')
   for command in [['git','init','-q','-b','main'],['git','add','.'],['git','-c','user.name=FS Eval','-c','user.email=eval@localhost','commit','-qm','Authored project fixture']]:subprocess.run(command,cwd=project,check=True,capture_output=True,env={**os.environ,**v9.executor.runtime_env()})
   cell={'id':ident,'case':name,'arm':arm,'project':str(project),'runtime':str(rt)};cells.append(cell)
   save(out/ident/'state.json',{'protected':v9.protected(project),'runtimeInventory':v9.executor.inventory(rt)})
   shutil.copytree(project,out/ident/'initial-project',ignore=shutil.ignore_patterns('.git'))
 random.Random(args.seed).shuffle(cells)
 manifest={'version':10,'model':args.model,'timeout':600,'cells':cells,'inputs':inputs(),'answerBank':{k:v['answerBank'] for k,v in cases.items()},'cohort':args.cohort,'promptMode':args.prompt_mode,'seed':args.seed,'executorHash':hashlib.sha256(Path(v9.executor.__file__).read_bytes()).hexdigest()}
 save(out/'manifest.json',manifest)
 shutil.copytree(runtime,out/'frozen-runtime');shutil.copytree(HERE/'corpus',out/'frozen-corpus');shutil.copytree(HERE/'projects',out/'frozen-projects')
 for f in HERE.iterdir():
  if f.is_file():shutil.copy(f,out/('frozen-'+f.name))
 shutil.copy(v9.__file__,out/'frozen-v9-runner.py')
 # Real per-arm deny probes; no model calls, no fixture application execution.
 probes=[]
 for arm in args.arms:
  c=next(c for c in cells if c['arm']==arm);project=Path(c['project']);sibling=next(x for x in cells if x['id']!=c['id'])
  paths={'own':str(project/'README.md'),'repo':str(HERE/'cases.json'),'sibling':str(Path(sibling['project'])/'README.md'),'runtime':str(Path(c['runtime'])/'skills/fs-plan/SKILL.md')}
  code='import {readFile} from "node:fs/promises"; const paths='+json.dumps(paths)+';const r={};for(const [k,p] of Object.entries(paths)){try{await readFile(p);r[k]="read";}catch(e){r[k]="denied";}}console.log(JSON.stringify(r));'
  result=restricted(project,arm,code)
  row={'arm':arm,'exitCode':result.returncode,'stdout':result.stdout,'stderr':result.stderr};probes.append(row)
  save(out/'isolation-probes.json',probes)
  expected={'own':'read','repo':'denied','sibling':'denied','runtime':'read' if arm.startswith('fs-') else 'denied'}
  if result.returncode or json.loads(result.stdout)!=expected:raise RuntimeError('Isolation probe failed: '+json.dumps(row))
 print(out,flush=True)

def validate_answers(cell,out,manifest):
 path=out/cell['id']/'answers.json'
 if not path.exists():return
 data=json.loads(path.read_text());bank=manifest['answerBank'][cell['case']]
 for row in data['answers']:
  if not row.get('mappingRationale'):raise ValueError('Answer requires reviewed mapping rationale')
  if 'unknown' in row['bankKeys'] and len(row['bankKeys'])>1:raise ValueError('Do not combine generic unknown with settled answers; scope unknown in a separately authored answer before freezing a new run')
  if row['answer']!='\n'.join(bank[k] for k in row['bankKeys']):raise ValueError('Noncanonical answer')

def main():
 parser=argparse.ArgumentParser();parser.add_argument('phase',choices=['prepare','questions','plan','summarize']);parser.add_argument('--output',type=Path,required=True)
 parser.add_argument('--cohort',choices=['development','holdout'],default='development');parser.add_argument('--cases',nargs='+');parser.add_argument('--arms',nargs='+',choices=ARMS,default=ARMS);parser.add_argument('--ids',nargs='+');parser.add_argument('--model',default='gpt-6-sol');parser.add_argument('--seed',type=int,default=1001)
 parser.add_argument('--prompt-mode',choices=['guided','natural'],default='guided')
 args=parser.parse_args();out=args.output.resolve()
 if args.phase=='prepare':prepare(out,args);return
 manifest=json.loads((out/'manifest.json').read_text())
 if args.phase=='summarize':summarize(out,manifest);return
 if inputs()!=manifest['inputs']:raise RuntimeError('Frozen authored inputs changed')
 if json.loads((out/'isolation/summary.json').read_text())['status']!='preflight-passed':raise RuntimeError('Existing Git/MCP isolation preflight required')
 if hashlib.sha256(Path(v9.executor.__file__).read_bytes()).hexdigest()!=manifest['executorHash']:raise RuntimeError('Executor changed')
 cells=[c for c in manifest['cells'] if not args.ids or c['id'] in args.ids]
 if args.ids and {c['id'] for c in cells}!=set(args.ids):raise ValueError('Unknown IDs')
 for c in cells:
  if (out/c['id']/args.phase).exists():raise ValueError('Never overwrite an attempt')
  if args.phase=='plan':validate_answers(c,out,manifest)
 v9.configs=configs
 prompt_mode=manifest.get('promptMode','guided')
 v9.question_prompt=lambda arm:question_prompt(arm,prompt_mode)
 v9.check_questions=lambda project:check_questions(project,prompt_mode)
 v9.plan_prompt=lambda arm:plan_prompt(arm,prompt_mode)
 with ThreadPoolExecutor(max_workers=2) as pool:records=list(pool.map(lambda c:v9.run_cell(c,args.phase,out,manifest),cells))
 save(out/(args.phase+'-'+str(len(list(out.glob(args.phase+'-*.json'))))+'.json'),records)
 summarize(out,manifest)

def summarize(out,manifest):
 rows=[]
 for c in manifest['cells']:
  row={'id':c['id'],'case':c['case'],'arm':c['arm'],'calls':0,'completedTurns':0,'totalTokens':0,'uncachedPlusOutput':0,'seconds':0,'unknownUsage':0,'mcpCalls':0,'mcpErrors':0,'knowledgeReads':[],'approvals':[],'commands':[],'audits':[]}
  for phase in ['questions','plan']:
   folder=out/c['id']/phase
   if not (folder/'result.json').exists():continue
   r=json.loads((folder/'result.json').read_text());row['calls']+=1;row['completedTurns']+=r['completedTurns'];row['seconds']+=r['elapsedSeconds']
   if r['usage']:row['totalTokens']+=r['usage']['total_tokens'];row['uncachedPlusOutput']+=r['usage']['uncached_input_tokens']+r['usage']['output_tokens']
   else:row['unknownUsage']+=1
   row['audits'].append(json.loads((folder/'audit.json').read_text()))
   for line in (folder/'events.jsonl').read_text().splitlines():
    e=json.loads(line);i=e.get('item',{})
    if e.get('type')!='item.completed':continue
    if i.get('type')=='command_execution':row['commands'].append(i.get('command'))
    if i.get('type')!='mcp_tool_call':continue
    row['mcpCalls']+=1
    if i.get('status')=='failed' or (i.get('result') or {}).get('isError'):row['mcpErrors']+=1
    if i.get('tool')=='read_learned_knowledge':row['knowledgeReads'].append(i.get('arguments'))
    if i.get('tool')=='approve_revision':row['approvals'].append(i.get('arguments'))
  row['complete']=row['completedTurns']==2 and row['unknownUsage']==0 and all(not a.get('artifactError') and a['sourceUnchanged'] and a['runtimeUnchanged'] for a in row['audits'])
  rows.append(row)
 summary={k:sum(r[k] for r in rows) for k in ['calls','completedTurns','totalTokens','uncachedPlusOutput','seconds','unknownUsage','mcpErrors']};summary['completedJourneys']=sum(r['complete'] for r in rows)
 save(out/'summary.json',{'summary':summary,'rows':rows});print(json.dumps(summary),flush=True)
if __name__=='__main__':main()
