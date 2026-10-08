"""Free regression checks: compile real fixtures; mock billed model/browser calls."""
import contextlib
import importlib.util
import io
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('fundamentals_runner', HERE / 'run.py')
runner = importlib.util.module_from_spec(spec)
spec.loader.exec_module(runner)


class FundamentalsRegression(unittest.TestCase):
    def test_trace_separates_discovery_inspection_and_adoption(self):
        def event(tool, text):
            return json.dumps({'type': 'item.completed', 'item': {'type': 'mcp_tool_call', 'tool': tool,
                'arguments': {}, 'result': {'content': [{'type': 'text', 'text': text}]}}})
        with tempfile.TemporaryDirectory() as temp:
            log = Path(temp) / 'events.jsonl'
            log.write_text('\n'.join([event('discover_knowledge_triggers', '{"entries":[{"id":"boundary"}]}'),
                event('inspect_code_knowledge', 'Interpretation evidence does not match cited lines'),
                event('inspect_code_knowledge', '{"candidates":[],"checklist":[]}')]))
            trace = runner.knowledge_trace(log)
            self.assertEqual(trace['calls'][0]['candidateIds'], ['boundary'])
            self.assertIn('evidence', trace['calls'][1]['response'])
            self.assertEqual(trace['calls'][2]['candidateIds'], [])
            self.assertTrue(trace['adoption'].startswith('unverified'))

    def test_product_guard_includes_added_code_but_allows_plan_records(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root / 'App.jsx').write_text('original')
            before = runner.product_files(root)
            (root / 'PLAN.md').write_text('plan')
            (root / '.frontend-system').mkdir()
            (root / '.frontend-system/review.json').write_text('{}')
            self.assertEqual(before, runner.product_files(root))
            (root / 'new-policy.mjs').write_text('export const policy = 1;')
            self.assertNotEqual(before, runner.product_files(root))

    def test_reference_variants_compile_and_missing_browser_is_not_a_pass(self):
        with tempfile.TemporaryDirectory() as temp:
            project = Path(temp)
            shutil.copy(HERE / 'fixture/money.mjs', project)
            for profile in ['independent', 'shared']:
                for stage in ['initial', 'change']:
                    (project / 'App.jsx').write_text(runner.reference(profile, stage))
                    report = runner.grade(project, profile, stage, project / f'{profile}-{stage}', {'PW_TEST_CONNECT_WS_ENDPOINT': ''})
                    self.assertEqual(report['status'], 'unverified')
                    self.assertFalse(report['eligible'])
                    self.assertEqual(len(report['results']), 14 if stage == 'initial' else 18)
            (project / 'App.jsx').write_text('export default function { broken')
            report = runner.grade(project, 'shared', 'initial', project / 'broken', {'PW_TEST_CONNECT_WS_ENDPOINT': ''})
            self.assertEqual(report['status'], 'graded', 'A product build failure is repairable, not an infrastructure pass')
            self.assertEqual(report['results'][0]['id'], 'build')
            self.assertFalse(report['eligible'])

    def test_driver_preserves_conversation_and_rejects_plan_edits(self):
        real_run = subprocess.run
        for edit_plan in [False, True]:
            calls = []

            def fake_invoke(project, output, model, prompt, configs=(), timeout=0, env=None, previous=None):
                output.mkdir(parents=True)
                (output / 'events.jsonl').write_text('')
                (output / 'final.md').write_text('A plan or implementation record')
                thread = previous['threadId'] if previous else str(runner.executor.uuid.uuid4())
                phase = output.parent.parent.name
                if edit_plan and phase == 'questions':
                    (project / 'App.jsx').write_text('Unauthorized plan edit')
                calls.append({'phase': phase, 'previous': previous, 'thread': thread, 'prompt': prompt})
                cumulative = (previous['cumulativeUsage']['input_tokens'] if previous else 0) + 100
                return {'threadId': thread, 'exitCode': 0, 'completedTurns': 1, 'timedOut': False, 'errors': [],
                        'usage': {'input_tokens': 100, 'output_tokens': 10, 'total_tokens': 110},
                        'cumulativeUsage': {'input_tokens': cumulative, 'output_tokens': cumulative // 10}}

            def fake_run(argv, **kwargs):
                if len(argv) > 1 and argv[1] == str(HERE.parent / 'maintenance/run.py'):
                    return subprocess.CompletedProcess(argv, 0, '', '')
                return real_run(argv, **kwargs)

            @contextlib.contextmanager
            def fake_browser(project, output):
                yield {}

            def fake_grade(project, profile, stage, output, browser_env):
                output.mkdir(parents=True)
                # One actual repair path in each journey, not only all-pass control flow.
                passed = stage != 'initial' or output.parent.name == '1'
                return {'eligible': passed, 'status': 'graded', 'results': [{'id': 'fixture-check', 'status': 'passed' if passed else 'failed'}]}

            with tempfile.TemporaryDirectory() as temp:
                output = Path(temp) / 'results'
                with patch.object(sys, 'argv', ['run.py', '--run', '--arms', 'knowledge', 'fs', '--profiles', 'independent', '--output', str(output)]), \
                     patch.object(runner.executor, 'invoke', side_effect=fake_invoke), \
                     patch.object(runner, 'browser_environment', side_effect=fake_browser), \
                     patch.object(runner, 'calibrate'), \
                     patch.object(runner, 'grade', side_effect=fake_grade), \
                     patch.object(runner.subprocess, 'run', side_effect=fake_run), \
                     contextlib.redirect_stdout(io.StringIO()):
                    runner.main()
                result = json.loads((output / 'summary.json').read_text())
                if edit_plan:
                    self.assertEqual(result['status'], 'completed')
                    self.assertEqual(len(calls), 2, 'Never implement after a plan-stage code edit; keep other arm independent')
                    self.assertTrue(all(not journey['behaviorEligible'] for journey in result['journeys']))
                    self.assertIn('Product edited', result['journeys'][0]['records'][0]['grade']['reason'])
                else:
                    self.assertEqual(result['status'], 'completed')
                    self.assertEqual(len(calls), 12)
                    first, second = result['journeys']
                    self.assertNotEqual(first['threadId'], second['threadId'])
                    for journey in [first, second]:
                        self.assertEqual(journey['usage']['total_tokens'], 660)
                        self.assertEqual({row['invocation']['threadId'] for row in journey['records']}, {journey['threadId']})
                        self.assertTrue(journey['behaviorEligible'])
                    self.assertIsNone(calls[0]['previous'])
                    self.assertIsNone(calls[6]['previous'])
                    self.assertNotIn('독립적으로 운영', calls[0]['prompt'])
                    self.assertIn('독립적으로 운영', calls[1]['prompt'])


if __name__ == '__main__':
    unittest.main()
