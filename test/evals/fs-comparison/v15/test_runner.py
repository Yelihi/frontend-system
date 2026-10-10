import json
import tempfile
import unittest
from pathlib import Path
from run import audit_answer


class AnswerAuditTests(unittest.TestCase):
    def test_action_match_does_not_claim_semantic_support(self):
        with tempfile.TemporaryDirectory() as folder:
            project = Path(folder) / 'project'
            project.mkdir()
            target = Path(folder) / 'result'
            target.mkdir()
            (project / 'owner.md').write_text('Current scoped exemption')
            answer = {'action':'ask', 'evidence':[{'path':'owner.md','quote':'Current scoped exemption'}], 'knowledge':[]}
            case = {'id':'style-adopted','allowedActions':['change']}

            def audit():
                (target / 'final.md').write_text(json.dumps(answer))
                return audit_answer(project, target, case, 'ordinary')

            result = audit()
            self.assertTrue(result['safeMissingPolicy'])
            self.assertFalse(result['actionMatches'])
            self.assertTrue(result['exactCitations'])
            self.assertEqual(result['semanticStatus'], 'requires-human-review')
            answer['evidence'][0]['quote'] = 'fabricated'
            self.assertFalse(audit()['exactCitations'])
            answer['evidence'][0]['path'] = '../result/final.md'
            self.assertIn('error', audit())
            (target / 'final.md').write_text('not json')
            self.assertIn('error', audit_answer(project, target, case, 'ordinary'))


if __name__ == '__main__':
    unittest.main()
