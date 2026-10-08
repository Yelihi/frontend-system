#!/usr/bin/env python3
"""Controlled before/after FS journeys using the v9 isolated executor."""
import argparse
from concurrent.futures import ThreadPoolExecutor
import hashlib
import importlib.util
import json
from pathlib import Path
import shutil
import subprocess
import tempfile

HERE=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('v9_iteration',HERE/'run.py')
v9=importlib.util.module_from_spec(spec);spec.loader.exec_module(v9)

def prepare(output):
    output.mkdir(parents=True,exist_ok=False)
    root=Path(tempfile.mkdtemp(prefix='fs-v9-')).resolve()
    prior=HERE/'results/2026-10-05-planning-pilot/frozen-runtime-K1'
    bank=json.loads((HERE/'answers.json').read_text())
    bank['refresh']={**bank['shared'],'identity': 'Every host replacement is credential rotation within the same logical session, even when the token value differs. Replacement alone must not invalidate pending work. A mounted portal has one fixed login realm; replacing the entire portal creates a different lifetime. Old portal work must not affect a new portal. Both panels share this identity.'}
    specifications=[('shared','old'),('shared','new'),('shared','raw'),('independent','old'),('independent','new'),('independent','raw'),('refresh','new'),('refresh','raw')]
    cells=[]
    for case,variant in specifications:
        arm='raw-K1' if variant=='raw' else 'fs-K1'
        ident=f'{case}-{variant}';folder=root/ident;folder.mkdir()
        project,runtime,sync=v9.prepare(folder,'shared' if case=='refresh' else case,arm)
        if variant=='old':
            shutil.rmtree(runtime);shutil.copytree(prior,runtime)
        elif variant=='new':
            # Exact same reviewed corpus, including hashes and timestamps, across FS versions.
            for name in ['knowledge','references/learned']:
                target=runtime/name
                if target.exists():shutil.rmtree(target)
                shutil.copytree(prior/name,target)
        if case=='refresh':
            path=project/'README.md';text=path.read_text()
            text=text.replace('the host calls replacement callbacks after login or tenant\nselection.', 'the host calls replacement callbacks during credential refresh.')
            text=text.replace("The host integration's replacement semantics are not specified here.", "The host integration's pending-work contract during credential refresh is not specified here.")
            path.write_text(text)
            subprocess.run(['git','add','README.md'],cwd=project,check=True,capture_output=True)
            subprocess.run(['git','-c','user.name=FS Eval','-c','user.email=eval@localhost','commit','-qm','Credential rotation fixture'],cwd=project,check=True,capture_output=True)
        cell={'id':ident,'case':case,'arm':arm,'variant':variant,'project':str(project),'runtime':str(runtime)};cells.append(cell)
        v9.save(output/ident/'sync.json',sync)
        v9.save(output/ident/'state.json',{'protected':v9.protected(project),'runtimeInventory':v9.executor.inventory(runtime)})
        shutil.copytree(project,output/ident/'initial-project',ignore=shutil.ignore_patterns('.git'))
    manifest={'version':'9-iteration','model':'gpt-6-sol','timeout':600,'replicates':1,'cells':cells,'inputs':v9.authored_inputs(),'answerBank':bank,'previousRuntime':str(prior),'executorHash':hashlib.sha256(Path(v9.executor.__file__).read_bytes()).hexdigest()}
    v9.save(output/'manifest.json',manifest)
    shutil.copytree(HERE/'corpus',output/'frozen-corpus')
    for variant in ['old','new']:
        cell=next(c for c in cells if c['variant']==variant)
        shutil.copytree(cell['runtime'],output/('frozen-runtime-'+variant))
    for name in ['run.py','iterate.py','review.py','iteration-protocol.md','answers.json']:
        shutil.copy(HERE/name,output/('frozen-'+name))
    print(output,flush=True)

def main():
    parser=argparse.ArgumentParser();parser.add_argument('phase',choices=['prepare','questions','plan'])
    parser.add_argument('--output',type=Path,required=True);parser.add_argument('--ids',nargs='*')
    args=parser.parse_args();output=args.output.resolve()
    if args.phase=='prepare':prepare(output);return
    manifest=json.loads((output/'manifest.json').read_text())
    if manifest['inputs']!=v9.authored_inputs():raise RuntimeError('Authored inputs changed during frozen experiment')
    if json.loads((output/'isolation/summary.json').read_text())['status']!='preflight-passed':raise RuntimeError('Isolation preflight required')
    cells=[c for c in manifest['cells'] if not args.ids or c['id'] in args.ids]
    if args.ids and {c['id'] for c in cells}!=set(args.ids):raise ValueError('Unknown cell selection')
    for c in cells:
        if (output/c['id']/args.phase/'result.json').exists():raise ValueError('Do not overwrite a previous model attempt')
    with ThreadPoolExecutor(max_workers=2) as pool:
        records=list(pool.map(lambda c:v9.run_cell(c,args.phase,output,manifest),cells))
    v9.save(output/(args.phase+'-'+ '-'.join(c['id'] for c in cells)+'-summary.json'),{'records':records})
if __name__=='__main__':main()
