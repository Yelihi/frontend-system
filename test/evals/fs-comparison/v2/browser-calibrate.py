#!/usr/bin/env python3
"""Calibrate the fixed browser cases against both valid structures and async defects."""
import json
import os
from pathlib import Path
import shutil
import signal
import subprocess
import tempfile
import time
import urllib.request
from prepare import HERE, prepare
from calibrate import replace, save


def browser_grade(project, output):
    output.mkdir(parents=True, exist_ok=True)
    with (output / 'server.log').open('w') as log:
        server = subprocess.Popen(['npm', 'run', 'dev'], cwd=project, stdout=log,
                                  stderr=subprocess.STDOUT, start_new_session=True,
                                  env={**os.environ, 'NEXT_TELEMETRY_DISABLED': '1'})
        try:
            for _ in range(120):
                if server.poll() is not None:
                    raise RuntimeError('Server exited; see server.log')
                try:
                    with urllib.request.urlopen('http://127.0.0.1:3217', timeout=1) as response:
                        if response.status == 200:
                            break
                except (OSError, TimeoutError):
                    time.sleep(0.5)
            else:
                raise RuntimeError('Server did not become ready')
            run = subprocess.run(['node', str(HERE / 'grade.mjs'), str(project), str(output),
                                  'http://127.0.0.1:3217'], capture_output=True, text=True, timeout=180)
            (output / 'grader.log').write_text(run.stdout + run.stderr)
            if run.returncode:
                raise RuntimeError('Grader failed; see grader.log')
            return json.loads((output / 'score.json').read_text())
        finally:
            try:
                os.killpg(server.pid, signal.SIGTERM)
                server.wait(timeout=10)
            except subprocess.TimeoutExpired:
                os.killpg(server.pid, signal.SIGKILL)
                server.wait()
            except ProcessLookupError:
                pass


def main():
    if (HERE / 'frozen.json').exists():
        raise RuntimeError('Already frozen')
    output = HERE / 'results' / ('browser-calibration-' + time.strftime('%Y-%m-%dT%H%M%S'))
    output.mkdir()
    scratch = HERE.parent / '.work'
    root = Path(tempfile.mkdtemp(prefix='v2-browser-', dir=scratch))
    specs = [
        ('flat', [], []), ('layered', [], []), ('framework-imports', [], []),
        ('stale-failure', [('if (!disposed && request === revision) update({ quote: null, error: error.message });', 'if (!disposed) update({ quote: null, error: error.message });')], ['late-failure']),
        ('stale-success', [('if (!disposed && request === revision) update({ quote, error:', 'if (!disposed) update({ quote, error:')], ['late-success']),
        ('stale-quote-order', [('update({ quote: null, quoting:', 'update({ quote: state.quote, quoting:'), ('state.ordering || state.quoting || !state.quote', 'state.ordering || !state.quote')], ['pending-quote-prevents-order']),
        ('stuck-order-lock', [('finally { update({ ordering: false }); }', 'finally { update({ ordering: true }); }')], ['order-lock-failure-retry']),
    ]
    summary = {'modelCalls': 0, 'cases': [], 'passed': False}
    try:
        for name, edits, expected in specs:
            print('START ' + name, flush=True)
            project = prepare(root / name, 'layered' if name == 'layered' else 'flat', dependencies=True)
            if name == 'framework-imports':
                for endpoint in ('quote', 'orders'):
                    route = project / f'app/api/{endpoint}/route.js'
                    route.write_text("import { NextResponse } from 'next/server';\n" + route.read_text()
                                     .replace('../../../src/checkout.js', '@/checkout')
                                     .replace('../../../src/catalog.js', '@/catalog')
                                     .replace('Response.json', 'NextResponse.json'))
            for before, after in edits:
                replace(project, 'src/controller.js', before, after)
            score = browser_grade(project, output / name)
            failures = [case['id'] for case in score['cases'] if case['status'] == 'failed']
            missing = [case['id'] for case in score['cases'] if case['status'] == 'not-run']
            passed = not missing and (set(expected) <= set(failures) if expected else not failures)
            summary['cases'].append({'name': name, 'expectedFailures': expected, 'failures': failures,
                                     'notRun': missing, 'passed': passed})
            save(output / 'summary.json', summary)
            shutil.copytree(project, output / name / 'source', ignore=shutil.ignore_patterns('node_modules', '.next', 'playwright-report', 'test-results'))
            print(json.dumps(summary['cases'][-1]), flush=True)
        summary['passed'] = all(case['passed'] for case in summary['cases'])
        save(output / 'summary.json', summary)
        print(str(output), flush=True)
        assert summary['passed'], 'Calibration failures need investigation before any model runs'
    finally:
        shutil.rmtree(root)


if __name__ == '__main__':
    main()
