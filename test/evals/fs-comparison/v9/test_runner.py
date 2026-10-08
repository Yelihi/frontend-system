import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

spec=importlib.util.spec_from_file_location('v9',Path(__file__).with_name('run.py'))
runner=importlib.util.module_from_spec(spec);spec.loader.exec_module(runner)

class Artifacts(unittest.TestCase):
    def test_citations_detect_invented_evidence_without_claiming_semantics(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder)
            (root/'source.ts').write_text('const token = session.token();')
            (root/'questions.json').write_text(json.dumps({'questions':[{'id':'q1','question':'What does replacement mean?',
                'evidence':[{'path':'source.ts','quote':'const token = session.token();'}], 'options':[]}]}))
            self.assertTrue(runner.check_questions(root)['allQuotesExact'])
            (root/'source.ts').write_text('different code')
            self.assertFalse(runner.check_questions(root)['allQuotesExact'])

    def test_no_symlink_escape_or_duplicate_question_identity(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder)
            (root/'external').symlink_to(__file__)
            with self.assertRaises(ValueError):runner.safe_read(root,'external')
            q={'id':'same','question':'Question?','evidence':[],'options':[]}
            (root/'questions.json').write_text(json.dumps({'questions':[q,q]}))
            with self.assertRaises(ValueError):runner.check_questions(root)

    def test_cross_cell_deny_is_inherited_by_mcp_and_review_workspace(self):
        spec=importlib.util.spec_from_file_location('v9review',Path(__file__).with_name('review.py'))
        review=importlib.util.module_from_spec(spec);spec.loader.exec_module(review)
        with tempfile.TemporaryDirectory(prefix='fs-v9-') as folder:
            root=Path(folder).resolve();project=root/'cell/project';project.mkdir(parents=True)
            (root/'manifest.json').write_text(json.dumps({'cells':[{'project':str(project)}]}))
            self.assertEqual(review.review_root(root),root)
            config=runner.configs(project,'fs-K1')
            deny=json.dumps(str(root))+'="deny"'
            self.assertTrue(any(deny in line for line in config if line.startswith('permissions.eval.filesystem=')))
            wrapper=json.loads(next(line.split('=',1)[1] for line in config if line.startswith('mcp_servers.frontend-system.args=')))
            self.assertTrue(any(deny in arg for arg in wrapper))
            (root/'manifest.json').write_text(json.dumps({'cells':[{'project':'/outside/cell/project'}]}))
            with self.assertRaises(ValueError):review.review_root(root)

if __name__=='__main__':unittest.main()
