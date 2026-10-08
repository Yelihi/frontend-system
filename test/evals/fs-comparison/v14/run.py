#!/usr/bin/env python3
"""Repeat the existing controlled v12 journeys; freeze runtime, add usage telemetry."""
import argparse,hashlib,importlib.util,json,random,shutil
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from tokens import collect
HERE=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('v12',HERE.parent/'v12/run.py');v12=importlib.util.module_from_spec(spec);spec.loader.exec_module(v12)
v12.ARMS=['ordinary','fs-K1']
def save(path,data):path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
def run(cell,out,manifest,stage):
 target=out/cell['id']/stage
 if target.exists():raise ValueError('Never overwrite a prior attempt: '+str(target))
 v12.run_cell(cell,out,manifest,stage)
 try:
  data=collect(target);print('Token reconciliation '+cell['id']+'/'+stage+': '+str(len(data['points']))+' responses',flush=True)
 except (ValueError,KeyError,OSError) as e:
  save(target/'token-error.json',{'status':'unverified','error':str(e)});print('Usage trajectory unavailable: '+str(e),flush=True)
def main():
 ap=argparse.ArgumentParser();ap.add_argument('phase',choices=['prepare','run']);ap.add_argument('--output',type=Path,required=True);a=ap.parse_args();out=a.output.resolve()
 if a.phase=='prepare':
  out.mkdir(parents=True,exist_ok=False)
  for repeat in range(1,4):
   folder=out/('repeat-'+str(repeat));v12.prepare(folder,argparse.Namespace(model='gpt-6-sol'))
   m=json.loads((folder/'manifest.json').read_text());random.Random(1400+repeat).shuffle(m['cells']);save(folder/'manifest.json',m)
  save(out/'manifest.json',{'model':'gpt-6-sol','reasoning':'medium','repeats':3,'cases':['request','styles'],
       'arms':v12.ARMS,'stages':['analysis','plan'],'maxCalls':24,'maxParallel':2,
       'runtimeSha256':hashlib.sha256((out/'repeat-1/frozen-runtime/bundle/mcp.js').read_bytes()).hexdigest(),
       'protocolSha256':hashlib.sha256((HERE/'protocol.md').read_bytes()).hexdigest()})
  for name in ['protocol.md','run.py','tokens.py']:shutil.copyfile(HERE/name,out/('frozen-'+name))
  return
 for repeat in range(1,4):
  folder=out/('repeat-'+str(repeat));m=json.loads((folder/'manifest.json').read_text())
  for stage in ['analysis','plan']:
   cells=[]
   for c in m['cells']:
    target=folder/c['id']/stage
    if (target/'result.json').exists():continue
    # v12 revalidates exact bytes and successful execution for documented location-only recovery.
    if stage=='plan' and not json.loads((folder/c['id']/'analysis/audit.json').read_text())['complete'] and not (folder/c['id']/'artifact-recovery.json').exists():
     save(folder/c['id']/'plan-skipped.json',{'reason':'Incomplete initial stage; no fabricated follow-up'});continue
    cells.append(c)
   with ThreadPoolExecutor(max_workers=2) as pool:list(pool.map(lambda c:run(c,folder,m,stage),cells))
  v12.summarize(folder,m)
if __name__=='__main__':main()
