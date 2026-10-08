#!/usr/bin/env python3
"""Reproducible plots and an offline drill-down; no model calls or product writes."""
import argparse,base64,csv,hashlib,html,json,statistics
from pathlib import Path
from tokens import classify
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.ticker import FuncFormatter
COLORS={'ordinary':'#2563eb','fs-K1':'#d65b18'}
CATEGORIES=['instructions','schema','source-or-artifact-read','baseline','knowledge','flow','plan','artifact-writing','mixed','shell-other','response-only','other']

def measured_median(values):
 values=list(values)
 return statistics.median(values) if values else None

def audit(folder,arm,stage):
 a=json.loads((folder/'audit.json').read_text());result={'artifactComplete':a['complete'],'contractComplete':None,'mcpErrors':0,'toolStats':{},'failedTools':[],'contextPayloads':[]}
 result['artifactLocations']=[str(p.relative_to(folder/'project')) for p in (folder/'project').rglob(stage+'.md') if p.is_file()]
 result['artifactLocationError']=a.get('artifactError')
 records=folder/'project/.frontend-system'
 result['flowRecords']=len(list((records/'analysis/flow').glob('*.json')))
 result['findingRecords']=len(list((records/'analysis/finding').glob('*.json')))
 events=[json.loads(x) for x in (folder/'events.jsonl').read_text().splitlines()]
 saves=[]
 for e in events:
  i=e.get('item',{})
  if e.get('type')!='item.completed' or i.get('type')!='mcp_tool_call':continue
  result['mcpErrors']+=int(i.get('status')=='failed')
  tool=i['tool'];stats=result['toolStats'].setdefault(tool,{'calls':0,'resultCharacters':0,'fullDetail':0,'includeRelations':0});stats['calls']+=1
  text=''.join(x.get('text','') for x in (i.get('result') or {}).get('content',[]));stats['resultCharacters']+=len(text)
  stats['fullDetail']+=int(i.get('arguments',{}).get('detail')=='full');stats['includeRelations']+=int(i.get('arguments',{}).get('includeRelations') is True)
  if i.get('status')=='failed':result['failedTools'].append({'tool':tool,'message':text[:1200]})
  if tool=='get_work_context' and i.get('status')=='completed':
   data=json.loads(text);size=lambda v:len(json.dumps(v,ensure_ascii=False,separators=(',',':')))
   result['contextPayloads'].append({'totalCharacters':len(text),'topLevelCharacters':{k:size(v) for k,v in data.items()},'routingCharacters':{k:size(v) for k,v in data.get('routing',{}).items()},'contextCharacters':{k:size(v) for k,v in data.get('context',{}).items()}})
  if i.get('tool')=='save_revision' and i.get('status')=='completed':
   text=''.join(x.get('text','') for x in (i.get('result') or {}).get('content',[]))
   try:saves.append(json.loads(text))
   except ValueError:pass
 if arm=='fs-K1' and stage=='analysis':
  records=folder/'project/.frontend-system'
  result['analysisRecordsComplete']=(records/'project.md').exists() and bool(list((records/'analysis/flow').glob('*.json'))) and bool(list((records/'analysis/finding').glob('*.json')))
 if arm=='fs-K1' and stage=='plan':
  plans=[]
  for p in (folder/'project/.frontend-system/plans').glob('*/revision.json'):
   r=json.loads(p.read_text());refs=(r.get('evidence') or {}).get('analysisRefs',[])
   valid=bool(refs)
   for ref in refs:
    f=folder/'project/.frontend-system/analysis/history'/(ref['hash']+'.json')
    raw=f.read_bytes() if f.exists() else b''
    record=json.loads(raw)['record'] if raw else {}
    valid=valid and hashlib.sha256(raw).hexdigest()==ref['hash'] and record.get('kind')==ref['kind'] and record.get('data',{}).get('id')==ref['id']
   plans.append(r.get('approved') is False and bool(r.get('evidence')) and valid and any(s.get('hash')==r.get('hash') and s.get('contractDiagnostics')==[] for s in saves))
  result['contractComplete']=any(plans)
 result['deliveryComplete']=a['complete'] and result['contractComplete'] is not False and result.get('analysisRecordsComplete',True)
 return result

