#!/usr/bin/env python3
import argparse,importlib.util,json,shutil,subprocess,tempfile,os,hashlib
from pathlib import Path
HERE=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('v10',HERE.parent/'v10/run.py');v10=importlib.util.module_from_spec(spec);spec.loader.exec_module(v10)
ex=v10.v9.executor;REPO=v10.REPO
save=lambda p,d:(p.parent.mkdir(parents=True,exist_ok=True),p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n'))
BRIEF='''Analyze the existing order frontend and show its actual event/state/error flows as an HTML diagram, with code evidence and stated limitations. Write analysis.md explaining the flows and material improvement points. Do not refactor or draft an implementation plan yet. The requirement is to preserve the current positive-integer validation, per-instance duplicate suppression, and ability to retry after failure. Do not add automatic retries or new domain rules. There is no request to change UI styling. Explain unknown deployment/runtime behavior rather than inventing it.'''
DELTA="""import { price } from '../cart/index.js';
import { createOrderSubmitter } from '../../domain/orders.js';
export const total = price;
export function createQuickOrder(send, changed) { return createOrderSubmitter(send, changed); }
"""
CHANGE='''An existing checkout module now exports createQuickOrder as another consumer of the order submitter. The wrapper is supplied for future integration; it is not wired to a page. Refresh the actual flow analysis and HTML for this change. Then write a scoped plan.md to make the shared submission contract explicit and test both entry points. Owner answer: each created submitter has independent pending state; different instances may submit independently. Preserve validation and failure/retry behavior. Do not share one singleton pending flag, introduce automatic retries, add domain input restrictions or wire a new UI. Existing total export remains compatible. No implementation or approval yet. Reuse current evidence; inspect affected scope before deciding what changed.'''
def protected(project):
 return {p:h for p,h in ex.inventory(project).items() if not p.startswith(('.git/','.frontend-system/','.eval/')) and p not in {'analysis.md','plan.md'}}
def main():
 ap=argparse.ArgumentParser();ap.add_argument('phase',choices=['prepare','initial','change']);ap.add_argument('--output',type=Path,required=True);ap.add_argument('--arm',choices=['ordinary','fs']);a=ap.parse_args();out=a.output.resolve()
 if a.phase=='prepare':
  out.mkdir(parents=True,exist_ok=False);base=Path(tempfile.mkdtemp(prefix='fs-v13-')).resolve();cells=[]
  for arm in ['ordinary','fs']:
   project=base/arm/'project';project.mkdir(parents=True);runtime=project.parent/'runtime';runtime.mkdir()
   source=REPO/'test/fixtures/frontend'
   for name in ['app','src']:shutil.copytree(source/name,project/name)
   for p in source.iterdir():
    if p.is_file() and p.suffix in ['.json','.js','.mjs'] and 'lock' not in p.name:shutil.copy(p,project/p.name)
   (project/'README.md').write_text(BRIEF+'\nNote: dependencies are not installed in this isolated copy. Do not install or claim runtime checks passed.\n')
   for name in ['bundle','skills','references','mandatory-rules']:shutil.copytree(REPO/name,runtime/name)
   shutil.copy(REPO/'package.json',runtime/'package.json')
   for cmd in [['git','init','-q','-b','main'],['git','add','.'],['git','-c','user.name=FS Eval','-c','user.email=eval@localhost','commit','-qm','Frozen actual project']]:subprocess.run(cmd,cwd=project,check=True,capture_output=True,env={**os.environ,**ex.runtime_env()})
   cell={'arm':arm,'project':str(project),'runtime':str(runtime)};cells.append(cell)
   save(out/arm/'source.json',protected(project));save(out/arm/'runtime.json',ex.inventory(runtime))
   shutil.copytree(project,out/arm/'initial-source',ignore=shutil.ignore_patterns('.git'))
  save(out/'manifest.json',{'model':'gpt-6-sol','timeout':900,'cells':cells,'brief':BRIEF,'delta':DELTA,'change':CHANGE,'protocolHash':hashlib.sha256((HERE/'protocol.md').read_bytes()).hexdigest()})
  shutil.copy(HERE/'protocol.md',out/'protocol.md');shutil.copy(__file__,out/'runner.py')
  probes=[]
  for cell in cells:
   p=Path(cell['project']);arm='fs-K1' if cell['arm']=='fs' else 'ordinary';other=next(c for c in cells if c!=cell)
   code='import {readFile} from "node:fs/promises";const r={};for(const[k,p]of Object.entries('+json.dumps({'own':str(p/'README.md'),'repo':str(HERE/'protocol.md'),'sibling':str(Path(other['project'])/'README.md'),'runtime':str(p.parent/'runtime/skills/fs-plan-visualize/SKILL.md')})+')){try{await readFile(p);r[k]="read";}catch{r[k]="denied";}}console.log(JSON.stringify(r));'
   r=v10.restricted(p,arm,code);probes.append({'arm':cell['arm'],'exitCode':r.returncode,'stdout':r.stdout,'stderr':r.stderr});save(out/'isolation.json',probes)
   assert r.returncode==0 and json.loads(r.stdout)=={'own':'read','repo':'denied','sibling':'denied','runtime':'read' if cell['arm']=='fs' else 'denied'},'Isolation failed; no model calls'
  print(out,flush=True);return
 m=json.loads((out/'manifest.json').read_text())
 for cell in m['cells']:
  if a.arm and cell['arm']!=a.arm:continue
  p=Path(cell['project']);arm=cell['arm'];target=out/arm/a.phase
  assert not target.exists(),'Preserve prior results; use a new output for a rerun'
  assert ex.inventory(Path(cell['runtime']))==json.loads((out/arm/'runtime.json').read_text()),'Runtime changed'
  if a.phase=='change':
   assert json.loads((out/arm/'initial/audit.json').read_text())['complete'],'Initial stage incomplete'
   (p/'src/features/checkout/index.js').write_text(m['delta']);(p/'change-request.md').write_text(m['change'])
  prompt=(m['brief'] if a.phase=='initial' else 'Read prior analysis artifacts and change-request.md. '+m['change'])
  if arm=='fs':prompt+=' Use the FS skill at ../runtime/skills/fs-plan-visualize/SKILL.md and frontend-system MCP. Analysis and diagram persistence are authorized.'+(' Use fs-plan for the scoped unapproved plan after refreshing the flow; preserve previous decisions.' if a.phase=='change' else '')
  prompt+=' Write outputs in English. Product/config/requirement edits, network, installs, app execution, nested models and approval are not authorized. Write analysis.md, plan.md when requested, and HTML or scratch under .eval/ or .frontend-system/. FS may persist its records. Do not wait for answers: use the supplied requirements and report unresolved intent. Return artifact paths.'
  before=protected(p);print('Running '+arm+' / '+a.phase,flush=True)
  r=ex.invoke(p,target,m['model'],prompt,v10.configs(p,'fs-K1' if arm=='fs' else 'ordinary'),m['timeout'],ex.runtime_env())
  after=protected(p);required=['analysis.md']+(['plan.md'] if a.phase=='change' else [])
  outputs=[str(f.relative_to(p)) for f in p.rglob('*.html') if '.git' not in f.parts]
  audit={'sourceUnchanged':before==after,'runtimeUnchanged':ex.inventory(Path(cell['runtime']))==json.loads((out/arm/'runtime.json').read_text()),'requiredArtifacts':{n:(p/n).is_file() for n in required},'html':outputs,'environmentFailure':ex.environment_failure(r,target)}
  audit['complete']=bool(r['completedTurns']==1 and r['usage'] and not r['exitCode'] and not r['timedOut'] and audit['sourceUnchanged'] and audit['runtimeUnchanged'] and all(audit['requiredArtifacts'].values()) and outputs and not audit['environmentFailure'])
  save(target/'audit.json',audit);shutil.copytree(p,target/'project',ignore=shutil.ignore_patterns('.git'));print(json.dumps({'arm':arm,'stage':a.phase,'audit':audit,'usage':r['usage']}),flush=True)
if __name__=='__main__':main()
