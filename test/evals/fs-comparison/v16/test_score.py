import copy
import unittest
from score import answer_hash, score


class ScoreTests(unittest.TestCase):
    def setUp(self):
        self.cases=[{'id':'case','eligibleRepeat':True,'reuse':'D-one','exception':True}]
        self.cells=[{'id':'run','case':'case','arm':'fs'}]
        answer={'questions':[],'action':'keep'}
        self.rows=[{'id':'run','audit':{'complete':True,'exactCitations':True,'answer':answer}}]
        self.review={'reviewer':'unit fixture','limitations':'Authored scoring calibration, not model quality',
          'judgments':[{'id':'run','answerHash':answer_hash(answer),'rationale':'Fixture reviewer decision',
                        'repeatedQuestions':0,'reuseCorrect':True,'exceptionCorrect':False,'guardrailCorrect':None}]}

    def test_no_questions_and_exact_quotes_are_not_automatic_quality(self):
        result=score(self.cases,self.cells,self.rows,self.review)['groups']['fs']
        self.assertEqual(result['reuseCorrect'],1);self.assertEqual(result['exceptionCorrect'],0)
        self.review['judgments']=[]
        result=score(self.cases,self.cells,self.rows,self.review)['groups']['fs']
        self.assertEqual(result['reuseEligible'],1);self.assertEqual(result['reuseUnverified'],1)
        self.assertEqual(result['repeatUnverified'],1)

    def test_missing_runs_and_unverified_citations_stay_in_denominator(self):
        self.rows[0]['audit']['exactCitations']=False
        result=score(self.cases,self.cells,self.rows,self.review)['groups']['fs']
        self.assertEqual(result['reuseCorrect'],0);self.assertEqual(result['reuseUnverified'],1)
        result=score(self.cases,self.cells,[],{**self.review,'judgments':[]})['groups']['fs']
        self.assertEqual(result['reuseEligible'],1);self.assertEqual(result['reuseUnverified'],1)

    def test_changed_answers_and_invalid_annotations_fail(self):
        invalid=copy.deepcopy(self.review);invalid['judgments'][0]['answerHash']='stale'
        with self.assertRaisesRegex(ValueError,'Stale'):score(self.cases,self.cells,self.rows,invalid)
        invalid=copy.deepcopy(self.review);invalid['judgments'][0]['repeatedQuestions']=1
        with self.assertRaisesRegex(ValueError,'question'):score(self.cases,self.cells,self.rows,invalid)
        invalid=copy.deepcopy(self.review);invalid['judgments'].append(invalid['judgments'][0])
        with self.assertRaisesRegex(ValueError,'Duplicate'):score(self.cases,self.cells,self.rows,invalid)


if __name__=='__main__':unittest.main()
