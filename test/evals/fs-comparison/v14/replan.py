"""Replay only planning from exact prior analysis artifacts in isolated fresh clones."""
import argparse,hashlib,json,os,shutil,subprocess
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import run as cohort
v12=cohort.v12

def main():
 ap=argparse.ArgumentParser();ap.add_argument('phase',choices=['prepare','run']);ap.add_argument('output',type=Path);ap.add_argument('--source',type=Path);args=ap.parse_args();out=args.output.resolve()
 if args.phase=='prepare':
  source=args.source.resolve();out.mkdir(parents=True,exist_ok=False);v12.ARMS=['fs-K1']
  for n in range(1,4):
   rep=out/f'repeat-{n}';prior=source/f'repeat-{n}';old=json.loads((prior/'manifest.json').read_text())
   v12.prepare(rep,argparse.Namespace(model=old['model']));m=json.loads((rep/'manifest.json').read_text());imports=[]
   assert m['prompts']['plan']['fs-K1']==old['prompts']['plan']['fs-K1'] and m['changes']==old['changes']
   for c in m['cells']:
    original=prior/c['id']/'analysis';r=json.loads((original/'result.json').read_text());audit=json.loads((original/'audit.json').read_text());originalCell=next(x for x in old['cells'] if x['id']==c['id'])
    assert r['completedTurns']==1 and r['usage'] and not r['timedOut'] and not r['exitCode'] and audit['sourceUnchanged'] and audit['runtimeUnchanged'] and not audit['environmentFailure']
    snapshots=[x['response']['commit'] for x in json.loads((original/'mcp-trace.json').read_text()) if x['tool']=='get_project_snapshot' and not x['error']]
    assert snapshots;commit=snapshots[0];bundle=prior/c['id']/'main.bundle';env={**os.environ,**v12.ex.runtime_env()}
    if not bundle.exists():
     assert subprocess.check_output(['git','rev-parse','HEAD'],cwd=originalCell['project'],text=True).strip()==commit
     subprocess.run(['git','bundle','create',str(bundle.resolve()),'main'],cwd=originalCell['project'],env=env,check=True,capture_output=True)
    project=Path(c['project']);shutil.rmtree(project);shutil.copytree(original/'project',project,symlinks=True)
    # Import only the pinned commit, not a later Git index or unreachable planning artifacts.
    for command in [['git','init','-q','-b','main'],['git','fetch','-q','--no-tags',str(bundle.resolve()),'main']]:
     subprocess.run(command,cwd=project,env={**os.environ,**v12.ex.runtime_env()},check=True,capture_output=True)
    assert subprocess.check_output(['git','rev-parse','FETCH_HEAD'],cwd=project,text=True).strip()==commit
    subprocess.run(['git','reset','-q','--mixed',commit],cwd=project,env=env,check=True,capture_output=True)
    imported=rep/c['id']/'analysis';imported.mkdir()
    for name in ['audit.json','result.json']:shutil.copyfile(original/name,imported/name)
    if not audit['complete']:
     recovery=json.loads((prior/c['id']/'artifact-recovery.json').read_text());assert not (project/'analysis.md').exists()
     body=(project/recovery['source']).read_bytes();assert hashlib.sha256(body).hexdigest()==recovery['hash'];(project/'analysis.md').write_bytes(body)
     cohort.save(rep/c['id']/'artifact-recovery.json',recovery)
    initial=rep/c['id']/'initial-project';shutil.rmtree(initial);shutil.copytree(project,initial,ignore=shutil.ignore_patterns('.git'))
    state=json.loads((rep/c['id']/'state.json').read_text());state['protected']={k:v for k,v in v12.ex.inventory(project).items() if not k.startswith('.git/')};cohort.save(rep/c['id']/'state.json',state)
    imports.append({'cell':c['id'],'from':str(original),'commit':commit,'originalInventory':v12.ex.inventory(original/'project'),'note':'Imported analysis result is provenance only; do not count its usage as a new call.'})
   cohort.save(rep/'imports.json',imports)
  cohort.save(out/'manifest.json',{'model':'gpt-6-sol','repeats':3,'stages':['plan'],'maxCalls':6,'maxParallel':2,'source':str(source),'scope':'Six new planning sessions from exact prior analysis snapshots. No new analysis calls; imported result files are excluded from accounting.'})
  return
 for n in range(1,4):
  rep=out/f'repeat-{n}';m=json.loads((rep/'manifest.json').read_text());cells=[c for c in m['cells'] if not (rep/c['id']/'plan/result.json').exists()]
  with ThreadPoolExecutor(max_workers=2) as pool:list(pool.map(lambda c:cohort.run(c,rep,m,'plan'),cells))

if __name__=='__main__':main()