def load(root):
 rows=[]
 stages=json.loads((root/'manifest.json').read_text()).get('stages',['analysis','plan'])
 for rep in sorted(root.glob('repeat-*')):
  m=json.loads((rep/'manifest.json').read_text())
  for c in m['cells']:
   for stage in stages:
    folder=rep/c['id']/stage
    if not (folder/'result.json').exists():continue
    r=json.loads((folder/'result.json').read_text());tokens=folder/'tokens.json'
    d=json.loads(tokens.read_text()) if tokens.exists() else None
    row={'id':rep.name+'/'+c['id']+'/'+stage,'repeat':int(rep.name.split('-')[-1]),'case':c['case'],'arm':c['arm'],'stage':stage,
         'threadId':r['threadId'],'seconds':r['elapsedSeconds'],'usage':r['usage'],'trajectoryAvailable':bool(d),
         **audit(folder,c['arm'],stage)}
    if d:
     origins={};previous=None
     for point in d['points']:
      point.update(classify(point['calls']))
      point['inputDelta']=None if previous is None else point['usage']['input_tokens']-previous
      previous=point['usage']['input_tokens']
      categories={origins[x['callId']] for x in point['precedingOutputs'] if x['callId'] in origins}
      point['precedingCategories']=sorted(categories)
      for call in point['calls']:
       if call.get('call_id'):origins[call['call_id']]=point['category']

    row['points']=d['points'] if d else [];row['requests']=len(row['points']) if d else None
    row['afterErrorResponses']=sum(x['afterError'] for x in row['points']) if d else None
    row['categories']={}
    for p in row['points']:
     count=row['categories'].setdefault(p['category'],{'responses':0,'total':0,'uncachedPlusOutput':0})
     count['responses']+=1;count['total']+=p['usage']['total_tokens'];count['uncachedPlusOutput']+=p['uncachedPlusOutput']
    row['meanInput']=statistics.mean(p['usage']['input_tokens'] for p in row['points']) if d else None
    small=[p for p in row['points'] if p['usage']['output_tokens']<=200 and p['usage']['input_tokens']>=40000]
    row['shortResponseLargeContext']={'definition':'output <= 200 and input >= 40000; descriptive, not proof of waste','responses':len(small),'totalTokens':sum(p['usage']['total_tokens'] for p in small)}
    rows.append(row)
 if len({r['threadId'] for r in rows})!=len(rows):raise ValueError('Reused thread')
 return rows

