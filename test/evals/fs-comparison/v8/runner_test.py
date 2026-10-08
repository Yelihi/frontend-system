"""Authored calibration may run on host; never substitute this runner for model evaluation."""
import importlib.util
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

HERE=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('maintenance_v8',HERE/'run.py')
suite=importlib.util.module_from_spec(spec);spec.loader.exec_module(suite)

class MaintenanceTest(unittest.TestCase):
    def test_authored_calibration(self):
        def authored(project,argv,source,timeout=0):
            return subprocess.run(argv,input=source,cwd=project,text=True,capture_output=True,timeout=timeout)
        with tempfile.TemporaryDirectory() as temp,patch.object(suite.executor,'codex_binary',return_value=shutil.which('node')):
            project=Path(temp).resolve()/'project';suite.prepare(project)
            with patch.object(suite.executor,'restricted',side_effect=authored):
                suite.calibration(project,Path(temp)/'calibration')
            report=json.loads((Path(temp)/'calibration/summary.json').read_text())
            self.assertEqual(report['matched'],26,report)
            self.assertEqual(suite.scope_result(project,suite.base.product_files(project),'variants')['status'],'passed')
            baseline=suite.base.product_files(project)
            (project/'ui/Amount.jsx').write_text('unauthorized')
            self.assertEqual(suite.scope_result(project,baseline,'variants')['status'],'failed')
            self.assertEqual(suite.scope_result(project,baseline,'initial')['status'],'passed')
            target=HERE/'validation/authored-calibration.json';target.parent.mkdir(exist_ok=True)
            target.write_text(json.dumps(report,indent=2)+'\n')

    def test_stages_reset_context_but_resume_answer_and_preserve_files(self):
        previous=[]
        def invoke(project,output,model,prompt,configs,timeout,env,previous=None):
            seen.append(previous)
            output.mkdir(parents=True)
            topic='theme-strategy' if 'initial' in str(output) else 'variant-defaults'
            (output/'final.md').write_text(json.dumps({'questions':[{'topic':topic,'question':'Choose the policy?'}]}))
            (output/'events.jsonl').write_text('')
            return {'exitCode':0,'completedTurns':1,'elapsedSeconds':1,'errors':[], 'threadId':topic,
                    'usage':{'input_tokens':10,'cached_input_tokens':2,'output_tokens':3,'total_tokens':13}}
        seen=[]
        with tempfile.TemporaryDirectory() as temp:
            project=Path(temp)/'project';project.mkdir();runtime=Path(temp)/'runtime';runtime.mkdir()
            (project/'keep.jsx').write_text('unchanged');(project/'CONTRACT.md').write_text('contract')
            with patch.object(suite.executor,'permissions',return_value=[]),patch.object(suite.executor,'runtime_env',return_value={}),patch.object(suite.executor,'invoke',side_effect=invoke),patch.object(suite.executor,'environment_failure',return_value=None),patch.object(suite,'grade',return_value={'status':'graded','eligible':True,'results':[]}):
                for stage in suite.STAGES[:2]:
                    journey=suite.run_stage(project,runtime,{},'ordinary',stage,Path(temp)/stage['id'],SimpleNamespace(model='fake',timeout=1),lambda:None)
                    self.assertTrue(journey['eligible'])
                    self.assertEqual(journey['usage']['total_tokens'],26)
            self.assertIsNone(seen[0]);self.assertEqual(seen[1]['threadId'],'theme-strategy')
            self.assertIsNone(seen[2]);self.assertEqual(seen[3]['threadId'],'variant-defaults')
            self.assertEqual((project/'keep.jsx').read_text(),'unchanged')
            self.assertTrue((project/'ANSWERS-initial.md').exists())
            self.assertTrue((project/'ANSWERS-variants.md').exists())

    def test_missing_usage_is_unknown_and_default_change_is_explicit(self):
        self.assertIsNone(suite.usage([{'invocation':{'usage':None}}]))
        self.assertEqual(suite.styles('variants')['ActionButton']['defaults']['tone'],'primary')
        self.assertEqual(suite.styles('defaults')['ActionButton']['defaults']['tone'],'quiet')
        self.assertIn('danger',suite.styles('defaults')['ActionButton']['axes']['tone'])
        self.assertNotIn('danger',suite.BASE_STYLES['ActionButton']['axes']['tone'])
        self.assertIsNone(suite.STAGES[2]['topic'])

    def test_workflow_requires_bound_evidence_baseline_and_accepted_completion(self):
        def call(name,response=None,arguments=None):
            return {'tool':name,'response':response or {},'arguments':arguments or {},'error':False}
        trace=[call('save_project_context'),call('approve_revision'),
            call('get_work_context',{'routing':{'hash':'pinned'}}),call('save_revision',{'evidenceStatus':'recorded'}),
            call('start_work',{'attempt':{'id':'attempt'},'baseline':{'purpose':'baseline'}}),
            call('complete_work',{'status':'complete'})]
        self.assertTrue(suite.workflow_observed(trace))
        self.assertFalse(suite.workflow_observed([item for item in trace if item['tool']!='save_revision']))
        self.assertFalse(suite.workflow_observed(trace[:-1]+[call('complete_work',{'status':'incomplete'})]))
        self.assertFalse(suite.workflow_observed(trace[:-2]+[call('start_work',{'status':'attempt-error'}),trace[-1]]))
        self.assertFalse(suite.workflow_observed(trace[:-2]+[call('start_work',{'attempt':{'id':'attempt'}}),trace[-1]]))

    def test_repair_includes_observed_diagnostics_without_reference_code(self):
        report={'results':[{'id':'mismatch','status':'failed','reason':'actual: changed; expected: preserved'},
                           {'id':'scope','status':'failed','paths':['protected.jsx']},
                           {'id':'passed','status':'passed','reason':'not relevant'}],
                'referenceSource':'SECRET_ORACLE'}
        prompt=suite.repair_prompt(report)
        self.assertIn('actual: changed; expected: preserved',prompt)
        self.assertIn('protected.jsx',prompt)
        self.assertNotIn('not relevant',prompt)
        self.assertNotIn('SECRET_ORACLE',prompt)
        self.assertEqual(report['results'][0]['status'],'failed')

if __name__=='__main__':unittest.main()
