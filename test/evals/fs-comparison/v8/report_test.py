import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
HERE=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('v8_report',HERE/'report.py')
report=importlib.util.module_from_spec(spec);spec.loader.exec_module(report)

class AccountingTest(unittest.TestCase):
    def test_incomplete_stage_and_missing_usage_are_not_zero_or_complete(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp)
            def record(phase,usage):
                path=root/'fs/initial'/phase/'0/record.json';path.parent.mkdir(parents=True,exist_ok=True)
                path.write_text(json.dumps({'phase':phase,'invocation':{'usage':usage,'elapsedSeconds':7,'threadId':'thread'},'grade':{'status':'unverified'}}))
            record('prepare',{'input_tokens':20,'cached_input_tokens':10,'output_tokens':2,'total_tokens':22})
            pending=report.analyze(root)
            self.assertIsNone(pending['rows'][0]['totalTokens'])
            self.assertEqual(pending['rows'][0]['reportedTokenLowerBound'],22)
            record('work',None)
            (root/'summary.json').write_text(json.dumps({'status':'blocked','journeys':[{'arm':'fs','stage':'initial','eligible':False,'workflow':'workflow-failed','trace':[]}]}))
            aborted=report.analyze(root)
            self.assertIsNone(aborted['rows'][0]['totalTokens'])
            self.assertIsNone(aborted['totals'][2]['totalTokens'])
            self.assertEqual(aborted['rows'][0]['reportedTokenLowerBound'],22)
            self.assertFalse(aborted['rows'][0]['eligible'])

    def test_completed_stages_sum_deltas_and_keep_first_score(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp);journeys=[]
            for stage in report.STAGES:
                journeys.append({'arm':'informed','stage':stage,'eligible':True,'workflow':'observed','trace':[]})
                for phase in ['prepare','work']:
                    path=root/'informed'/stage/phase/'0/record.json';path.parent.mkdir(parents=True)
                    path.write_text(json.dumps({'phase':phase,'invocation':{'elapsedSeconds':1,'threadId':stage,'usage':{'input_tokens':20,'cached_input_tokens':10,'output_tokens':2,'total_tokens':22}},'grade':{'planCompliance':{'satisfied':97,'total':97}}}))
            (root/'summary.json').write_text(json.dumps({'status':'completed','journeys':journeys}))
            result=report.analyze(root)
            self.assertEqual(result['totals'][1]['totalTokens'],132)
            self.assertEqual(result['totals'][1]['uncachedInputPlusOutput'],72)
            self.assertEqual(len({r['threadIds'][0] for r in result['rows']}),3)
            self.assertEqual(result['rows'][0]['firstGrade'],{'satisfied':97,'total':97})

            # All calls are complete and charged even when the final contract fails.
            journeys[-1]['eligible']=False
            (root/'summary.json').write_text(json.dumps({'status':'completed','journeys':journeys}))
            failed=report.analyze(root)
            self.assertFalse(failed['totals'][1]['allStagesEligible'])
            self.assertTrue(failed['totals'][1]['allStagesRecorded'])
            self.assertEqual(failed['totals'][1]['totalTokens'],132)
            self.assertEqual(failed['totals'][1]['uncachedInputPlusOutput'],72)
            self.assertEqual(failed['totals'][1]['seconds'],6)

if __name__=='__main__':unittest.main()
