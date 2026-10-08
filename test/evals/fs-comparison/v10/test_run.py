import importlib.util,json,tempfile,unittest
from pathlib import Path
s=importlib.util.spec_from_file_location('v10',Path('test/evals/fs-comparison/v10/run.py').resolve());m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
class Harness(unittest.TestCase):
 def test_frozen_inputs_include_requests_and_exclude_outputs(self):
  names=m.inputs();self.assertIn('projects/design-system/README.md',names);self.assertIn('cases.json',names);self.assertNotIn('README.md',names);self.assertFalse(any(k.startswith('results/') for k in names))
 def test_answer_guard_rejects_invention_and_ambiguous_unknown(self):
  with tempfile.TemporaryDirectory() as tmp:
   out=Path(tmp);c={'id':'x','case':'c'};manifest={'answerBank':{'c':{'known':'Decided.','unknown':'Unspecified.'}}}
   def put(keys,answer):m.save(out/'x/answers.json',{'answers':[{'questionId':'q1','bankKeys':keys,'answer':answer,'mappingRationale':'Actual question about this scope'}]})
   put(['known'],'Decided.');m.validate_answers(c,out,manifest)
   put(['known'],'Invented.')
   with self.assertRaises(ValueError):m.validate_answers(c,out,manifest)
   put(['known','unknown'],'Decided.\nUnspecified.')
   with self.assertRaises(ValueError):m.validate_answers(c,out,manifest)
 def test_sources_and_bank_are_outside_model_prompt(self):
  for arm in m.ARMS:
   prompt=m.v9.question_prompt(arm)+m.v9.plan_prompt(arm)
   self.assertNotIn('cases.json',prompt);self.assertNotIn('answerBank',prompt)
 def test_audit_moves_outside_generator_without_removing_persistence_or_diagnostics(self):
  prompt=m.plan_prompt('fs-K1')
  self.assertIn('save an unapproved named revision',prompt)
  self.assertIn('contractDiagnostics',prompt)
  self.assertNotIn('get_revision(detail:influence)',prompt)
  self.assertEqual(m.plan_prompt('ordinary'),m._original_plan_prompt('ordinary'))
  self.assertEqual(m.plan_prompt('raw-K1'),m._original_plan_prompt('raw-K1'))
 def test_three_disjoint_cases_per_cohort(self):
  cases=json.loads((m.HERE/'cases.json').read_text());self.assertEqual(sum(c['cohort']=='development' for c in cases.values()),3);self.assertEqual(sum(c['cohort']=='holdout' for c in cases.values()),3)
  for name in cases:self.assertEqual(len(list((m.HERE/'projects'/name/'src').glob('*.ts'))),5)
 def test_natural_request_does_not_supply_the_guided_design_checklist(self):
  for arm in m.ARMS:
   prompt=m.question_prompt(arm,'natural')+m.plan_prompt(arm,'natural')
   self.assertNotIn('verifiable examples/checks',prompt);self.assertNotIn('viable alternatives and costs',prompt)
   self.assertNotIn('answerBank',prompt);self.assertIn('README.md',prompt)
  self.assertIn('fs-plan/SKILL.md',m.question_prompt('fs-K1','natural'))
  self.assertNotIn('fs-plan/SKILL.md',m.question_prompt('ordinary','natural'))
 def test_natural_question_format_accepts_plain_questions_but_checks_supplied_quotes(self):
  with tempfile.TemporaryDirectory() as tmp:
   root=Path(tmp);m.save(root/'questions.json',{'questions':[{'id':'q1','question':'Who owns this operation?'}]})
   self.assertEqual(m.check_questions(root,'natural')['count'],1)
   with self.assertRaises(ValueError):m.check_questions(root,'guided')
   m.save(root/'questions.json',{'questions':[{'id':'q1','question':'Who owns this operation?','evidence':['The current owner is shared.',{'file':'source.ts','observation':'Shared owner'}]}]})
   prose=m.check_questions(root,'natural');self.assertEqual(len(prose['uncitedEvidence']),2);self.assertEqual(prose['citations'],[])
   (root/'source.ts').write_text('export const owner = 1;')
   m.save(root/'questions.json',{'questions':[{'id':'q1','question':'Who owns this operation?','evidence':[{'path':'source.ts','quote':'invented'}]}]})
   self.assertFalse(m.check_questions(root,'natural')['allQuotesExact'])
if __name__=='__main__':unittest.main()
