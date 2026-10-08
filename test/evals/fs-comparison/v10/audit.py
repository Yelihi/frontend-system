#!/usr/bin/env python3
"""Read artifacts and trusted FS receipts; do not execute generated applications."""
import argparse,importlib.util,json,subprocess
from pathlib import Path
spec=importlib.util.spec_from_file_location('v10',Path(__file__).with_name('run.py'));v=importlib.util.module_from_spec(spec);spec.loader.exec_module(v)

def audit(root):
 m=json.loads((root/'manifest.json').read_text());rows=[];threads=[]
 for c in m['cells']:
  row={'id':c['id'],'phases':{},'candidateIds':[],'fullBodies':[],'staticCandidateIds':[],'hostSemanticCandidateIds':[]};trace=[];commands=[]
  for phase in ['questions','plan']:
   p=root/c['id']/phase
   if not (p/'audit.json').exists():continue
   a=json.loads((p/'audit.json').read_text());r=a['invocation'];row['phases'][phase]={'sourceUnchanged':a['sourceUnchanged'],'runtimeUnchanged':a['runtimeUnchanged'],'threadId':r['threadId'],'artifactError':a.get('artifactError'),'usageComplete':bool(r['usage']),'environmentFailure':a['environmentFailure']}
   if phase=='questions':threads.append(r['threadId'])
   for line in (p/'events.jsonl').read_text().splitlines():
    e=json.loads(line);i=e.get('item',{})
    if e.get('type')!='item.completed':continue
    if i.get('type')=='command_execution':commands.append({'phase':phase,'command':i['command'],'exitCode':i.get('exit_code')})
    if i.get('type')!='mcp_tool_call':continue
    result=i.get('result') or {};data=result.get('structured_content')
    if data is None:
     content=[x['text'] for x in result.get('content',[]) if x.get('type')=='text']
     try:data=json.loads('\n'.join(content))
     except ValueError:data='\n'.join(content)
    error=i.get('status')=='failed' or result.get('isError',False) or bool(i.get('error'))
    trace.append({'phase':phase,'tool':i.get('tool'),'arguments':i.get('arguments'),'response':data,'error':error})
    if error or not isinstance(data,dict):continue
    if i['tool']=='read_learned_knowledge':
     for ref in data.get('references',[data] if 'entry' in data else []):
      if i.get('arguments',{}).get('offset',0)==0 and ref.get('nextOffset') is None and len(ref.get('content',''))==ref.get('totalCharacters'):row['fullBodies'].append(ref['entry']['id'])
    route=data.get('routing') or (data if i['tool']=='inspect_code_knowledge' else {})
    row['candidateIds'] += [x['id'] for x in route.get('candidates',[])]
    for x in route.get('inspection',route).get('candidates',[]):
     if any(y.get('origin')=='static' for y in x.get('matches',[])):row['staticCandidateIds'].append(x['id'])
     if any(y.get('origin')=='host' for y in x.get('matches',[])):row['hostSemanticCandidateIds'].append(x['id'])
   if phase=='plan' and (p/'project/owner-answers.json').exists():
    expected=json.loads((root/c['id']/'answers.json').read_text())['answers']
    row['answersUnchanged']=json.loads((p/'project/owner-answers.json').read_text())=={'answers':[{k:x[k] for k in ['questionId','answer']} for x in expected]}
    row['questionsUnchanged']=(p/'project/questions.json').read_bytes()==(root/c['id']/'questions/project/questions.json').read_bytes()
  row['approvalCalls']=[x for x in trace if x['tool']=='approve_revision']
  if len(row['phases'])==2:row['ownThreadResumed']=row['phases']['questions']['threadId']==row['phases']['plan']['threadId']
  for k in ['candidateIds','fullBodies','staticCandidateIds','hostSemanticCandidateIds']:row[k]=sorted(set(row[k]))
  v.save(root/c['id']/'mcp-trace.json',trace);v.save(root/c['id']/'commands.json',commands)
  if c['arm'].startswith('fs-'):
   project=root/c['id']/'plan/project'
   if (project/'.frontend-system/plans/portal-refactor/revision.json').is_file():
    code="""import {readRevision} from './dist/src/application/workflow-store.js';import {revisionReceipt} from './dist/src/application/revision-response.js';import {readFile} from 'node:fs/promises';import {revisionInfluence} from './dist/src/application/revision-response.js';import {readReferenceIndex} from './dist/src/application/knowledge/reference-index.js';const r=await readRevision(process.argv[2],'portal-refactor');const index=await readReferenceIndex(process.argv[3]+'/references/learned');let same=false;try{same=await readFile(process.argv[2]+'/plan.md','utf8')===r.content;}catch{}console.log(JSON.stringify({...revisionReceipt(r),standaloneMatchesProjection:same,rules:r.policy?.rules,decisionEvidence:r.evidence?.decisions,influence:revisionInfluence(r,index,0,20)}));"""
    result=subprocess.run(['node','--input-type=module','-',str(project.resolve()),str((root/'frozen-runtime').resolve())],input=code,text=True,capture_output=True,cwd=v.REPO)
    result.check_returncode();data=json.loads(result.stdout);v.save(root/c['id']/'native-contract-audit.json',data)
    saves=[x['response'] for x in trace if x['tool']=='save_revision' and not x['error']]
    row['native']={k:data[k] for k in ['hash','approved','drifted','contractDiagnostics','standaloneMatchesProjection']};row['native']['matchesLastSave']=bool(saves and saves[-1]['hash']==data['hash'])
  rows.append(row)
 v.save(root/'integrity-routing-audit.json',{'scope':'Input/thread/source/body delivery and stored linkage checks, not semantic proof','questionThreadsUnique':len(threads)==len(set(threads)),'rows':rows})
 print('Audited',len(rows),'cells')
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('output',type=Path);args=p.parse_args();audit(args.output.resolve())
