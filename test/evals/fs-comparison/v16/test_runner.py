import json
from pathlib import Path
import tempfile
import unittest
from run import audit, prompt


class ReplayAuditTests(unittest.TestCase):
    def test_exact_quote_is_not_semantic_success_and_escape_is_rejected(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder);project=root/'project';target=root/'result'
            project.mkdir();target.mkdir();(project/'task.md').write_text('Scope is local')
            value={'action':'keep','disposition':'project-only','questions':[], 'reusedDecisionIds':['invented'],
                   'evidence':[{'path':'task.md','quote':'Scope is local'}]}
            def run():
                (target/'final.md').write_text(json.dumps(value));return audit(project,target)
            self.assertTrue(run()['exactCitations'])
            self.assertEqual(run()['semanticStatus'],'requires-review')
            value['evidence'][0]['quote']='not present';self.assertFalse(run()['exactCitations'])
            value['evidence'][0]['path']='../result/final.md';self.assertIn('error',run())
            self.assertNotIn('procedures/',prompt('raw'))
            self.assertIn('procedures/pr-feedback.md',prompt('fs'))


if __name__=='__main__':unittest.main()
