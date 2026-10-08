#!/usr/bin/env python3
"""Recalibrate the accessible-name correction, then regrade every retained run."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import signal
import subprocess
import tempfile
import time
import urllib.request
import urllib.error
from prepare import HERE, REPO, prepare
from run import EXCLUDED, inventory

RUN = Path(json.loads((HERE / 'frozen.json').read_text())['output'])
GRADER = HERE / 'grade-accessible-v2.mjs'


def save(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


def grade(project, output, grader=GRADER):
    output.mkdir(parents=True, exist_ok=True)
    before = inventory(project, EXCLUDED)
    with (output / 'server.log').open('w') as log:
        server = subprocess.Popen(['npm', 'run', 'dev'], cwd=project, stdout=log,
            stderr=subprocess.STDOUT, start_new_session=True,
            env={**os.environ, 'NEXT_TELEMETRY_DISABLED': '1'})
        try:
            for _ in range(120):
                if server.poll() is not None:
                    raise RuntimeError('Server exited; see ' + str(output))
                try:
                    with urllib.request.urlopen('http://127.0.0.1:3217', timeout=1) as response:
                        if response.status == 200:
                            break
                except urllib.error.HTTPError:
                    # A responding error page is a product outcome to grade.
                    break
                except (OSError, TimeoutError):
                    time.sleep(0.5)
            else:
                raise RuntimeError('Server did not become ready')
            with (output / 'grader.log').open('w') as grader_log:
                subprocess.run(['node', str(grader), str(project), str(output), 'http://127.0.0.1:3217'],
                    stdout=grader_log, stderr=subprocess.STDOUT, timeout=180, check=True)
        finally:
            try:
                os.killpg(server.pid, signal.SIGTERM)
                server.wait(timeout=10)
            except subprocess.TimeoutExpired:
                os.killpg(server.pid, signal.SIGKILL)
                server.wait()
            except ProcessLookupError:
                pass
    after = inventory(project, EXCLUDED)
    assert before == after, str(output)
    save(output / 'source-verification.json', {'before': before, 'after': after,
        'unchanged': True, 'graderSha256': hashlib.sha256(grader.read_bytes()).hexdigest()})
    return json.loads((output / 'score.json').read_text())


def main():
    # Keep additional server/browser work out of timed implementation sessions.
    assert len(list(RUN.glob('*/complete.json'))) == 36, 'Wait until all frozen model runs finish'
    original = (HERE / 'grade.mjs').read_text()
    corrected = GRADER.read_text()
    assert original.split('const browserCases =')[0] == corrected.split('const browserCases =')[0]
    out = RUN / 'label-semantics/calibration'
    out.mkdir(exist_ok=True)
    specifications = [
        ('flat', 'flat', []), ('layered', 'layered', []),
        ('wrapped-labels', 'flat', []), ('framework-imports', 'flat', []),
        ('wrong-total-name', 'flat', ['default-and-updated-total']),
        ('wrong-coupon-name', 'flat', ['default-and-updated-total', 'order-lock-failure-retry']),
        ('stale-failure', 'flat', ['late-failure']),
        ('stale-success', 'flat', ['late-success']),
        ('stale-quote-order', 'flat', ['pending-quote-prevents-order']),
        ('stuck-order-lock', 'flat', ['order-lock-failure-retry']),
        ('http-500', 'flat', ['default-and-updated-total', 'late-success', 'late-failure',
            'pending-quote-prevents-order', 'failed-quote-retry', 'order-lock-failure-retry',
            'keyboard-order', 'mobile-and-runtime']),
    ]
    changes = {
        'stale-failure': [('if (!disposed && request === revision) update({ quote: null, error: error.message });', 'if (!disposed) update({ quote: null, error: error.message });')],
        'stale-success': [('if (!disposed && request === revision) update({ quote, error:', 'if (!disposed) update({ quote, error:')],
        'stale-quote-order': [('update({ quote: null, quoting:', 'update({ quote: state.quote, quoting:'), ('state.ordering || state.quoting || !state.quote', 'state.ordering || !state.quote')],
        'stuck-order-lock': [('finally { update({ ordering: false }); }', 'finally { update({ ordering: true }); }')],
    }
    calibration = []
    with tempfile.TemporaryDirectory(prefix='accessible-regrade-', dir=HERE.parent / '.work') as temporary:
        root = Path(temporary)
        for name, variant, expected in specifications:
            target = out / name
            if not (target / 'source-verification.json').exists():
                project = prepare(root / name, variant, dependencies=True)
                ui = project / 'app/checkout.jsx'
                content = ui.read_text()
                if name == 'http-500':
                    content = ''
                elif name == 'wrapped-labels':
                    assert '</select>\n    </p>' in content
                    content = content.replace('<label htmlFor="coupon">Coupon</label>', '<label>Coupon').replace('</select>\n    </p>', '</select></label>\n    </p>')
                    content = content.replace('<p>Total: <output aria-label="Total">', '<p><label>Total<output>').replace('</output></p>', '</output></label></p>')
                elif name == 'wrong-total-name':
                    content = content.replace('aria-label="Total"', 'aria-label="Wrong total"')
                elif name == 'wrong-coupon-name':
                    content = content.replace('>Coupon</label>', '>Wrong coupon</label>')
                ui.write_text(content)
                if name == 'framework-imports':
                    for endpoint in ('quote', 'orders'):
                        route = project / f'app/api/{endpoint}/route.js'
                        route.write_text("import { NextResponse } from 'next/server';\n" + route.read_text().replace('../../../src/checkout.js', '@/checkout').replace('../../../src/catalog.js', '@/catalog').replace('Response.json', 'NextResponse.json'))
                for before, after in changes.get(name, []):
                    path = project / 'src/controller.js'
                    assert before in path.read_text(), name
                    path.write_text(path.read_text().replace(before, after))
                print('CALIBRATE ' + name, flush=True)
                grade(project, target)
                shutil.copytree(project, target / 'source', ignore=shutil.ignore_patterns('node_modules', '.next', 'test-results', 'playwright-report'))
            score = json.loads((target / 'score.json').read_text())
            failures = [c['id'] for c in score['cases'] if c['status'] == 'failed']
            missing = [c['id'] for c in score['cases'] if c['status'] == 'not-run']
            passed = len(score['cases']) == 110 and not missing and (set(expected) <= set(failures) if expected else not failures)
            calibration.append({'name': name, 'expectedFailures': expected, 'failures': failures, 'notRun': missing, 'passed': passed})
            save(out / 'summary.json', {'cases': calibration, 'passed': all(c['passed'] for c in calibration), 'modelCalls': 0})
            assert passed, name
        results = []
        for index in range(1, 37):
            number = f'{index:02d}'
            case = RUN / number
            target = case / 'checks-accessible-v2'
            if not (target / 'source-verification.json').exists():
                project = root / number
                shutil.copytree(case / 'source', project)
                subprocess.run(['cp', '-cR', str(REPO / 'test/fixtures/frontend/node_modules'), str(project / 'node_modules')], check=True)
                print('REGRADE ' + number, flush=True)
                grade(project, target)
                shutil.rmtree(project)
            old = json.loads((case / 'checks/grade/score.json').read_text())
            new = json.loads((target / 'score.json').read_text())
            key = lambda c: (c['category'], c['rule'], c['id'])
            assert [key(c) for c in old['cases']] == [key(c) for c in new['cases']]
            assert all(c['status'] != 'not-run' for c in new['cases'])
            changeset = [{'id': a['id'], 'category': a['category'], 'original': a['status'], 'corrected': b['status']} for a,b in zip(old['cases'], new['cases']) if a['status'] != b['status']]
            assert all(c['category'] == 'browser' for c in changeset), number
            results.append({'run': number, 'originalPassed': sum(c['status']=='passed' for c in old['cases']), 'correctedPassed': sum(c['status']=='passed' for c in new['cases']), 'changes': changeset, 'sourceUnchanged': True})
            save(RUN / 'regrade-summary.json', {'complete': len(results)==36, 'graderSha256': hashlib.sha256(GRADER.read_bytes()).hexdigest(), 'calibration': 'label-semantics/calibration/summary.json', 'results': results})
    hold = json.loads((RUN / 'label-semantics/hold.json').read_text())
    hold['status'] = 'all-36-regraded-pending-review-adjudication'
    hold['regradeSummary'] = '../regrade-summary.json'
    save(RUN / 'label-semantics/hold.json', hold)


if __name__ == '__main__':
    main()
