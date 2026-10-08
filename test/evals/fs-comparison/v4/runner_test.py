"""Trusted authored fixtures only. No model calls; no isolation success is inferred."""
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
spec = importlib.util.spec_from_file_location('network_runner', HERE / 'run.py')
runner = importlib.util.module_from_spec(spec)
spec.loader.exec_module(runner)


class NetworkPilotRegression(unittest.TestCase):
    def setUp(self):
        # Models are mocked in these tests; no installed Codex or account is required.
        self.cli = patch.object(runner.executor, 'codex_binary', return_value=shutil.which('node'))
        self.cli.start()
        self.addCleanup(self.cli.stop)

    def test_real_mcp_evidence_protocol(self):
        for source in ['export const request = () => fetch("/probe");\n', 'export const label = "probe";\n']:
            with self.subTest(source=source):
                self.check_mcp_evidence_protocol(source)

    def check_mcp_evidence_protocol(self, source):
        # Functional MCP check; sandbox permission isolation is tested separately.
        with tempfile.TemporaryDirectory() as temp:
            project = Path(temp).resolve()
            (project / 'probe.mjs').write_text(source)
            for command in [['git', 'init', '-b', 'main'], ['git', 'add', '.'], ['git', '-c', 'user.name=FS Eval', '-c', 'user.email=eval@localhost', 'commit', '-qm', 'Probe']]:
                subprocess.run(command, cwd=project, check=True, capture_output=True)
            config = ['mcp_servers.frontend-system.command=' + json.dumps('node'),
                      'mcp_servers.frontend-system.args=' + json.dumps([str(runner.base.REPO / 'bundle/mcp.js')])]
            result = subprocess.run(['node', str(runner.executor.HERE / 'preflight.mjs'), str(project)],
                                    input=json.dumps(config), text=True, capture_output=True, timeout=45)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertIn('approval and completion gates passed', result.stdout)

    def test_authored_oracle_examples_and_counterexamples(self):
        scenario = json.loads((HERE / 'scenarios.json').read_text())
        # This replacement is only for our fixed reference strings, never model artifacts.
        def trusted(project, argv, source, timeout=0):
            return subprocess.run(argv, input=source, cwd=project, text=True, capture_output=True, timeout=timeout)
        with tempfile.TemporaryDirectory() as temp:
            project = Path(temp) / 'project'
            runner.prepare(project, scenario['cases'][0], scenario)
            with patch.object(runner.executor, 'restricted', side_effect=trusted):
                runner.calibration(project, scenario['cases'], Path(temp) / 'calibration')
            report = json.loads((Path(temp) / 'calibration/summary.json').read_text())
            self.assertEqual(sum(row['eligible'] for row in report['rows']), 3)
            self.assertEqual(len(report['rows']), 15)

    def test_compliance_rejects_behaviorally_valid_design_changes(self):
        scenario = json.loads((HERE / 'scenarios.json').read_text())
        def trusted(project, argv, source, timeout=0):
            return subprocess.run(argv, input=source, cwd=project, text=True, capture_output=True, timeout=timeout)
        with tempfile.TemporaryDirectory() as temp:
            project = Path(temp) / 'project'
            runner.prepare(project, scenario['cases'][0], scenario)
            with patch.object(runner.executor, 'restricted', side_effect=trusted):
                runner.compliance_calibration(project, scenario['cases'], Path(temp) / 'calibration')
            report = json.loads((Path(temp) / 'calibration/summary.json').read_text())
            self.assertEqual(sum(row['eligible'] for row in report['rows']), 6)
            self.assertEqual(len(report['rows']), 24)
            for row in report['rows']:
                if row['case'] != 'existing-good':
                    self.assertTrue(row['behaviorEligible'], row)
            self.assertTrue(all(row['planCompliance']['forbiddenViolations'] for row in report['rows'] if row['variant'] in {'new-product-file', 'new-module-edge', 'extra-export', 'protected-file-edit'}))

    def test_compliance_requires_question_and_preserves_authorized_answers(self):
        # Exercise both branches of the full two-turn protocol without invoking a model.
        real_run = subprocess.run
        def fake_run(argv, **kwargs):
            if len(argv) > 1 and argv[1] == str(runner.executor.HERE / 'run.py'):
                return subprocess.CompletedProcess(argv, 0, '', '')
            return real_run(argv, **kwargs)
        for ask in [False, True]:
            with self.subTest(ask=ask), tempfile.TemporaryDirectory() as temp:
                calls = []
                def fake_invoke(project, output, model, prompt, configs=(), timeout=0, env=None, previous=None):
                    output.mkdir(parents=True)
                    (output / 'events.jsonl').write_text('')
                    questions = [{'topic':'auth-callback-failure','question':'콜백이 throw하면 원래 오류를 전달할까요?'}] if ask else []
                    (output / 'final.md').write_text(json.dumps({'questions':questions}))
                    if previous:
                        decision = json.loads((project / 'USER_DECISIONS.md').read_text())
                        self.assertEqual(set(decision), {'auth-callback-failure'})
                        self.assertEqual(decision, json.loads((original / 'compliance.json').read_text())['answers'])
                    else:
                        self.assertFalse((project / 'USER_DECISIONS.md').exists())
                    thread = previous['threadId'] if previous else str(len(calls))
                    calls.append(thread)
                    return {'threadId':thread, 'exitCode':0, 'completedTurns':1, 'timedOut':False, 'errors':[],
                            'usage':{'input_tokens':100,'output_tokens':10,'total_tokens':110,'cached_input_tokens':50}}
                original = runner.HERE
                runner.HERE = Path(temp) / 'v4'
                runner.HERE.mkdir()
                for name in ['scenarios.json','evaluate.mjs','compliance.json','compliance-checks.mjs']:
                    (runner.HERE / name).write_bytes((original / name).read_bytes())
                (runner.HERE.parent / 'v2').symlink_to(original.parent / 'v2', target_is_directory=True)
                try:
                    with patch.object(sys, 'argv', ['run.py','--run','--track','compliance','--case','duplicated']), \
                         patch.object(runner.subprocess,'run',side_effect=fake_run), patch.object(runner.executor,'invoke',side_effect=fake_invoke), \
                         patch.object(runner,'calibration'), patch.object(runner,'compliance_calibration'), \
                         patch.object(runner,'grade',return_value={'eligible':True,'status':'graded','results':[]}), contextlib.redirect_stdout(io.StringIO()):
                        runner.main()
                    summary=json.loads(next((runner.HERE / 'results').glob('*/summary.json')).read_text())
                    self.assertEqual(summary['modelCalls'], 4 if ask else 2)
                    for journey in summary['journeys']:
                        self.assertEqual(journey['questionProtocol'], 'observed' if ask else 'unverified')
                        if not ask:
                            self.assertEqual(journey['records'][-1]['grade']['status'],'protocol-failed')
                            self.assertFalse(journey['eligible'])
                finally:
                    runner.HERE = original

    def test_comparison_preserves_first_failure_and_missing_usage(self):
        first = {'satisfied': 10, 'total': 11, 'forbiddenViolations': ['N2-approved-module-boundaries']}
        final = {'satisfied': 11, 'total': 11, 'forbiddenViolations': []}
        journey = {'case':'duplicated','arm':'plain','eligible':True,'usage':None,'planCompliance':final,
                   'records':[{'phase':'work','grade':{'eligible':False,'planCompliance':first},'invocation':{'elapsedSeconds':20}},
                              {'phase':'work','grade':{'eligible':True,'planCompliance':final},'invocation':{'elapsedSeconds':10}}]}
        row = runner.comparison_rows([journey])[0]
        self.assertFalse(row['firstImplementationPassed'])
        self.assertEqual(row['firstPlanCompliance'], first)
        self.assertEqual(row['repairCalls'], 1)
        self.assertEqual(row['modelElapsedSeconds'], 30)
        self.assertIsNone(row['totalTokens'])

    def test_only_requested_answers_are_supplied(self):
        questions, answers = runner.selected_answers('{"questions":[{"topic":"ownership","question":"같이 변경하나요?"}]}', {'ownership': 'shared', 'retry': 'forbidden'})
        self.assertEqual(answers, {'ownership': 'shared'})
        self.assertEqual(len(questions), 1)
        with self.assertRaises(ValueError):
            runner.selected_answers('{"questions":[{"topic":"retry","question":""}]}', {'retry': 'no'})
        with self.assertRaises(ValueError):
            runner.selected_answers('[]', {'retry': 'no'})

    def test_fs_workflow_omission_is_not_a_successful_fs_result(self):
        real_run = subprocess.run
        calls = []
        def fake_run(argv, **kwargs):
            if len(argv) > 1 and argv[1] == str(runner.executor.HERE / 'run.py'):
                return subprocess.CompletedProcess(argv, 0, '', '')
            return real_run(argv, **kwargs)
        def fake_invoke(project, output, model, prompt, configs=(), timeout=0, env=None, previous=None):
            output.mkdir(parents=True)
            (output / 'events.jsonl').write_text('')
            (output / 'final.md').write_text('Done')
            thread = previous['threadId'] if previous else str(len(calls))
            calls.append(thread)
            return {'threadId': thread, 'exitCode': 0, 'completedTurns': 1, 'timedOut': False, 'errors': [],
                    'usage': {'input_tokens': 100, 'output_tokens': 10, 'total_tokens': 110, 'cached_input_tokens': 50}}
        with tempfile.TemporaryDirectory() as temp:
            original = runner.HERE
            runner.HERE = Path(temp) / 'v4'
            runner.HERE.mkdir()
            for name in ['scenarios.json', 'evaluate.mjs']:
                (runner.HERE / name).write_bytes((original / name).read_bytes())
            # Preserve support hashes without mutating or executing a model environment.
            (runner.HERE.parent / 'v2').symlink_to(original.parent / 'v2', target_is_directory=True)
            try:
                with patch.object(sys, 'argv', ['run.py', '--run']), patch.object(runner.subprocess, 'run', side_effect=fake_run), \
                     patch.object(runner.executor, 'invoke', side_effect=fake_invoke), patch.object(runner, 'calibration'), \
                     patch.object(runner, 'grade', return_value={'eligible': True, 'status': 'graded', 'results': []}), contextlib.redirect_stdout(io.StringIO()):
                    runner.main()
                summary = json.loads(next((runner.HERE / 'results').glob('*/summary.json')).read_text())
                self.assertEqual(summary['modelCalls'], 12)
                for journey in summary['journeys']:
                    self.assertEqual(journey['eligible'], journey['arm'] == 'plain')
                    self.assertEqual(journey['usage']['total_tokens'], 220)
                self.assertTrue(all(calls[i] == calls[i+1] for i in range(0, 12, 2)))
                self.assertEqual(len(set(calls)), 6)
            finally:
                runner.HERE = original


if __name__ == '__main__': unittest.main()
