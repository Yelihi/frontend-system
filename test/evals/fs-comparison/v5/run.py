#!/usr/bin/env python3
"""Layered order contract suite using v4's isolated conversation protocol."""
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
EDITABLE = ['App.jsx', 'shared/http.mjs', 'domain/orders.mjs', 'data/orders.mjs',
            'application/orders.mjs', 'ui/OrderList.jsx', 'ui/Checkout.jsx']


def reference(project):
    shutil.copytree(HERE / 'reference', project, dirs_exist_ok=True)


def prepare(project, case, scenario):
    runtime = base.prepare(project)
    shutil.copytree(base.REPO / 'node_modules/typescript', runtime / 'node_modules/typescript')
    reference(project)
    # A runnable but flawed starter; both arms get exactly these same bytes.
    replacements = {
        'shared/http.mjs': [("credentials: 'same-origin'", "credentials: 'include'")],
        'domain/orders.mjs': [("(kind === 'gift' && coupon !== '')", 'false')],
        'application/orders.mjs': [('if (current === generation)', 'if (true)'),
                                   ('items: [...state.items]', 'items: state.items'),
                                   ('return repository.place({...input, total});', 'input.total = total; return repository.place(input);')],
        'ui/OrderList.jsx': [('const pending = orders.load();', "const pending = fetch('/orders');")],
    }
    for name, changes in replacements.items():
        path = project / name
        content = path.read_text()
        for before, after in changes:
            if before not in content: raise RuntimeError(f'Missing starter anchor: {name}: {before}')
            content = content.replace(before, after)
        path.write_text(content)
    (project / 'CONTRACT.md').write_text(scenario['publicContract'])
    for command in [['git','add','.'], ['git','-c','user.name=FS Eval','-c','user.email=eval@localhost','commit','-qm','Layered order starter']]:
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
                                     (HERE / 'evaluate.mjs').read_text(), timeout=45)
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
    variants = [
        ('reference',None,None,None,None),
        ('alternative-helper','domain/orders.mjs', 'return quantity * 1000 - (coupon === \'SAVE\' ? 200 : 0);',
         "const discount = coupon === 'SAVE' ? 200 : 0; return 1000 * quantity - discount;",None),
        ('wrong-credentials','shared/http.mjs',"credentials: 'same-origin'","credentials: 'include'",'F2-http-ownership'),
        ('swallowed-auth-choice','shared/http.mjs','onUnauthorized();','try { onUnauthorized(); } catch {}','Q1-auth-callback-answer'),
        ('wrong-domain-scope','domain/orders.mjs',"(kind === 'gift' && coupon !== '')",'false','F4-domain-policy'),
        ('fractional-quantity','domain/orders.mjs','!Number.isInteger(quantity)','typeof quantity !== \'number\'','F4-domain-policy'),
        ('dropped-signal','data/orders.mjs',"{method: 'GET', signal}","{method: 'GET'}",'F5-repository-delegation'),
        ('stale-success','application/orders.mjs','if (current === generation) state = {items:', 'if (true) state = {items:','F6-latest-response-wins'),
        ('stale-failure','application/orders.mjs','if (current === generation) state = {...state, status:', 'if (true) state = {...state, status:','F6-latest-response-wins'),
        ('cleared-items','application/orders.mjs',"state = {...state, status: 'error', error}","state = {items: [], status: 'error', error}",'Q2-refresh-failure-answer'),
        ('leaked-state','application/orders.mjs','items: [...state.items]','items: state.items','F7-state-snapshot-ownership'),
        ('mutated-input','application/orders.mjs','repository.place({...input, total})','repository.place(Object.assign(input, {total}))','F8-submit-validation-and-ownership'),
        ('bypass-validation','application/orders.mjs','const total = quote(input);','const total = 1800;','F8-submit-validation-and-ownership'),
        ('direct-ui-request','ui/OrderList.jsx','const pending = orders.load();',"const pending = fetch('/orders');",'N2-approved-dependency-edges'),
        ('hidden-module-edge','domain/orders.mjs','export function quote',"import '../shared/format.mjs';\nexport function quote",'N2-approved-dependency-edges'),
        ('extra-api','domain/orders.mjs','export function quote','export const unused = 1;\nexport function quote','F1-public-contract'),
        ('protected-change','shared/format.mjs','toFixed(2)','toFixed(3)','N1-approved-change-scope'),
    ]
    rows = []
    for name, file, before, after, diagnostic in variants:
        reference(project)
        if file:
            path=project / file
            if before not in path.read_text(): raise RuntimeError(f'Mutation anchor missing: {name}')
            path.write_text(path.read_text().replace(before,after))
        report=grade(project,cases[0],output / name,compliance=True,baseline=baseline)
        rejected={row['id'] for row in report['results'] if row['status']!='passed'}
        matched=report.get('status')=='graded' and (diagnostic in rejected if diagnostic else report['eligible'])
        rows.append({'variant':name,'expectedDiagnostic':diagnostic,'matched':matched,**report})
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
    # Q1/Q2 and protected-scope checks are mandatory, not an optional grade mode.
    if '--track' not in sys.argv: sys.argv.extend(['--track','compliance'])
    if '--track' in sys.argv and sys.argv[sys.argv.index('--track')+1]!='compliance':
        raise SystemExit('v5 supports only --track compliance')
    protocol.main(suite=sys.modules[__name__])
