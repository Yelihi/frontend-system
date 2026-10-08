#!/usr/bin/env python3
"""Preserve failed postprocessing; grade HTTP errors and resume frozen model calls."""
import hashlib
import importlib.util
import json
from pathlib import Path
import shutil
import sys
import tempfile
from datetime import datetime, timezone
import run

HERE = Path(__file__).resolve().parent
RUN = Path(json.loads((HERE / 'frozen.json').read_text())['output'])
spec = importlib.util.spec_from_file_location('accessible_regrade', HERE / 'regrade-accessible.py')
regrade = importlib.util.module_from_spec(spec)
spec.loader.exec_module(regrade)


def original_grade(project, output):
    return regrade.grade(project, output, grader=HERE / 'grade.mjs')


def main():
    calibration = RUN / 'http-readiness-calibration'
    calibration.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='http-readiness-', dir=HERE.parent / '.work') as temporary:
        results = []
        for name in ('flat', 'http-500'):
            output = calibration / name
            if not (output / 'score.json').exists():
                project = run.prepare(Path(temporary) / name, 'flat', dependencies=True)
                if name == 'http-500':
                    (project / 'app/checkout.jsx').write_text('')
                print('READINESS CALIBRATION ' + name, flush=True)
                original_grade(project, output)
            score = json.loads((output / 'score.json').read_text())
            failures = [c for c in score['cases'] if c['status'] != 'passed']
            assert len(score['cases']) == 110
            assert not failures if name == 'flat' else len(failures) == 8 and all(c['category'] == 'browser' and c['status'] == 'failed' for c in failures)
            results.append({'name': name, 'passed': True, 'automatedPassed': 110-len(failures),
                            'failures': [c['id'] for c in failures]})
        run.save(calibration / 'summary.json', {'passed': True, 'modelCalls': 0, 'cases': results,
            'correction': 'A completed HTTP error response means server is reachable, not that product passed. Run unchanged browser assertions against it.',
            'graderSha256': hashlib.sha256((HERE / 'grade.mjs').read_bytes()).hexdigest()})
    run.browser_calibrate.browser_grade = original_grade
    target = RUN / '26'
    if not (target / 'complete.json').exists():
        result = json.loads((target / 'model/result.json').read_text())
        assert result['timedOut'] and result['completedTurns'] == 0
        argv = json.loads((target / 'model/invocation.json').read_text())['argv']
        project = Path(argv[argv.index('-C') + 1])
        final = json.loads((target / 'final-files.json').read_text())
        assert run.inventory(project, run.EXCLUDED) == final
        assert run.inventory(target / 'source', run.EXCLUDED) == final
        previous = target / 'checks-before-http-readiness-recovery'
        if not previous.exists():
            (target / 'checks').rename(previous)
        assert not (target / 'checks').exists(), 'Preserve any incomplete recovery before another retry'
        print('RECOVER EXTERNAL CHECKS 26; NO MODEL CALL', flush=True)
        score = run.evaluate(project, target / 'checks')
        initial = json.loads((target / 'initial-files.json').read_text())
        result.update(changedSharedInputs=[n for n,h in initial.items()
            if (n in ('TASK.md','common-rules.md','frontend-quality.md') or n.startswith('mandatory-rules/')) and final.get(n) != h],
            automatedPassed=sum(c['status']=='passed' for c in score['cases']),
            qualityScore=None, reviewStatus='independent-review-required')
        run.save(target / 'post-model-recovery.json', {'at': datetime.now(timezone.utc).isoformat(),
            'modelRerun': False, 'usageUnchanged': True, 'sourceMatchesRecordedFinalHashes': True,
            'observed': 'Incomplete checkout module produced HTTP500. Original readiness helper required HTTP200 and stopped before scoring.',
            'action': 'Retained original postprocessing logs, recalibrated HTTP readiness, repeated only external checks on unchanged source with original110 assertions.',
            'calibration': '../http-readiness-calibration/summary.json'})
        run.save(target / 'complete.json', result)
        assert project.parent.name.startswith('fs-v2-run-')
        shutil.rmtree(project.parent)
        print('RECOVERED 26 ' + json.dumps(result), flush=True)
    sys.argv = [str(HERE / 'run.py'), '--resume', str(RUN)]
    run.main()


if __name__ == '__main__':
    main()
