#!/usr/bin/env python3
"""Cross-domain operations contract suite using v4's isolated conversation protocol."""
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('v4_protocol', HERE.parent / 'v4/run.py')
protocol = importlib.util.module_from_spec(spec)
spec.loader.exec_module(protocol)
executor, base = protocol.executor, protocol.base
SPEC = json.loads((HERE / 'contract.json').read_text())
EDITABLE = SPEC['editable']
MUTATIONS = json.loads((HERE / 'mutations.json').read_text())


def mutate(project, change):
    path = project / change['file']
    content = path.read_text()
    if change['before'] not in content:
        raise RuntimeError(f"Missing mutation anchor: {change['name']}")
    path.write_text(content.replace(change['before'], change['after']))


def reference(project):
    shutil.copytree(HERE / 'reference', project, dirs_exist_ok=True)


def prepare(project, case, scenario):
    runtime = base.prepare(project)
    shutil.copytree(base.REPO / 'node_modules/typescript', runtime / 'node_modules/typescript')
    reference(project)
    for change in MUTATIONS:
        if change['starter']: mutate(project, change)
    (project / 'CONTRACT.md').write_text(scenario['publicContract'])
    for command in [['git','add','.'], ['git','-c','user.name=FS Eval','-c','user.email=eval@localhost','commit','-qm','Cross-domain operations starter']]:
        subprocess.run(command, cwd=project, check=True, capture_output=True, env={**os.environ, **executor.runtime_env()})
    return runtime


def scope_result(project, baseline):
    current = base.product_files(project)
    violations = [name for name in sorted(set(baseline) | set(current))
                  if name not in EDITABLE and not (name not in baseline and name.endswith(('.test.mjs','.test.jsx')))
                  and current.get(name) != baseline.get(name)]
    return {'id':'N1-approved-change-scope','status':'failed' if violations else 'passed','paths':violations}


def grade(project, case, output, compliance=False, baseline=None):
    output.mkdir(parents=True, exist_ok=True)
    try:
        result = executor.restricted(project, ['node','--input-type=module','-',str(project)],
                                     'const SPEC = ' + json.dumps(SPEC) + ';\n' + (HERE / 'evaluate.mjs').read_text(), timeout=90)
        (output / 'stdout.log').write_text(result.stdout)
        (output / 'stderr.log').write_text(result.stderr)
        report = json.loads(result.stdout) if result.returncode == 0 else None
        if not isinstance(report, dict) or 'results' not in report:
            raise RuntimeError('Restricted grader failed; inspect logs')
        if baseline is None: raise RuntimeError('This suite requires a protected baseline')
        report['results'].append(scope_result(project, baseline))
        rows = report['results']
        report['planCompliance'] = {'version':2, 'satisfied':sum(row['status']=='passed' for row in rows), 'total':len(rows),
            'forbiddenViolations':[row['id'] for row in rows if row['id'].startswith('N') and row['status']!='passed'],
            'decisionViolations':[row['id'] for row in rows if row['id'].startswith('Q') and row['status']!='passed'],
            'semanticReview':'unverified'}
        report['behaviorEligible'] = all(row['status']=='passed' for row in rows if row['id'].startswith(('F','Q')))
        report['eligible'] = all(row['status']=='passed' for row in rows)
    except (OSError, ValueError, RuntimeError, subprocess.TimeoutExpired) as error:
        report = {'status':'unverified','eligible':False,'reason':str(error),'results':[]}
    executor.save(output / 'grade.json',report)
    return report


def calibration(project, cases, output):
    # Exact expected diagnostic IDs ensure rejection occurs for the intended reason.
    reference(project)
    baseline = base.product_files(project)
    variants = [dict(name='reference', diagnostic=None),
        dict(name='alternative-arithmetic', file='domain/returns.mjs', before='Math.floor(paid * quantity / totalQuantity)',
             after='Math.trunc(quantity * paid / totalQuantity)', diagnostic=None), *MUTATIONS]
    rows = []
    for change in variants:
        reference(project)
        if change.get('file'): mutate(project, change)
        report = grade(project, cases[0], output / change['name'], compliance=True, baseline=baseline)
        rejected = {row['id'] for row in report['results'] if row['status'] != 'passed'}
        diagnostic = change['diagnostic']
        matched = report.get('status') == 'graded' and (diagnostic in rejected if diagnostic else report['eligible'])
        rows.append({'variant':change['name'], 'expectedDiagnostic':diagnostic, 'matched':matched, **report})
    reference(project)
    executor.save(output / 'summary.json', {'rows':rows,'matched':sum(row['matched'] for row in rows),
        'modelCalls':0,'sourceHash':hashlib.sha256((HERE / 'evaluate.mjs').read_bytes()).hexdigest(),
        'limits':'Authored calibration is checker validation, never an AI/FS quality measurement.'})
    if not all(row['matched'] for row in rows): raise RuntimeError('Calibration failed; do not invoke models')


def compliance_calibration(project, cases, output):
    # calibration already exercises the combined behavioral and compliance oracle.
    output.mkdir(parents=True, exist_ok=True)
    executor.save(output / 'summary.json', {'includedIn':'../calibration/summary.json','modelCalls':0})


if __name__ == '__main__':
    # All eight user decisions and protected-scope checks are mandatory, not an optional grade mode.
    if '--track' not in sys.argv: sys.argv.extend(['--track','compliance'])
    if '--track' in sys.argv and sys.argv[sys.argv.index('--track')+1]!='compliance':
        raise SystemExit('v6 supports only --track compliance')
    if '--timeout' not in sys.argv: sys.argv.extend(['--timeout', '2400'])
    protocol.main(suite=sys.modules[__name__])
