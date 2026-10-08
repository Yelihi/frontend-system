#!/usr/bin/env python3
"""Recheck saved work with the corrected oracle, in the restricted grader only.
Original records, grades, usage, eligibility and model calls are never rewritten.
"""
import hashlib
import importlib.util
import json
from pathlib import Path
import sys
import shutil
import tempfile

HERE=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('regrade_suite',HERE/'run.py')
suite=importlib.util.module_from_spec(spec);spec.loader.exec_module(suite)

def regrade(root):
    root=root.resolve()
    manifest=json.loads((root/'manifest.json').read_text())
    scenario=manifest['scenario']
    if (root/'regrade').is_symlink():raise RuntimeError('Refuse symlink output')
    rows=[]
    for path in sorted(root.glob('*/work/*/record.json')):
        record=json.loads(path.read_text())
        label=str(path.parent.relative_to(root))
        if record['grade']['status']!='graded':
            rows.append({'record':label,'status':'skipped-unverified','originalStatus':record['grade']['status']})
            continue
        case_id=path.parents[2].name.rsplit('-',1)[0]
        case=next(case for case in scenario['cases'] if case['id']==case_id)
        snapshot=path.parent/'snapshot'
        if not snapshot.resolve().is_relative_to(root):raise RuntimeError('Snapshot escapes result root')
        with tempfile.TemporaryDirectory(prefix='fs-regrade-') as temp:
            project=Path(temp).resolve()/'project'
            suite.prepare(project,case,scenario)
            baseline=suite.base.product_files(project)
            for child in project.iterdir():
                if child.name in {'.git','node_modules'}:continue
                if child.is_file() or child.is_symlink():child.unlink()
                else:shutil.rmtree(child)
            for artifact in snapshot.rglob('*'):
                if artifact.is_symlink():raise RuntimeError(f'Refuse snapshot symlink: {artifact}')
                if artifact.is_file():
                    relative=artifact.relative_to(snapshot)
                    if relative.parts[0] in {'.git','node_modules'}:raise RuntimeError('Protected snapshot path')
                    destination=project/relative
                    destination.parent.mkdir(parents=True,exist_ok=True)
                    destination.write_bytes(artifact.read_bytes())
            grade=suite.grade(project,case,root/'regrade'/label,True,baseline)
        old=record['grade']
        rows.append({'record':label,'status':grade.get('status'),'eligible':grade.get('eligible'),
            'satisfied':grade.get('planCompliance',{}).get('satisfied'),
            'total':grade.get('planCompliance',{}).get('total'),
            'originalEligible':old.get('eligible'),
            'sameDiagnostics':[(r['id'],r['status']) for r in old['results']]==[(r['id'],r['status']) for r in grade['results']]})
    report={'modelCalls':0,'originalManifestHash':manifest['hash'],
        'oracleHash':hashlib.sha256(suite.oracle_source().encode()).hexdigest(),'rows':rows,
        'limits':'Restricted snapshot regrading only; does not complete aborted model turns or replace original runtime/usage evidence.'}
    suite.executor.save(root/'regrade/summary.json',report)
    print(json.dumps({'result':str(root),'rows':rows}))

if __name__=='__main__':
    for argument in sys.argv[1:]:regrade(Path(argument))
