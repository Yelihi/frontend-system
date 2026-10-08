"""Exact per-response usage; transparent operation labels, never causal attribution."""
import hashlib,json,re,uuid
from pathlib import Path
KEYS=('input_tokens','cached_input_tokens','output_tokens','reasoning_output_tokens')
TOOL_GROUPS={
 'baseline':('get_project_snapshot','read_project_source','save_project_context','get_project_document'),
 'knowledge':('get_work_context','discover_knowledge_triggers','read_learned_knowledge','inspect_code_knowledge','judge_code_knowledge'),
 'source-or-artifact-read':('inspect_project','list_project_files'),
 'flow':('get_project_analysis','save_project_analysis','render_project_flow'),
 'plan':('save_revision','get_revision','list_plans'),
 'verify':('run_verification','record_review','check_capabilities'),
}
def classify(calls):
 tags=set()
 for call in calls:
  text=call.get('input',call.get('arguments',''))
  if not isinstance(text,str):text=json.dumps(text)
  name=call['name'];found=False
  # Classify actual tool identifiers, not tool names merely quoted in a schema or document.
  names={name,*re.findall(r'tools\.([A-Za-z0-9_]+)\s*\(',text)}
  for group,tools in TOOL_GROUPS.items():
   if any(n==tool or n.endswith('__'+tool) for n in names for tool in tools):tags.add(group);found=True
  shell=any(n.endswith('exec_command') for n in names)
  if shell and 'tool-help' in text:tags.add('schema');found=True
  if shell and ('SKILL.md' in text or 'runtime/references/workflows' in text):tags.add('instructions');found=True
  if any(n.endswith('apply_patch') for n in names) or (shell and re.search(r'write_text|writeFile|cat\s*>',text)):
   tags.add('artifact-writing');found=True
  if not found:
   if shell and re.search(r'\b(cat|sed|rg|head|tail|nl|readFile|read_text)\b',text):tags.add('source-or-artifact-read')
   elif name in {'exec','exec_command','functions.exec'}:tags.add('shell-other')
   else:tags.add('other')
 return {'category':next(iter(tags)) if len(tags)==1 else ('mixed' if tags else 'response-only'),'tags':sorted(tags)}

def extract(events,expected,thread,failure_messages=()):
 points=[];pending=[];outputs=[];seen={}
 for e in events:
  p=e.get('payload',{})
  if e.get('type')=='response_item':
   if p.get('type') in {'custom_tool_call','function_call'}:
    pending.append({k:p[k] for k in ('name','call_id','input','arguments') if k in p})
   elif p.get('type') in {'custom_tool_call_output','function_call_output'}:
    output=p.get('output','');text=output if isinstance(output,str) else json.dumps(output,ensure_ascii=False)
    visible='\n'.join(x.get('text','') for x in output if isinstance(x,dict)) if isinstance(output,list) else text
    # Keep error signals inspectable; these include host wrapper failures absent from CLI MCP counts.
    failed=bool(re.search(r'Script failed|Script error:|"isError"\s*:\s*true|"status"\s*:\s*"failed"|"exit_code"\s*:\s*[1-9]|"is_error"\s*:\s*true',visible)) or any(message in visible for message in failure_messages)
    outputs.append({'callId':p.get('call_id'),'characters':len(text),'errorSignal':failed})
  if e.get('type')!='token_usage_record':continue
  if p.get('thread_id')!=thread:raise ValueError('Unexpected thread in usage')
  ident=p['response_id'];u=p['usage']
  if ident in seen:
   if seen[ident]!=u:raise ValueError('Conflicting duplicate response counters')
   continue
  seen[ident]=u
  if any(type(u.get(k)) is not int or u[k]<0 for k in KEYS):raise ValueError('Invalid usage')
  if u['cached_input_tokens']>u['input_tokens'] or u['reasoning_output_tokens']>u['output_tokens']:raise ValueError('Invalid component usage')
  if u.get('total_tokens')!=u['input_tokens']+u['output_tokens']:raise ValueError('Invalid total')
  row={'index':len(points)+1,'timestamp':e['timestamp'],'responseId':ident,'usage':u,
       'calls':pending,'precedingOutputs':outputs,'afterError':any(x['errorSignal'] for x in outputs),**classify(pending)}
  row['uncachedPlusOutput']=u['input_tokens']-u['cached_input_tokens']+u['output_tokens']
  points.append(row);pending=[];outputs=[]
 if not points:raise ValueError('No per-response usage records')
 totals={k:sum(p['usage'][k] for p in points) for k in KEYS}
 if expected is None or any(totals[k]!=expected.get(k) for k in KEYS):raise ValueError('Response counters do not reconcile with final CLI usage')
 return {'threadId':thread,'reconciled':True,'totals':totals,'points':points}

def collect(folder):
 folder=Path(folder);r=json.loads((folder/'result.json').read_text());thread=r['threadId']
 if not thread or str(uuid.UUID(thread))!=thread:raise ValueError('No exact thread ID')
 matches=list((Path.home()/'.codex/sessions').glob('**/*'+thread+'.jsonl'))
 if len(matches)!=1:raise ValueError('Expected one exact-thread rollout')
 raw=matches[0].read_bytes();events=[json.loads(x) for x in raw.splitlines()]
 failures=[]
 for line in (folder/'events.jsonl').read_text().splitlines():
  event=json.loads(line);item=event.get('item',{})
  if event.get('type')=='item.completed' and item.get('type')=='mcp_tool_call' and item.get('status')=='failed':
   message=''.join(x.get('text','') for x in (item.get('result') or {}).get('content',[]))
   if message:failures.append(message)
 data=extract(events,r['usage'],thread,failures);data['sourceSha256']=hashlib.sha256(raw).hexdigest()
 data['extractorSha256']=hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
 (folder/'tokens.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
 return data
if __name__=='__main__':
 import sys
 d=collect(sys.argv[1]);print(json.dumps({'responses':len(d['points']),'reconciled':d['reconciled'],'totals':d['totals']}))
