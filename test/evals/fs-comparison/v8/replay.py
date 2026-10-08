#!/usr/bin/env python3
"""Diagnostic comparison on the same saved pre-failure code, not a new journey score."""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tarfile
import tempfile
import time

HERE=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('v8_replay_restore',HERE/'regrade.py')
restore_module=importlib.util.module_from_spec(spec);spec.loader.exec_module(restore_module)
suite=restore_module.suite


def restore_input(project,snapshot):
    # Restore only in the fresh evaluation checkout. Reject symlinks and protected
    # paths through the shared regrader; never execute snapshot code on the host.
    restore_module.restore(project,snapshot,snapshot.resolve())
    shutil.rmtree(project/'.frontend-system',ignore_errors=True)
    if (project/'REQUEST-defaults.md').exists():
        raise ValueError('Replay requires the snapshot before the failed request')


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--snapshot',type=Path,required=True)
    parser.add_argument('--model',default='gpt-6-sol')
    parser.add_argument('--timeout',type=int,default=2400)
    args=parser.parse_args()
    if args.timeout<1:parser.error('timeout must be positive')
    snapshot=args.snapshot.absolute()
    if not snapshot.is_dir() or snapshot.is_symlink():parser.error('snapshot must be a real directory')
    output=HERE/'results'/('replay-'+time.strftime('%Y-%m-%dT%H%M%S'));output.mkdir(parents=True,exist_ok=False)
    arms=['informed','fs'];stage=suite.STAGES[2];calls=0;journeys=[]
    manifest={'kind':'diagnostic-replay','model':args.model,'timeout':args.timeout,'arms':arms,'stage':stage,
        'sourceSnapshot':str(snapshot),'sourceHashes':suite.executor.inventory(snapshot),
        'runtime':{name:suite.executor.inventory(suite.base.REPO/name) for name in ['bundle','skills','references','mandatory-rules']},
        'suite':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in HERE.iterdir() if p.is_file()},
        'config':suite.executor.COMMON_CONFIG,
        'limits':'Both arms receive the same successful variants code and public documents. Fresh plan records, fresh conversation. This diagnoses a discovered case, not held-out or full-journey superiority.'}
    manifest['hash']=hashlib.sha256(json.dumps(manifest,sort_keys=True).encode()).hexdigest()
    suite.executor.save(output/'manifest.json',manifest)
    def authored(member):
        return None if any(p in {'results','validation','__pycache__','node_modules'} for p in Path(member.name).parts) else member
    with tarfile.open(output/'inputs.tar.gz','w:gz') as archive:
        for name in ['bundle','skills','references','mandatory-rules','src','package.json','package-lock.json']:
            archive.add(suite.base.REPO/name,arcname='frontend-system/'+name,filter=authored)
        archive.add(HERE.parent,arcname='eval',filter=authored)
        for name in ['package.json','package-lock.json']:
            archive.add(suite.base.REPO/'test/fixtures/frontend'/name,arcname='frontend-fixture/'+name)
        archive.add(snapshot,arcname='starting-snapshot')
    suite.executor.save(output/'inputs-archive.json',{'sha256':hashlib.sha256((output/'inputs.tar.gz').read_bytes()).hexdigest(),'manifestHash':manifest['hash']})
    def called():
        nonlocal calls
        calls+=1
    def save(status,reason=None):
        suite.executor.save(output/'summary.json',{'kind':'diagnostic-replay','status':status,'reason':reason,'manifestHash':manifest['hash'],'modelCalls':calls,'journeys':journeys,'limits':manifest['limits']})
    try:
        preflight=subprocess.run([sys.executable,str(suite.executor.HERE/'run.py'),'--preflight-only','--output',str(output/'isolation')],capture_output=True,text=True)
        suite.executor.save(output/'isolation-process.json',{'exitCode':preflight.returncode,'stdout':preflight.stdout,'stderr':preflight.stderr})
        if preflight.returncode:raise RuntimeError('Isolation preflight failed; no model calls')
        source_product=None
        for arm in arms:
            with tempfile.TemporaryDirectory(prefix='fs-v8-replay-') as temp:
                project=Path(temp).resolve()/'project';runtime=suite.prepare(project)
                if any(suite.executor.inventory(runtime/name)!=hashes for name,hashes in manifest['runtime'].items()):raise RuntimeError('Runtime changed since manifest')
                if suite.executor.inventory(snapshot)!=manifest['sourceHashes']:raise RuntimeError('Source snapshot changed')
                restore_input(project,snapshot);suite.commit(project,'Identical pre-failure replay input')
                product=suite.base.product_files(project)
                if source_product is not None and product!=source_product:raise RuntimeError('Replay input differs between arms')
                source_product=product
                before=suite.grade(project,'variants',output/arm/'input-grade',product)
                if not before.get('eligible'):raise RuntimeError('Starting snapshot does not satisfy prior-stage contract')
                frozen=suite.executor.inventory(runtime)
                journey=suite.run_stage(project,runtime,frozen,arm,stage,output/arm/'defaults',args,called)
                journeys.append(journey);save('running')
                if journey['infra'] or journey['finalGrade']['status']=='unverified':raise RuntimeError(journey['infra'] or 'Unverified invocation')
        save('completed')
    except (OSError,ValueError,RuntimeError,subprocess.SubprocessError) as error:
        save('blocked',str(error));print(f'Blocked: {error}\n{output}',flush=True);raise SystemExit(1)
    print(output,flush=True)


if __name__=='__main__':main()
