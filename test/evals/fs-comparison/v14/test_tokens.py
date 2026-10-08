import unittest
from tokens import extract, classify
class Accounting(unittest.TestCase):
 def test_reconciliation_and_duplicate_rejection(self):
  self.assertEqual(classify([{'name':'exec','input':'tools.exec_command({cmd: \"node tool-help.mjs save_revision\"})'}])['category'],'schema')
  self.assertEqual(classify([{'name':'exec','input':'tools.mcp__frontend_system__save_revision({})'}])['category'],'plan')
  usage={'input_tokens':100,'cached_input_tokens':70,'output_tokens':10,'reasoning_output_tokens':4,'total_tokens':110}
  event={'timestamp':'2026-10-07T00:00:00Z','type':'token_usage_record','payload':{'thread_id':'test','response_id':'r1','usage':usage}}
  result=extract([event,event],usage,'test')
  self.assertEqual(len(result['points']),1)
  self.assertEqual(result['points'][0]['uncachedPlusOutput'],40)
  output={'type':'response_item','payload':{'type':'function_call_output','call_id':'c1','output':[{'type':'input_text','text':'{"exit_code": 1}'}]}}
  self.assertTrue(extract([output,event],usage,'test')['points'][0]['afterError'])
  output['payload']['output']=[{'type':'input_text','text':'Analysis quote not found'}]
  self.assertTrue(extract([output,event],usage,'test',['Analysis quote not found'])['points'][0]['afterError'])
  self.assertFalse(extract([output,event],usage,'test')['points'][0]['afterError'])
  with self.assertRaises(ValueError):extract([event],{**usage,'input_tokens':101},'test')
  with self.assertRaises(ValueError):extract([event,{**event,'payload':{**event['payload'],'usage':{**usage,'output_tokens':11}}}],usage,'test')
  with self.assertRaises(ValueError):extract([event],usage,'wrong')
if __name__=='__main__':unittest.main()
