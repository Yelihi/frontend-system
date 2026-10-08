import importlib.util
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('telemetry', Path(__file__).with_name('telemetry.py'))
telemetry = importlib.util.module_from_spec(spec)
spec.loader.exec_module(telemetry)


class TelemetryTest(unittest.TestCase):
    def test_completed_runner_does_not_turn_timeout_into_a_pass_or_zero_usage(self):
        summary = {'status': 'completed', 'modelCalls': 1, 'journeys': [{
            'case': 'fixture', 'arm': 'fs', 'usage': None, 'planCompliance': None, 'eligible': False,
            'records': [{'phase': 'work', 'attempt': 0, 'invocation': {'exitCode': -9, 'timedOut': True, 'completedTurns': 0, 'elapsedSeconds': 600, 'usage': None}}],
            'trace': [
                {'tool': 'save_project_context', 'error': False, 'arguments': {'analysis': {'evidence': {'statements': [{'id': 'bound', 'reuse': {'dependencies': ['a.js']}}, {'id': 'excluded', 'reuseReason': 'No registered signal'}]}}}},
                {'tool': 'get_work_context', 'error': False, 'arguments': {}, 'response': {'projectFacts': {'facts': [{'reusedTriggers': 1}]}}},
                {'tool': 'save_revision', 'error': True, 'arguments': {'decisionUpdates': []}},
                {'tool': 'save_revision', 'error': False, 'arguments': {'decisionUpdates': [], 'evidenceRoutes': []}},
            ]}]}
        row = telemetry.summarize(summary)['rows'][0]
        self.assertFalse(row['completed'])
        self.assertIsNone(row['totalTokens'])
        self.assertIsNone(row['uncachedInputTokens'])
        self.assertIsNone(row['planSatisfied'])
        self.assertEqual((row['registeredReuse'], row['reusedTriggers'], row['explicitReuseExclusions']), (1, 1, 1))
        self.assertEqual((row['patchCalls'], row['patchSuccesses'], row['routePatchCalls'], row['mcpErrors']), (2, 1, 1, 1))

    def test_success_counts_uncached_input_without_double_counting_cached_tokens(self):
        summary = {'status': 'completed', 'modelCalls': 1, 'journeys': [{'case': 'fixture', 'arm': 'plain', 'eligible': True,
          'usage': {'input_tokens': 100, 'cached_input_tokens': 70, 'total_tokens': 110},
          'planCompliance': {'satisfied': 14, 'total': 14},
          'records': [{'phase': phase, 'attempt': 0, 'invocation': {'exitCode': 0, 'timedOut': False, 'completedTurns': 1, 'elapsedSeconds': 2}} for phase in ['prepare', 'work']]}]}
        row = telemetry.summarize(summary)['rows'][0]
        self.assertTrue(row['completed'])
        self.assertEqual((row['totalTokens'], row['uncachedInputTokens']), (110, 30))

    def test_preparation_only_is_not_a_completed_journey_and_repeated_saves_do_not_inflate_reuse(self):
        save = {'tool': 'save_project_context', 'error': False, 'arguments': {'analysis': {'evidence': {
            'statements': [{'id': 'one-fact', 'reuse': {'dependencies': ['a.js']}}]}}}}
        summary = {'status': 'blocked', 'modelCalls': 1, 'journeys': [{'case': 'fixture', 'arm': 'fs', 'eligible': False,
            'records': [{'phase': 'prepare', 'attempt': 0, 'invocation': {'exitCode': 0, 'timedOut': False, 'completedTurns': 1, 'elapsedSeconds': 2}}],
            'trace': [save, save]}]}
        row = telemetry.summarize(summary)['rows'][0]
        self.assertFalse(row['completed'])
        self.assertEqual(row['missingPhases'], ['work'])
        self.assertEqual(row['projectSaveCalls'], 2)
        self.assertEqual((row['savedStatements'], row['registeredReuse']), (1, 1))

    def test_artifact_symlinks_cannot_read_outside_result(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder) / 'result'; root.mkdir()
            outside = Path(folder) / 'outside'; outside.write_text('not an artifact')
            (root / 'artifact').symlink_to(outside)
            with self.assertRaises(ValueError):
                telemetry.local_read(root, Path('artifact'))
