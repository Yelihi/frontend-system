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
STYLE_POLICY = json.loads((HERE / 'style-policy.json').read_text())
STYLE_CONTRACT = json.loads((HERE / 'style-contract.json').read_text())
EDITABLE = ['App.jsx', 'theme.css', *[name for name in SPEC['editable'] if name.startswith('ui/') and name.endswith('.jsx')]]
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
    shutil.copytree(HERE / 'toolchain/node_modules', runtime / 'node_modules', dirs_exist_ok=True, ignore=shutil.ignore_patterns('.bin', '.package-lock.json'))
    reference(project)
    shutil.copy(HERE / 'style-policy.json', project / 'style-policy.json')
    package = json.loads((project / 'package.json').read_text())
    package['dependencies'] = {'react':json.loads((runtime / 'node_modules/react/package.json').read_text())['version'],'tailwindcss':'4.3.3','class-variance-authority':'0.7.1'}
    package['scripts']['lint:styles'] = 'node ../runtime/bundle/style-check.js . style-policy.json'
    (project / 'package.json').write_text(json.dumps(package, indent=2)+'\n')
    with (runtime / 'build.mjs').open('a') as handle:
        handle.write((HERE / 'build-css.mjs').read_text())
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
                                     oracle_source(), timeout=90)
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


def oracle_source():
    source = (HERE.parent / 'v6/evaluate.mjs').read_text()
    # React preserves props.children when no positional children are supplied.
    source = source.replace('{type, props: {...props, children}}', '{type, props: {...props, ...(children.length ? {children} : {})}}')
    marker = 'console.log(JSON.stringify('
    position = source.index(marker)
    return ('const SPEC = ' + json.dumps(SPEC) + ';\nconst STYLE_POLICY = ' + json.dumps(STYLE_POLICY)
            + ';\nconst STYLE_CONTRACT = ' + json.dumps(STYLE_CONTRACT) + ';\n'
            + source[:position] + (HERE / 'style-checks.mjs').read_text() + '\n' + source[position:])


def calibration(project, cases, output):
    reference(project)
    baseline = base.product_files(project)
    variants = [dict(name='reference', diagnostic=None),
        dict(name='cva-import-alias', file='ui/ActionButton.jsx', before="import {cva} from 'class-variance-authority';", after="import {cva as variants} from 'class-variance-authority';", diagnostic=None),
        dict(name='local-cva-result', file='ui/ActionButton.jsx', before='return <button {...props} className={classes({tone,size,className})}/>;', after='const applied=classes({tone,size,className}); return <button {...props} className={applied}/>;', diagnostic=None),
        dict(name='theme-comment', file='theme.css', before='@theme inline {', after='/* Keep this palette. Do not add dark mode. */\n@theme inline {', diagnostic=None), *MUTATIONS]
    rows = []
    for change in variants:
        reference(project)
        if change.get('file'):
            mutate(project, change)
            if change['name']=='cva-import-alias':
                p=project / change['file'];p.write_text(p.read_text().replace('= cva(', '= variants('))
        report = grade(project, cases[0], output / change['name'], compliance=True, baseline=baseline)
        rejected = {row['id'] for row in report['results'] if row['status'] != 'passed'}
        diagnostic = change['diagnostic']
        matched = report.get('status') == 'graded' and (diagnostic in rejected if diagnostic else report['eligible'])
        # These violations must preserve ALL functional outcomes, not merely be rejected.
        same_output = not change['name'].startswith(('ternary-', 'map-')) or not any(row['id'].startswith('F') and row['status']!='passed' for row in report['results'])
        rows.append({'variant':change['name'], 'expectedDiagnostic':diagnostic, 'matched':bool(matched and same_output), 'functionalEquivalence':same_output, **report})
    reference(project)
    executor.save(output / 'summary.json', {'rows':rows,'matched':sum(row['matched'] for row in rows), 'modelCalls':0,
        'sourceHash':hashlib.sha256(oracle_source().encode()).hexdigest(),
        'limits':'Authored checker/functional-equivalence calibration; not model performance.'})
    if not all(row['matched'] for row in rows): raise RuntimeError('Calibration failed; no model calls')


def compliance_calibration(project, cases, output):
    # calibration already exercises the combined behavioral and compliance oracle.
    output.mkdir(parents=True, exist_ok=True)
    executor.save(output / 'summary.json', {'includedIn':'../calibration/summary.json','modelCalls':0})


if __name__ == '__main__':
    # All eight user decisions and protected-scope checks are mandatory, not an optional grade mode.
    if '--track' not in sys.argv: sys.argv.extend(['--track','compliance'])
    if '--track' in sys.argv and sys.argv[sys.argv.index('--track')+1]!='compliance':
        raise SystemExit('v7 supports only --track compliance')
    if '--timeout' not in sys.argv: sys.argv.extend(['--timeout', '2400'])
    protocol.main(suite=sys.modules[__name__])
