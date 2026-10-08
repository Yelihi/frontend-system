#!/usr/bin/env python3
"""Read runner evidence only; never execute model artifacts or alter grades."""
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path

PRODUCT_FILES = ('App.jsx', 'shared/http.mjs', 'domain/orders.mjs', 'data/orders.mjs',
                 'application/orders.mjs', 'ui/OrderList.jsx', 'ui/Checkout.jsx')


def summarize(summary):
    rows = []
    for journey in summary.get('journeys', []):
        trace = journey.get('trace', [])
        records = journey.get('records', [])
        usage = journey.get('usage')
        project_saves = [entry for entry in trace if entry['tool'] == 'save_project_context' and not entry.get('error')]
        # Count the last successfully stored analysis, not the sum of repeated saves.
        statements = project_saves[-1]['arguments'].get('analysis', {}).get('evidence', {}).get('statements', []) if project_saves else []
        contexts = [entry.get('response') or {} for entry in trace if entry['tool'] == 'get_work_context' and not entry.get('error')]
        patches = [entry for entry in trace if entry['tool'] == 'save_revision' and 'decisionUpdates' in entry['arguments']]
        timed_out = any(record['invocation'].get('timedOut') for record in records)
        missing_phases = sorted({'prepare', 'work'} - {record['phase'] for record in records})
        completed = not missing_phases and all(record['invocation'].get('completedTurns', 0) > 0 and
                                         not record['invocation'].get('timedOut') and record['invocation'].get('exitCode') == 0
                                         for record in records)
        plan = journey.get('planCompliance') or {}
        rows.append({
            'case': journey['case'], 'arm': journey['arm'], 'completed': completed,
            'missingPhases': missing_phases,
            'eligible': journey.get('eligible', False), 'timedOut': timed_out,
            'planSatisfied': plan.get('satisfied'), 'planTotal': plan.get('total'),
            'totalTokens': usage.get('total_tokens') if usage else None,
            'uncachedInputTokens': usage['input_tokens'] - usage['cached_input_tokens']
                if usage and usage.get('input_tokens') is not None and usage.get('cached_input_tokens') is not None else None,
            'seconds': round(sum(record['invocation']['elapsedSeconds'] for record in records), 3),
            'phaseUsage': [{'phase': record['phase'], 'attempt': record['attempt'],
                           'usage': record['invocation'].get('usage')} for record in records],
            'mcpCalls': len(trace), 'mcpErrors': sum(bool(entry.get('error')) for entry in trace),
            'mcpTools': dict(Counter(entry['tool'] for entry in trace)),
            'projectSaveCalls': len(project_saves), 'savedStatements': len(statements), 'registeredReuse': sum(bool(item.get('reuse')) for item in statements),
            'explicitReuseExclusions': sum(bool(item.get('reuseReason')) for item in statements),
            'reuseObservable': any('projectFacts' in context for context in contexts),
            'reusedTriggers': sum(item.get('reusedTriggers', 0) for context in contexts
                                  for item in context.get('projectFacts', {}).get('facts', [])),
            'patchCalls': len(patches), 'patchSuccesses': sum(not entry.get('error') for entry in patches),
            'routePatchCalls': sum('evidenceRoutes' in entry['arguments'] for entry in patches),
            'fullRevisionReads': sum(entry['tool'] == 'get_revision' and entry['arguments'].get('detail') == 'full' for entry in trace),
        })
    return {'runnerStatus': summary['status'], 'modelCalls': summary.get('modelCalls'), 'rows': rows,
            'limits': ['Missing usage/grades remain null, never zero or a pass.',
                       'Reuse counters record tool behavior, not semantic correctness or causal token savings.',
                       'Runner completed does not imply completed model turns. Fixed-order single pairs do not establish general superiority.']}


def local_read(root, path):
    target = (root / path).resolve()
    if not target.is_relative_to(root.resolve()):
        raise ValueError(f'Artifact escapes result folder: {path}')
    return target.read_bytes()


def analyze(root):
    raw = local_read(root, Path('summary.json'))
    summary = json.loads(raw)
    report = summarize(summary)
    report['summarySha256'] = hashlib.sha256(raw).hexdigest()
    report['productFiles'] = []
    by_case = {}
    for journey in summary.get('journeys', []):
        work = [record for record in journey['records'] if record['phase'] == 'work']
        if work:
            by_case.setdefault(journey['case'], {})[journey['arm']] = work[-1]['attempt']
    for case, attempts in by_case.items():
        if 'plain' not in attempts or 'fs' not in attempts:
            continue
        for path in PRODUCT_FILES:
            entry = {'case': case, 'path': path}
            try:
                data = {arm: local_read(root, Path(f'{case}-{arm}/work/{attempt}/snapshot/{path}')) for arm, attempt in attempts.items()}
                entry.update(equal=data['plain'] == data['fs'], hashes={arm: hashlib.sha256(value).hexdigest() for arm, value in data.items()})
            except (OSError, ValueError) as error:
                entry.update(equal=None, reason=str(error))
            report['productFiles'].append(entry)
    # Comparing bytes is supplemental; never assign missing external grades here.
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('result', type=Path)
    args = parser.parse_args()
    report = analyze(args.result)
    for name in ('telemetry.json', 'telemetry.md'):
        if (args.result / name).is_symlink():
            raise ValueError(f'Refusing symlink output: {name}')
    (args.result / 'telemetry.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    def cell(value):
        return 'unverified / missing' if value is None else str(value)
    lines = ['# Run telemetry', '', '| Arm | Finished | External grade | Tokens | Uncached input | Seconds | MCP errors | Reused triggers | Successful patches |',
             '| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |']
    for row in report['rows']:
        grade = f"{row['planSatisfied']}/{row['planTotal']}" if row['planTotal'] is not None else None
        lines.append(f"| {row['arm']} | {row['completed']} | {cell(grade)} | {cell(row['totalTokens'])} | {cell(row['uncachedInputTokens'])} | {row['seconds']} | {row['mcpErrors']} | {row['reusedTriggers']} | {row['patchSuccesses']}/{row['patchCalls']} |")
    lines += ['', *report['limits'], '', 'Product hashes are supplemental and do not replace missing external grades.']
    (args.result / 'telemetry.md').write_text('\n'.join(lines) + '\n')
    print(json.dumps({'result': str(args.result), 'rows': report['rows']}, ensure_ascii=False))


if __name__ == '__main__':
    main()
