#!/usr/bin/env python3
"""Restricted regrading with current oracle; never rewrite historical grades or usage."""
import hashlib
import importlib.util
import json
from pathlib import Path
import shutil
import sys
import tempfile
HERE=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('v8_regrade',HERE/'run.py')
suite=importlib.util.module_from_spec(spec);spec.loader.exec_module(suite)


def restore(project,snapshot,root):
    if not snapshot.resolve().is_relative_to(root) or snapshot.is_symlink():raise ValueError('Snapshot escape')
    for child in project.iterdir():
        if child.name in {'.git','node_modules'}:continue
        if child.is_file() or child.is_symlink():child.unlink()
        else:shutil.rmtree(child)
    for path in snapshot.rglob('*'):
        if path.is_symlink():raise ValueError('Snapshot symlink')
        if path.is_file():
            relative=path.relative_to(snapshot)
            if relative.parts[0] in {'.git','node_modules','dist'}:raise ValueError('Protected snapshot path')
            target=project/relative;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(path.read_bytes())


def regrade(root):
    root=root.resolve();rows=[]
    if (root/'regrade').exists():raise ValueError('Keep existing regrade artifacts; use their saved result')
    for arm in suite.ARMS:
        previous=None
        for stage in suite.STAGES:
            sid=stage['id'];records=sorted((root/arm/sid/'work').glob('*/record.json'))
            if not records:break
            for path in records:
                old=json.loads(path.read_text())['grade']
                if old.get('status')!='graded':continue
                with tempfile.TemporaryDirectory(prefix='fs-v8-regrade-') as temp:
                    project=Path(temp).resolve()/'project';suite.prepare(project)
                    if previous:restore(project,previous,root)
                    baseline=suite.base.product_files(project)
                    restore(project,path.parent/'snapshot',root)
                    new=suite.grade(project,sid,root/'regrade'/arm/sid/path.parent.name,baseline)
                    rows.append({'arm':arm,'stage':sid,'attempt':path.parent.name,'status':new.get('status'),'grade':new.get('planCompliance'),
                        'sameDiagnostics':[(r['id'],r['status']) for r in old['results']]==[(r['id'],r['status']) for r in new['results']]})
            previous=records[-1].parent/'snapshot'
    result={'modelCalls':0,'rows':rows,'oracleHashes':{s['id']:hashlib.sha256(suite.oracle_source(s['id']).encode()).hexdigest() for s in suite.STAGES},
        'limits':'Regrading saved artifacts does not complete aborted calls or replace original workflow/usage evidence.'}
    suite.executor.save(root/'regrade/summary.json',result)
    print(json.dumps(result))

if __name__=='__main__':
    for path in sys.argv[1:]:regrade(Path(path))
