import importlib.util
from pathlib import Path
import tempfile
import unittest

HERE=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('v8_replay',HERE/'replay.py')
replay=importlib.util.module_from_spec(spec);spec.loader.exec_module(replay)


class ReplayTest(unittest.TestCase):
    def test_same_code_and_public_history_without_old_execution_authority(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp);snapshot=root/'snapshot';snapshot.mkdir()
            (snapshot/'Button.jsx').write_text('prior code')
            (snapshot/'ANSWERS-variants.md').write_text('old choice')
            (snapshot/'.frontend-system').mkdir()
            (snapshot/'.frontend-system/execution.json').write_text('old authority')
            for arm in ['informed','fs']:
                project=root/arm;project.mkdir();(project/'.git').mkdir()
                replay.restore_input(project,snapshot)
                self.assertEqual((project/'Button.jsx').read_text(),'prior code')
                self.assertEqual((project/'ANSWERS-variants.md').read_text(),'old choice')
                self.assertFalse((project/'.frontend-system').exists())
                self.assertTrue((project/'.git').is_dir())
            self.assertTrue((snapshot/'.frontend-system/execution.json').exists())

    def test_no_symlink_or_failed_stage_input(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp);snapshot=root/'snapshot';snapshot.mkdir();project=root/'project';project.mkdir()
            (snapshot/'escape').symlink_to(root)
            with self.assertRaisesRegex(ValueError,'symlink'):replay.restore_input(project,snapshot)
            (snapshot/'escape').unlink();(snapshot/'REQUEST-defaults.md').write_text('post-failure')
            with self.assertRaisesRegex(ValueError,'before the failed request'):replay.restore_input(project,snapshot)


if __name__=='__main__':unittest.main()
