"""Only authored fixtures run on the host; model artifacts always use restricted()."""
import importlib.util
import contextlib
import io
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

HERE=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('layered_suite',HERE / 'run.py')
suite=importlib.util.module_from_spec(spec)
spec.loader.exec_module(suite)


class LayeredSuiteTest(unittest.TestCase):
    def test_suite_uses_shared_two_turn_protocol_and_timeout(self):
        real_run=subprocess.run
        def preflight(argv,**kwargs):
            if len(argv)>1 and argv[1]==str(suite.executor.HERE/'run.py'):
                return subprocess.CompletedProcess(argv,0,'','')
            return real_run(argv,**kwargs)
        calls=[]
        def invoke(project,output,model,prompt,configs=(),timeout=0,env=None,previous=None):
            self.assertEqual(timeout,600)
            self.assertTrue((project/'application/orders.mjs').exists())
            self.assertNotIn('Both arms',str(configs))
            output.mkdir(parents=True)
            (output/'events.jsonl').write_text('')
            (output/'final.md').write_text(json.dumps({'questions':[{'topic':topic,'question':'확인할까요?'} for topic in ['auth-callback-failure','refresh-failure-items']]}))
            if previous:
                self.assertEqual(set(json.loads((project/'USER_DECISIONS.md').read_text())),{'auth-callback-failure','refresh-failure-items'})
            thread=previous['threadId'] if previous else str(len(calls))
            calls.append(thread)
            return {'threadId':thread,'exitCode':0,'completedTurns':1,'timedOut':False,'errors':[],
                'usage':{'input_tokens':100,'output_tokens':10,'total_tokens':110,'cached_input_tokens':50}}
        with tempfile.TemporaryDirectory() as temp:
            original=suite.HERE
            suite.HERE=Path(temp)/'v5'
            shutil.copytree(original,suite.HERE,ignore=shutil.ignore_patterns('results','validation','__pycache__'))
            try:
                with patch.object(sys,'argv',['run.py','--run','--track','compliance','--case','layered-orders','--timeout','600']), \
                     patch.object(suite.executor,'codex_binary',return_value=shutil.which('node')), \
                     patch.object(suite.protocol.subprocess,'run',side_effect=preflight), \
                     patch.object(suite.executor,'invoke',side_effect=invoke), \
                     patch.object(suite,'calibration'), \
                     patch.object(suite,'grade',return_value={'status':'graded','eligible':True,'results':[]}), \
                     contextlib.redirect_stdout(io.StringIO()):
                    suite.protocol.main(suite=suite)
                report=json.loads(next((suite.HERE/'results').glob('*/summary.json')).read_text())
                calibration_summary=next((suite.HERE/'results').glob('*/compliance-calibration/summary.json'))
                self.assertEqual(json.loads(calibration_summary.read_text()),{'includedIn':'../calibration/summary.json','modelCalls':0})
                self.assertEqual(report['modelCalls'],4)
                self.assertEqual(calls,['0','0','2','2'])
                self.assertEqual(report['journeys'][0]['questionProtocol'],'observed')
                self.assertFalse(report['journeys'][1]['eligible'],'Missing FS evidence cannot pass even with a passing product grade')
            finally:
                suite.HERE=original

    def test_calibration_and_starter_are_discriminated(self):
        scenario=json.loads((HERE / 'scenarios.json').read_text())
        def authored(project,argv,source,timeout=0):
            return subprocess.run(argv,input=source,cwd=project,text=True,capture_output=True,timeout=timeout)
        with tempfile.TemporaryDirectory() as temp, patch.object(suite.executor,'codex_binary',return_value=shutil.which('node')):
            project=Path(temp).resolve() / 'project'
            suite.prepare(project,scenario['cases'][0],scenario)
            baseline=suite.base.product_files(project)
            with patch.object(suite.executor,'restricted',side_effect=authored):
                starter=suite.grade(project,scenario['cases'][0],Path(temp)/'starter',True,baseline)
                self.assertFalse(starter['eligible'])
                self.assertGreaterEqual(sum(row['status']=='failed' for row in starter['results']),5)
                suite.calibration(project,scenario['cases'],Path(temp)/'calibration')
                suite.compliance_calibration(project,scenario['cases'],Path(temp)/'compliance-calibration')
            pointer=json.loads((Path(temp)/'compliance-calibration/summary.json').read_text())
            self.assertEqual(json.loads((Path(temp)/'compliance-calibration'/pointer['includedIn']).read_text())['matched'],17)
            report=json.loads((Path(temp)/'calibration/summary.json').read_text())
            self.assertEqual(report['matched'],17)
            self.assertEqual(sum(row['eligible'] for row in report['rows']),2)
            self.assertTrue(all(row['matched'] for row in report['rows']))
            # Persist a reproducible authored check report, explicitly not a model result.
            target=HERE/'validation/authored-calibration.json'
            target.parent.mkdir(exist_ok=True)
            target.write_text(json.dumps({'mode':'trusted-authored-fixtures-only','isolationVerified':False,
                'correctAccepted':2,'mutantsRejected':15,'modelCalls':0,'oracleHash':report['sourceHash'],
                'rows':[{'variant':r['variant'],'expectedDiagnostic':r['expectedDiagnostic'],'matched':r['matched'],
                    'satisfied':r['planCompliance']['satisfied'],'total':r['planCompliance']['total']} for r in report['rows']]},indent=2)+'\n')

    def test_scope_rejects_new_product_but_allows_tests(self):
        with tempfile.TemporaryDirectory() as temp:
            project=Path(temp)
            (project/'existing.mjs').write_text('unchanged')
            baseline=suite.base.product_files(project)
            (project/'new.test.mjs').write_text('test')
            self.assertEqual(suite.scope_result(project,baseline)['status'],'passed')
            (project/'helper.mjs').write_text('new product')
            self.assertEqual(suite.scope_result(project,baseline)['paths'],['helper.mjs'])


if __name__=='__main__': unittest.main()
