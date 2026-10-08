import importlib.util,json,tempfile,unittest
from pathlib import Path
HERE=Path(__file__).resolve().parent
path=HERE/'report.py'
spec=importlib.util.spec_from_file_location('report',path);report=importlib.util.module_from_spec(spec);spec.loader.exec_module(report)
class ReportTest(unittest.TestCase):
    def test_aborted_arm_without_journey_has_missing_totals_not_zero_or_success(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp)
            (root/'manifest.json').write_text(json.dumps({'scenario':{'cases':[{'id':'case'}]}}))
            (root/'summary.json').write_text(json.dumps({'status':'blocked','manifestHash':'hash','modelCalls':2,'journeys':[]}))
            usage={'input_tokens':90,'cached_input_tokens':50,'output_tokens':10,'total_tokens':100}
            for phase,finished in [('prepare',True),('work',False)]:
                folder=root/'case-fs'/phase/'0';folder.mkdir(parents=True)
                record={'phase':phase,'attempt':0,'grade':{'status':'recorded-not-semantically-graded' if finished else 'unverified'},'invocation':{'completedTurns':int(finished),'exitCode':0 if finished else 1,'elapsedSeconds':3,'usage':usage if finished else None,'errors':[] if finished else [{'message':'capacity'}]}}
                (folder/'record.json').write_text(json.dumps(record))
            plain,fs=report.analyze(root)['rows']
            self.assertEqual(plain['status'],'not-run');self.assertIsNone(plain['totalTokens']);self.assertIsNone(plain['seconds'])
            self.assertEqual(fs['status'],'incomplete');self.assertFalse(fs['eligible']);self.assertIsNone(fs['totalTokens']);self.assertIsNone(fs['uncachedInput']);self.assertIsNone(fs['grades']['S']);self.assertIsNone(fs['firstPass'])
            self.assertEqual(fs['reportedPartialTokens'],100);self.assertEqual(fs['seconds'],6);self.assertEqual(fs['errors'][0]['message'],'capacity')
    def test_artifact_escape_is_rejected(self):
        with tempfile.TemporaryDirectory() as temp:
            with self.assertRaises(ValueError):report.read(Path(temp),Path('../outside.json'))
if __name__=='__main__':unittest.main()
