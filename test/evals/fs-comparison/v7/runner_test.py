"""Host execution is ONLY for authored fixtures. Model artifacts use restricted()."""
import importlib.util
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest
from unittest.mock import patch

HERE=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('style_suite',HERE/'run.py')
suite=importlib.util.module_from_spec(spec);spec.loader.exec_module(suite)

class StyleSuiteTest(unittest.TestCase):
    def test_authored_calibration_preserves_behavior_and_distinguishes_style(self):
        scenario=json.loads((HERE/'scenarios.json').read_text())
        def authored(project,argv,source,timeout=0):
            return subprocess.run(argv,input=source,cwd=project,text=True,capture_output=True,timeout=timeout)
        with tempfile.TemporaryDirectory() as temp,patch.object(suite.executor,'codex_binary',return_value=shutil.which('node')):
            project=Path(temp).resolve()/'project'
            suite.prepare(project,scenario['cases'][0],scenario)
            baseline=suite.base.product_files(project)
            starter_lint=subprocess.run(['npm','run','lint:styles'],cwd=project,capture_output=True,text=True)
            self.assertNotEqual(starter_lint.returncode,0,starter_lint.stdout)
            self.assertIn('inline-static-classes',starter_lint.stdout)
            self.assertIn('cva-variants',starter_lint.stdout)
            with patch.object(suite.executor,'restricted',side_effect=authored):
                starter=suite.grade(project,scenario['cases'][0],Path(temp)/'starter',True,baseline)
                self.assertEqual(starter['status'],'graded',starter)
                self.assertTrue(all(r['status']=='passed' for r in starter['results'] if r['id'].startswith('F')),starter)
                self.assertFalse(starter['eligible'])
                suite.calibration(project,scenario['cases'],Path(temp)/'calibration')
            for command in [['npm','run','lint:styles'],['npm','run','build']]:
                result=subprocess.run(command,cwd=project,capture_output=True,text=True)
                self.assertEqual(result.returncode,0,result.stdout+result.stderr)
            report=json.loads((Path(temp)/'calibration/summary.json').read_text())
            self.assertEqual(report['matched'],len(report['rows']))
            self.assertGreaterEqual(sum(row['eligible'] for row in report['rows']),4)
            target=HERE/'validation/authored-calibration.json';target.parent.mkdir(exist_ok=True)
            target.write_text(json.dumps({'mode':'authored-only','modelCalls':0,'matched':report['matched'],'rows':[{'variant':r['variant'],'matched':r['matched'],'functionalEquivalence':r['functionalEquivalence']} for r in report['rows']]},indent=2)+'\n')

    def test_scope_and_contract(self):
        self.assertEqual(json.loads((HERE/'scenarios.json').read_text())['implementationPlan'],(HERE/'PLAN.md').read_text())
        self.assertGreaterEqual(len(suite.SPEC['editable']),32)
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp);(root/'domain').mkdir();(root/'domain/order.mjs').write_text('protected')
            baseline=suite.base.product_files(root);(root/'domain/order.mjs').write_text('edited')
            self.assertEqual(suite.scope_result(root,baseline)['status'],'failed')
            (root/'domain/order.mjs').write_text('protected');(root/'new.test.mjs').write_text('test')
            self.assertEqual(suite.scope_result(root,baseline)['status'],'passed')

if __name__=='__main__':unittest.main()