def main():
 ap=argparse.ArgumentParser();ap.add_argument('root',type=Path);a=ap.parse_args();root=a.root.resolve();rows=load(root)
 if not rows:raise ValueError('No completed measurements')
 stages=json.loads((root/'manifest.json').read_text()).get('stages',['analysis','plan'])
 caseStages=[(c,s) for c in ['request','styles'] for s in stages]
 charts=root/'charts';charts.mkdir(exist_ok=True)
 plt.rcParams.update({'font.family':'DejaVu Sans','axes.spines.top':False,'axes.spines.right':False,'axes.grid':True,'grid.alpha':.18,'svg.fonttype':'none'})
 fmt=FuncFormatter(lambda n,_:f'{n/1000:g}k')
 def finish(fig,name):
  fig.tight_layout();fig.savefig(charts/(name+'.svg'));fig.savefig(charts/(name+'.png'),dpi=140);plt.close(fig)
 # Absolute request indices, no time normalization or interpolation across different runs.
 fig,axes=plt.subplots(2,len(stages),figsize=(13,8),squeeze=False)
 for ax,(case,stage) in zip(axes.flat,caseStages):
  for r in rows:
   if (r['case'],r['stage'])!=(case,stage) or not r['points']:continue
   total=0;ys=[0]
   for p in r['points']:total+=p['usage']['total_tokens'];ys.append(total)
   ax.plot(range(len(ys)),ys,color=COLORS[r['arm']],linestyle=['-','--',':'][r['repeat']-1],label=r['arm']+' #'+str(r['repeat'])+(' incomplete' if not r['deliveryComplete'] else ''),alpha=.85)
   if not r['deliveryComplete']:ax.scatter([len(ys)-1],[ys[-1]],marker='x',color=COLORS[r['arm']])
  ax.set(title=case+' / '+stage,xlabel='Model response index',ylabel='Cumulative input + output');ax.yaxis.set_major_formatter(fmt);ax.legend(fontsize=7)
 finish(fig,'cumulative')
 fig,axes=plt.subplots(1,2,figsize=(13,5));groups=[]
 for case in ['request','styles']:
  for stage in ['analysis','plan']:
   for arm in COLORS:
    subset=[r for r in rows if (r['case'],r['stage'],r['arm'])==(case,stage,arm) and r['usage']]
    if not subset:continue
    groups.append({'case':case,'stage':stage,'arm':arm,'n':len(subset),
      'complete':sum(r['deliveryComplete'] for r in subset),
      'total':{'median':statistics.median(r['usage']['total_tokens'] for r in subset),'min':min(r['usage']['total_tokens'] for r in subset),'max':max(r['usage']['total_tokens'] for r in subset)},
      'uncachedPlusOutput':{'median':statistics.median(r['usage']['uncached_input_tokens']+r['usage']['output_tokens'] for r in subset),'min':min(r['usage']['uncached_input_tokens']+r['usage']['output_tokens'] for r in subset),'max':max(r['usage']['uncached_input_tokens']+r['usage']['output_tokens'] for r in subset)},
      'requestsMedian':measured_median(r['requests'] for r in subset if r['requests'] is not None),
      'meanInputMedian':measured_median(r['meanInput'] for r in subset if r['meanInput'] is not None)})
 for ax,key,title in zip(axes,['total','uncachedPlusOutput'],['Total processed tokens','Uncached input + output (not price)']):
  for j,g in enumerate(groups):
   v=g[key];ax.barh(j,v['median'],color=COLORS[g['arm']],alpha=.8)
   ax.errorbar(v['median'],j,xerr=[[v['median']-v['min']],[v['max']-v['median']]],fmt='none',ecolor='#172b3a',capsize=3)
  ax.set_yticks(range(len(groups)),[f"{g['case']} / {g['stage']} / {g['arm']} (done {g['complete']}/{g['n']})" for g in groups],fontsize=8);ax.set_title(title);ax.invert_yaxis();ax.xaxis.set_major_formatter(fmt)
 finish(fig,'distribution')
 fig,axes=plt.subplots(2,len(stages),figsize=(14,10),squeeze=False)
 for ax,(case,stage) in zip(axes.flat,caseStages):
  cats=[c for c in CATEGORIES if any(c in r['categories'] for r in rows if (r['case'],r['stage'])==(case,stage))]
  for i,arm in enumerate(COLORS):
   subset=[r for r in rows if (r['case'],r['stage'],r['arm'])==(case,stage,arm) and r['trajectoryAvailable']]
   if not subset:continue
   values=[statistics.median(r['categories'].get(c,{}).get('total',0) for r in subset) for c in cats]
   ax.barh([j+(i-.5)*.35 for j in range(len(cats))],values,height=.35,color=COLORS[arm],label=arm)
  ax.set_yticks(range(len(cats)),cats,fontsize=8);ax.set_title(case+' / '+stage);ax.invert_yaxis();ax.xaxis.set_major_formatter(fmt);ax.legend(fontsize=8)
 fig.suptitle('Median tokens by requested-operation category (context included; not causal allocation)',fontsize=12)
 finish(fig,'categories')
 fig,axes=plt.subplots(1,2,figsize=(12,5))
 for ax,case in zip(axes,['request','styles']):
  for arm in COLORS:
   for stage,marker in [('analysis','o'),('plan','^')]:
    subset=[r for r in rows if (r['case'],r['arm'],r['stage'])==(case,arm,stage) and r['trajectoryAvailable']]
    if not subset:continue
    ax.scatter([r['requests'] for r in subset],[r['meanInput'] for r in subset],color=COLORS[arm],marker=marker,s=65,label=arm+' / '+stage)
    for r in subset:ax.annotate('#'+str(r['repeat']),(r['requests'],r['meanInput']),xytext=(4,4),textcoords='offset points',fontsize=8)
  ax.set(title=case,xlabel='Number of model responses',ylabel='Mean input tokens per response');ax.yaxis.set_major_formatter(fmt);ax.legend(fontsize=8)
 fig.suptitle('Repeated requests and growing context both contribute to total usage')
 finish(fig,'request-context')
 # Detail plots and compact call evidence are embedded for an offline, single-file report.
 detail=[]
 for j,r in enumerate(rows):
  pts=r['points'];chart=None
  if pts:
   fig,axes=plt.subplots(2,1,figsize=(11,6),sharex=True);xs=[p['index'] for p in pts]
   cached=[p['usage']['cached_input_tokens'] for p in pts];fresh=[p['usage']['input_tokens']-p['usage']['cached_input_tokens'] for p in pts];outputs=[p['usage']['output_tokens'] for p in pts]
   axes[0].bar(xs,cached,label='Cached input',color='#91b8e3');axes[0].bar(xs,fresh,bottom=cached,label='Uncached input',color='#b84318')
   axes[0].bar(xs,outputs,bottom=[x+y for x,y in zip(cached,fresh)],label='Output incl. reasoning',color='#20876b');axes[0].legend(fontsize=8);axes[0].set_ylabel('Tokens per response');axes[0].yaxis.set_major_formatter(fmt)
   total=0;uncached=0;ys=[];zs=[]
   for p in pts:total+=p['usage']['total_tokens'];uncached+=p['uncachedPlusOutput'];ys.append(total);zs.append(uncached)
   axes[1].plot(xs,ys,label='Total');axes[1].plot(xs,zs,label='Uncached + output')
   for ax in axes:
    for p in pts:
     if p['afterError']:ax.axvline(p['index'],color='#a21caf',alpha=.5,linestyle=':')
   axes[1].set(xlabel='Model response index (purple: follows an error signal)',ylabel='Cumulative tokens');axes[1].yaxis.set_major_formatter(fmt);axes[1].legend(fontsize=8)
   fig.suptitle(r['id']+' | delivery '+str(r['deliveryComplete']));name='run-'+str(j+1);finish(fig,name)
   chart='data:image/svg+xml;base64,'+base64.b64encode((charts/(name+'.svg')).read_bytes()).decode()
  detail.append({**{k:v for k,v in r.items() if k!='points'},'chart':chart,'points':[
    {**{k:v for k,v in p.items() if k not in {'calls','responseId'}},'operations': '\n'.join(c['name']+': '+str(c.get('input',c.get('arguments','')))[:550] for c in p['calls'])} for p in pts]})
 manifest=json.loads((root/'manifest.json').read_text())
 summary={'classificationSha256':hashlib.sha256((Path(__file__).parent/'tokens.py').read_bytes()).hexdigest(),'scope':manifest.get('scope','Analysis/planning only. n=3 exploratory. Categories locate spending, not causal tool cost.'),
          'calls':len(rows),'plannedCalls':manifest.get('maxCalls',24),'complete':sum(r['deliveryComplete'] for r in rows),
          'trajectories':sum(r['trajectoryAvailable'] for r in rows),'totalTokens':sum(r['usage']['total_tokens'] for r in rows if r['usage']),
          'uncachedPlusOutput':sum(r['usage']['uncached_input_tokens']+r['usage']['output_tokens'] for r in rows if r['usage']),
          'unknownUsage':sum(r['usage'] is None for r in rows),'groups':groups,
          'rows':[{k:v for k,v in r.items() if k!='points'} for r in rows]}
 (root/'summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
 (root/'context-payloads.json').write_text(json.dumps({'meaning':'Serialized JSON characters, not tokens. Nested totals exclude keys and punctuation.','rows':[{'run':r['id'],**p} for r in rows for p in r['contextPayloads']]},ensure_ascii=False,indent=2)+'\n')
 lines=['# 측정 표 (자동 생성)','', '중앙값 [최솟값–최댓값]. 총 입력은 캐시를 포함합니다. 불완전 실행도 비용에 포함합니다.','',
 '| 프로젝트 | 단계 | 조건 | 전달 완료 | 총 토큰 | 비캐시 입력+출력 | 모델 요청 수 중앙값 | 요청당 평균 입력의 중앙값 |',
 '| --- | --- | --- | ---: | ---: | ---: | ---: | ---: |']
 for g in groups:
  values=[]
  for key in ['total','uncachedPlusOutput']:
   v=g[key];values.append(f"{v['median']:,.0f} [{v['min']:,}–{v['max']:,}]")
  lines.append(f"| {g['case']} | {g['stage']} | {g['arm']} | {g['complete']}/{g['n']} | {' | '.join(values)} | {g['requestsMedian']} | {g['meanInputMedian']:,.0f} |" if g['meanInputMedian'] is not None else f"| {g['case']} | {g['stage']} | {g['arm']} | {g['complete']}/{g['n']} | {' | '.join(values)} | 미확인 | 미확인 |")
 ratio_lines=[]
 for case in ['request','styles']:
  for repeat in range(1,4):
   arms={arm:[r for r in rows if (r['case'],r['repeat'],r['arm'])==(case,repeat,arm)] for arm in COLORS}
   if not all(len(rs)==2 and all(r['usage'] for r in rs) for rs in arms.values()):continue
   totals={arm:sum(r['usage']['total_tokens'] for r in rs) for arm,rs in arms.items()}
   uncached={arm:sum(r['usage']['uncached_input_tokens']+r['usage']['output_tokens'] for r in rs) for arm,rs in arms.items()}
   ratio_lines.append(f"| {case} | {repeat} | {totals['fs-K1']/totals['ordinary']:.2f}× | {uncached['fs-K1']/uncached['ordinary']:.2f}× | {sum(r['deliveryComplete'] for r in arms['fs-K1'])}/2 · {sum(r['deliveryComplete'] for r in arms['ordinary'])}/2 |")
 if ratio_lines:
  lines+=['','## 같은 반복의 FS/일반 AI 비율','','두 단계 비용 합계의 비율입니다. 서로 다른 반복의 최선값을 조합하지 않습니다.','',
   '| 프로젝트 | 반복 | 총 토큰 비율 | 비캐시 입력+출력 비율 | FS/일반 전달 완료 단계 |','| --- | ---: | ---: | ---: | --- |',*ratio_lines]
 lines+=['','## 작업 분류별 관측 비용','','이전 문맥을 포함하는 요청의 비용입니다. 해당 도구만의 인과적 비용이 아닙니다. 혼합 요청은 분할하지 않습니다.','',
 '| 조건 | 작업 분류 | 모델 요청 수 | 총 토큰 | 비캐시 입력+출력 |','| --- | --- | ---: | ---: | ---: |']
 for arm in COLORS:
  bins={}
  for r in rows:
   if r['arm']!=arm:continue
   for cat,values in r['categories'].items():
    for key,v in values.items():bins.setdefault(cat,{}).setdefault(key,0);bins[cat][key]+=v
  for cat,v in sorted(bins.items(),key=lambda kv:-kv[1]['total']):lines.append(f"| {arm} | {cat} | {v['responses']} | {v['total']:,} | {v['uncachedPlusOutput']:,} |")
 (root/'tables.md').write_text('\n'.join(lines)+'\n')

 with (root/'requests.csv').open('w') as f:
  writer=csv.writer(f);writer.writerow(['run','response','timestamp','category','input','cached_input','output','reasoning_subset','after_error'])
  for r in rows:
   for p in r['points']:writer.writerow([r['id'],p['index'],p['timestamp'],p['category'],*[p['usage'][k] for k in ['input_tokens','cached_input_tokens','output_tokens','reasoning_output_tokens']],p['afterError']])
 overview=''.join('<img alt="'+n+'" src="data:image/svg+xml;base64,'+base64.b64encode((charts/(n+'.svg')).read_bytes()).decode()+'">' for n in ['cumulative','distribution','request-context','categories'])
 template=(Path(__file__).parent/'report.html').read_text()
 data=json.dumps(detail,ensure_ascii=False).replace('<','\\u003c').replace('&','\\u0026')
 if stages==['plan']:
  template=template.replace('각 조건 3회, 분석과 변경 후 계획을 별도 새 세션에서 수행합니다.', 'FS 계획만 각 프로젝트 3회, 기존 초기 분석을 그대로 가져와 새 세션에서 수행합니다. 가져온 분석의 사용량은 포함하지 않습니다.')
 (root/'report.html').write_text(template.replace('OVERVIEW_IMAGES',overview).replace('REPORT_DATA',data).replace('RUN_STATUS',html.escape(f"{len(rows)}/{summary['plannedCalls']}회 수집 · 전달 완료 {summary['complete']} · 토큰 로그 대조 {summary['trajectories']}")))
 print(json.dumps({k:v for k,v in summary.items() if k not in ['rows','groups']}))
if __name__=='__main__':main()
