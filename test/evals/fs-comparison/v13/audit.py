#!/usr/bin/env python3
"""Audit recorded calls/artifacts; semantic conclusions belong in the report."""
import hashlib,json,sys
from pathlib import Path
root=Path(sys.argv[1]).resolve()
manifest=json.loads((root/'manifest.json').read_text())
def sources(folder):
 return {str(p.relative_to(folder)):hashlib.sha256(p.read_bytes()).hexdigest()
         for p in folder.rglob('*') if p.is_file() and
         p.relative_to(folder).parts[0] not in {'.git','.frontend-system','.eval'} and
         str(p.relative_to(folder)) not in {'analysis.md','plan.md'}}
rows=[]
for arm in ['ordinary','fs']:
 for stage in ['initial','change']:
  folder=root/arm/stage
  if not (folder/'result.json').exists():continue
  result=json.loads((folder/'result.json').read_text())
  audit=json.loads((folder/'audit.json').read_text())
  expected=sources(root/arm/'initial-source')
  if stage=='change':
   expected.update({p:hashlib.sha256(manifest[k].encode()).hexdigest() for p,k in
                    [('src/features/checkout/index.js','delta'),('change-request.md','change')]})
  row={'arm':arm,'stage':stage,'threadId':result['threadId'],'seconds':result['elapsedSeconds'],
       'usage':result['usage'],'artifactAudit':audit,'errors':[],'responses':{},'staleReasons':[],
       'renders':[],'savedPlans':[],'contractDiagnostics':None}
  row['protectedSourceMatches']=sources(folder/'project')==expected
  for line in (folder/'events.jsonl').read_text().splitlines():
   event=json.loads(line);item=event.get('item',{})
   if event['type']!='item.completed':continue
   if item.get('type')=='command_execution':
    key='shell:tool-help' if 'tool-help' in item.get('command','') else 'shell:other'
    text=item.get('aggregated_output','')
   elif item.get('type')=='mcp_tool_call':
    key=item['tool'];text=''.join(c.get('text','') for c in (item.get('result') or {}).get('content',[]))
    if item.get('status')=='failed':row['errors'].append({'tool':key,'message':text});continue
    try:data=json.loads(text)
    except ValueError:data={}
    if key=='get_project_analysis':
     row['staleReasons'] += [reason for r in data.get('records',[]) for reason in r.get('freshness',{}).get('reasons',[])]
    if key=='save_revision':row['contractDiagnostics']=data.get('contractDiagnostics')
    if key=='render_project_flow':
     relative=Path('.frontend-system/diagrams')/Path(data['path']).name
     artifact=folder/'project'/relative
     row['renders'].append({'path':str(relative),'expectedHash':data['hash'],
        'actualHash':hashlib.sha256(artifact.read_bytes()).hexdigest() if artifact.exists() else None,
        'language':item['arguments'].get('language','ko')})
   else:continue
   counter=row['responses'].setdefault(key,{'calls':0,'characters':0})
   counter['calls']+=1;counter['characters']+=len(text)
  for plan in (folder/'project/.frontend-system/plans').glob('*/revision.json'):
   revision=json.loads(plan.read_text())
   references=[]
   for ref in (revision.get('evidence') or {}).get('analysisRefs',[]):
    history=folder/'project/.frontend-system/analysis/history'/(ref['hash']+'.json')
    raw=history.read_bytes() if history.exists() else b''
    record=json.loads(raw)['record'] if raw else {}
    references.append({'id':ref['id'],'hashMatches':hashlib.sha256(raw).hexdigest()==ref['hash'],
                       'identityMatches':record.get('kind')==ref['kind'] and record.get('data',{}).get('id')==ref['id']})
   row['savedPlans'].append({'path':str(plan.relative_to(folder/'project')),'approved':revision.get('approved'),
                            'evidenceBound':bool(revision.get('evidence')),'references':references})
  # Only the final render per path must match the final artifact, not superseded renders.
  latest={r['path']:r for r in row['renders']}
  row['exportIntegrity']=all(r['actualHash']==r['expectedHash'] for r in latest.values()) if latest else None
  row['deliveryComplete']=audit['complete'] and row['protectedSourceMatches'] and (arm!='fs' or (row['exportIntegrity'] is True and
      (stage!='change' or (row['contractDiagnostics']==[] and any(p['evidenceBound'] and p['approved'] is False and
       p['references'] and all(r['hashMatches'] and r['identityMatches'] for r in p['references']) for p in row['savedPlans'])))))
  rows.append(row)
assert len({r['threadId'] for r in rows})==len(rows),'Thread reuse'
output={'meaning':'Artifact/hash/record audit; not semantic correctness, browser execution or a causal model-quality score.', 'rows':rows}
(root/'mechanism-audit.json').write_text(json.dumps(output,ensure_ascii=False,indent=2)+'\n')
for r in rows:print(r['arm'],r['stage'],'complete:',r['deliveryComplete'],'integrity:',r['exportIntegrity'],'errors:',len(r['errors']))
