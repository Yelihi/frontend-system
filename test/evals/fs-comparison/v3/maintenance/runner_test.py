"""Local regression checks; all model/sandbox calls are mocked, never billed."""
import contextlib
import io
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

import run


class RunnerRegression(unittest.TestCase):
    def test_permissions_keep_literal_absolute_keys_and_binary_only_access(self):
        project = Path('/tmp/fixture with spaces/project')
        with patch.object(run.shutil, 'which', return_value='/usr/bin/true'):
            baseline = run.permissions(project, 'baseline')
            fs = run.permissions(project)
        for configs in [baseline, fs]:
            maps = [value for value in configs if value.startswith('permissions.eval.filesystem=')]
            self.assertEqual(len(maps), 1)
            self.assertFalse(any(value.startswith('permissions.eval.filesystem.') for value in configs))
            self.assertIn(json.dumps(str(Path('/usr/bin/true').resolve())) + '="read"', maps[0])
            self.assertIn(json.dumps(str(run.REPO)) + '="deny"', maps[0])
            environment = next(value for value in configs if value.startswith('shell_environment_policy.set='))
            for key, value in run.GIT_ENV.items():
                self.assertIn(key + '=' + json.dumps(value), environment)
        self.assertIn('"/tmp/fixture with spaces/runtime/skills"="deny"', baseline[1])
        self.assertNotIn('"/tmp/fixture with spaces/runtime/skills"="deny"', fs[1])
        with patch.object(run.shutil, 'which', return_value='/usr/bin/true'):
            config = run.fs_config(project)
            self.assertIn('mcp_servers.frontend-system.command=' + json.dumps(str(Path('/usr/bin/true').resolve())), config)
            environment = next(value for value in config if value.startswith('mcp_servers.frontend-system.env='))
            for key, value in run.GIT_ENV.items():
                self.assertIn(key + '=' + json.dumps(value), environment)

    def test_symlink_launch_uses_canonical_binary_and_git_has_no_personal_defaults(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            binary = root / 'release/bin/codex'
            binary.parent.mkdir(parents=True)
            binary.write_text('fixture binary')
            shim = root / 'codex'
            shim.symlink_to(binary)
            with patch.object(run.shutil, 'which', return_value=str(shim)), \
                 patch.object(run.subprocess, 'run', return_value=subprocess.CompletedProcess([], 0, '', '')) as child:
                run.restricted(root / 'project', ['node', '--version'], '')
                self.assertEqual(child.call_args.args[0][0], str(binary.resolve()))
                self.assertEqual(run.runtime_env()['PATH'].split(run.os.pathsep)[0], str(binary.resolve().parent))
                self.assertIn('mcp_servers.frontend-system.command=' + json.dumps(str(binary.resolve())), run.fs_config(root / 'project'))
            for key in ['core.excludesfile', 'core.attributesfile']:
                output = subprocess.check_output(['git', 'config', '--get', key], cwd=root,
                                                 env={**run.os.environ, **run.GIT_ENV}, text=True)
                self.assertEqual(output.strip(), '/dev/null')

    def test_permission_errors_differ_from_product_test_failures(self):
        result = {'exitCode': 0, 'completedTurns': 1, 'timedOut': False}
        with tempfile.TemporaryDirectory() as temp:
            output = Path(temp)
            log = output / 'events.jsonl'
            log.write_text(json.dumps({'item': {'type': 'command_execution', 'exit_code': 1, 'aggregated_output': 'AssertionError: wrong total'}}))
            self.assertIsNone(run.environment_failure(result, output))
            log.write_text(json.dumps({'item': {'type': 'mcp_tool_call', 'status': 'failed', 'result': {'content': 'fatal: gitconfig: Operation not permitted'}}}))
            self.assertIn('permission failure', run.environment_failure(result, output))

    def test_baseline_startup_failure_stops_before_fs_and_keeps_failure_record(self):
        real_run = subprocess.run
        calls = []

        def fake_invoke(project, output, model, prompt, configs=(), timeout=0, env=None, previous=None):
            self.assertEqual(env, run.runtime_env())
            calls.append(str(output))
            output.mkdir(parents=True)
            (output / 'events.jsonl').write_text('')
            if len(calls) == 1:
                fake_invoke.token = prompt.split('turn: ')[1].split('.')[0]
            (output / 'final.md').write_text('OK' if len(calls) == 1 else fake_invoke.token)
            return {'exitCode': 0 if len(calls) <= 2 else 1, 'completedTurns': 1 if len(calls) <= 2 else 0,
                    'timedOut': False, 'usage': {}, 'errors': []}

        def fake_run(argv, **kwargs):
            if len(argv) > 1 and argv[1] == str(run.HERE / 'preflight.mjs'):
                return subprocess.CompletedProcess(argv, 0, 'MCP simulated', '')
            return real_run(argv, **kwargs)

        with tempfile.TemporaryDirectory() as temp:
            output = Path(temp) / 'results'
            with patch.object(sys, 'argv', ['run.py', '--output', str(output)]), \
                 patch.object(run, 'restricted', return_value=subprocess.CompletedProcess([], 0, 'isolated\n', '')), \
                 patch.object(run, 'invoke', side_effect=fake_invoke), \
                 patch.object(run.shutil, 'which', return_value='/usr/bin/true'), \
                 patch.object(run.subprocess, 'run', side_effect=fake_run), \
                 contextlib.redirect_stdout(io.StringIO()):
                with self.assertRaises(SystemExit) as stopped:
                    run.main()
                self.assertEqual(stopped.exception.code, 1)
            self.assertEqual(len(calls), 3, 'Only fresh/resume connectivity and failed baseline; no FS model call')
            report = json.loads((output / 'summary.json').read_text())
            self.assertEqual(report['status'], 'blocked-during-comparison')
            self.assertEqual(report['incompleteCell']['arm'], 'baseline')
            self.assertTrue((output / report['incompleteCell']['record']).exists())
            self.assertFalse((output / 'gpt-6-sol-0-fs').exists())

    def test_real_subprocess_session_resume_usage_delta_and_failure_handling(self):
        # Exercise CLI arguments, stdout parsing and timeout cleanup with a local fake executable.
        real_popen = subprocess.Popen
        source = '''
import json, sys
from pathlib import Path
args = sys.argv[1:]
prompt = sys.stdin.read()
thread = args[args.index('resume') + 1] if 'resume' in args else '11111111-1111-4111-8111-111111111111'
assert '--ephemeral' not in args and '--last' not in args
assert args[-1] == '-'
if prompt == 'mismatch': thread = '22222222-2222-4222-8222-222222222222'
if prompt != 'missing': print(json.dumps({'type': 'thread.started', 'thread_id': thread}), flush=True)
if prompt == 'timeout':
    import time
    time.sleep(10)
count = 2 if 'resume' in args else 1
if prompt == 'reset': count = 0
print(json.dumps({'type': 'turn.completed', 'usage': {'input_tokens': 100 * count, 'cached_input_tokens': 60 * count, 'output_tokens': 10 * count, 'reasoning_output_tokens': 2 * count}}))
Path(args[args.index('-o') + 1]).write_text('OK')
'''

        def fake_popen(command, **kwargs):
            return real_popen([sys.executable, '-c', source, *command], **kwargs)

        with tempfile.TemporaryDirectory() as temp, \
             patch.object(run.subprocess, 'Popen', side_effect=fake_popen), \
             patch.object(run.shutil, 'which', return_value='/usr/bin/true'):
            project = Path(temp)
            first = run.invoke(project, project / 'first', 'gpt-6-sol', 'initial')
            second = run.invoke(project, project / 'second', 'gpt-6-sol', 'change', previous=first)
            self.assertEqual(first['threadId'], second['threadId'])
            self.assertEqual(second['usage']['total_tokens'], 110, 'Subtract previous thread total')
            self.assertEqual(second['cumulativeUsage']['input_tokens'], 200)
            self.assertEqual(second['usage']['uncached_input_tokens'], 40)
            self.assertIsNone(second['sessionError'])
            self.assertIsNone(second['usageError'])
            argv = json.loads((project / 'second/invocation.json').read_text())['argv']
            self.assertEqual(argv[-3:], ['resume', first['threadId'], '-'])
            for prompt in ['mismatch', 'missing', 'reset', 'timeout']:
                result = run.invoke(project, project / prompt, 'gpt-6-sol', prompt, previous=first, timeout=0.5)
                self.assertIsNone(result['usage'], prompt)
                if prompt == 'timeout':
                    self.assertTrue(result['timedOut'])
                    self.assertEqual(result['completedTurns'], 0)
                    self.assertTrue((project / prompt / 'events.jsonl').read_text())
                else:
                    self.assertTrue(run.environment_failure(result, project / prompt), prompt)

    def test_each_journey_keeps_one_thread_including_repairs_and_only_sends_new_requests(self):
        real_run = subprocess.run
        calls = []
        tokens = {}

        def fake_invoke(project, output, model, prompt, configs=(), timeout=0, env=None, previous=None):
            output.mkdir(parents=True)
            (output / 'events.jsonl').write_text('')
            thread = previous['threadId'] if previous else str(run.uuid.uuid4())
            if 'Remember this token' in prompt:
                tokens[thread] = prompt.split('turn: ')[1].split('.')[0]
            (output / 'final.md').write_text(tokens[thread] if previous and thread in tokens else 'OK')
            calls.append((str(output), previous, prompt, thread))
            total = (previous['cumulativeUsage']['input_tokens'] if previous else 0) + 100
            return {'threadId': thread, 'exitCode': 0, 'completedTurns': 1, 'timedOut': False, 'errors': [],
                    'usage': {'input_tokens': 100, 'output_tokens': 10, 'total_tokens': 110},
                    'cumulativeUsage': {'input_tokens': total, 'output_tokens': total // 10}}

        def fake_run(argv, **kwargs):
            if len(argv) > 1 and argv[1] == str(run.HERE / 'preflight.mjs'):
                return subprocess.CompletedProcess(argv, 0, '', '')
            return real_run(argv, **kwargs)

        def fake_grade(project, stage, output):
            fail = stage == 'policy-change' and output.name == '0'
            return {'eligible': not fail, 'results': [{'id': 'fixture-failure', 'status': 'failed' if fail else 'passed'}]}

        with tempfile.TemporaryDirectory() as temp:
            output = Path(temp) / 'results'
            with patch.object(sys, 'argv', ['run.py', '--output', str(output)]), \
                 patch.object(run, 'restricted', return_value=subprocess.CompletedProcess([], 0, 'isolated\n', '')), \
                 patch.object(run, 'invoke', side_effect=fake_invoke), \
                 patch.object(run, 'grade', side_effect=fake_grade), \
                 patch.object(run.shutil, 'which', return_value='/usr/bin/true'), \
                 patch.object(run.subprocess, 'run', side_effect=fake_run), \
                 contextlib.redirect_stdout(io.StringIO()):
                run.main()
            report = json.loads((output / 'summary.json').read_text())
            self.assertEqual(report['status'], 'completed')
            journeys = report['journeys']
            self.assertNotEqual(journeys[0]['threadId'], journeys[1]['threadId'])
            self.assertEqual(len(calls), 10, 'Two probes and four invocations per arm')
            for journey in journeys:
                selected = [call for call in calls if f"-0-{journey['arm']}/" in call[0]]
                self.assertIsNone(selected[0][1])
                self.assertEqual({call[3] for call in selected}, {journey['threadId']})
                self.assertEqual(journey['usage']['total_tokens'], 440)
                self.assertEqual(journey['repairRounds'], 1)
                self.assertTrue(journey['eligible'])
                self.assertTrue(all(call[1]['threadId'] == journey['threadId'] for call in selected[1:]))
                self.assertNotIn('Shared knowledge:', selected[1][2])
                self.assertTrue(selected[2][2].startswith('External contract checks failed: fixture-failure'))


if __name__ == '__main__':
    unittest.main()
