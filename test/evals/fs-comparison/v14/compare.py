"""Compare complete frozen cohorts, including failures; no new model calls."""
import argparse,json,statistics
from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

def metrics(rows):
 if any(r['usage'] is None or r['requests'] is None for r in rows):
  raise ValueError('Unknown usage cannot be compared as zero')
 inputs=sum(r['usage']['input_tokens'] for r in rows)
 requests=sum(r['requests'] for r in rows)
 return {'totalTokens':sum(r['usage']['total_tokens'] for r in rows),
  'uncachedPlusOutput':sum(r['usage']['uncached_input_tokens']+r['usage']['output_tokens'] for r in rows),
  'requests':requests,'meanInput':inputs/requests,'complete':sum(r['deliveryComplete'] for r in rows),
  'mcpErrors':sum(r['mcpErrors'] for r in rows)}

def compare(before,after):
 assert len(before)==len(after) and len(before) in [6,24], 'Require complete cohorts or six FS planning replays'
 if len(before)==6:assert all(r['arm']=='fs-K1' and r['stage']=='plan' for r in before+after)
 assert {r['id'] for r in before}=={r['id'] for r in after}
 for rows in [before,after]:
  keys={(r['case'],r['stage'],r['arm']) for r in rows}
  assert all({r['repeat'] for r in rows if (r['case'],r['stage'],r['arm'])==key}=={1,2,3} for key in keys)
 result={}
 for arm in sorted({r['arm'] for r in before}):
  a=metrics([r for r in before if r['arm']==arm]);b=metrics([r for r in after if r['arm']==arm])
  result[arm]={'before':a,'after':b,'changePercent':{k:100*(b[k]/a[k]-1) if a[k] else None for k in a}}
 return result

def main():
 parser=argparse.ArgumentParser();parser.add_argument('before',type=Path);parser.add_argument('after',type=Path);parser.add_argument('--plan-only',action='store_true');args=parser.parse_args()
 before=json.loads((args.before/'summary.json').read_text())['rows'];after=json.loads((args.after/'summary.json').read_text())['rows']
 if args.plan_only:
  before=[r for r in before if r['arm']=='fs-K1' and r['stage']=='plan'];after=[r for r in after if r['arm']=='fs-K1' and r['stage']=='plan']
 data=compare(before,after)
 arms=list(data)
 # A cohort compared with itself must retain every failed delivery and produce zero usage deltas.
 assert all(v==0 for r in compare(before,before).values() for k,v in r['changePercent'].items() if k in ['totalTokens','uncachedPlusOutput','requests','meanInput'])
 data['limits']='Sequential before/after cohorts, n=3 per case/stage/arm; no causal claim. Failures included. Semantic review is separate.'
 data['baseline']=str(args.before.resolve());data['treatment']=str(args.after.resolve())
 (args.after/'comparison.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
 lines=['# '+('기존 분석서 보존 지침의 계획 단계 비교' if args.plan_only else '기록 호출 통합 전후 비교'),'','선택한 범위의 전체 합계입니다. 실패도 포함합니다. 총 입력에는 캐시가 포함됩니다.','',
 '| 조건 | 지표 | 수정 전 | 수정 후 | 변화 |','| --- | --- | ---: | ---: | ---: |']
 labels={'totalTokens':'총 입력+출력','uncachedPlusOutput':'비캐시 입력+출력','requests':'모델 응답 수','meanInput':'응답당 평균 입력','complete':'구조적 전달 완료','mcpErrors':'MCP 오류'}
 for arm in arms:
  r=data[arm]
  for k,label in labels.items():
   delta=r['changePercent'][k];change='—' if k in ['complete','mcpErrors'] or delta is None else f'{delta:+.1f}%'
   lines.append(f"| {arm} | {label} | {r['before'][k]:,.0f} | {r['after'][k]:,.0f} | {change} |")
 lines+=['','## FS 반복 분포','','중앙값 [최솟값–최댓값]. 서로 다른 반복의 최선값을 선택하지 않습니다.','',
 '| 프로젝트/단계 | 지표 | 수정 전 | 수정 후 |','| --- | --- | --- | --- |']
 fig,axes=plt.subplots(1,2,figsize=(13,5))
 groups=[(c,s) for c in ['request','styles'] for s in (['plan'] if args.plan_only else ['analysis','plan'])]
 for metric,ax in zip(['totalTokens','requests'],axes):
  for j,(case,stage) in enumerate(groups):
   rendered=[]
   for i,rows in enumerate([before,after]):
    subset=[r for r in rows if (r['case'],r['stage'],r['arm'])==(case,stage,'fs-K1')];assert len(subset)==3
    values=[r['usage']['total_tokens'] if metric=='totalTokens' else r['requests'] for r in subset];med=statistics.median(values)
    rendered.append(f'{med:,.0f} [{min(values):,}–{max(values):,}]')
    ax.bar(j+(i-.5)*.35,med,width=.35,color=['#2563eb','#20876b'][i],label=['Before','After'][i] if j==0 else None)
    ax.errorbar(j+(i-.5)*.35,med,yerr=[[med-min(values)],[max(values)-med]],fmt='none',ecolor='#182b3c',capsize=3)
   lines.append(f'| {case}/{stage} | {labels[metric]} | '+ ' | '.join(rendered)+' |')
  ax.set_xticks(range(len(groups)),[c+'\n'+s for c,s in groups]);ax.set_title('FS '+metric+' (median, min–max)');ax.legend();ax.grid(axis='y',alpha=.2)
 fig.tight_layout()
 for ext in ['png','svg']:fig.savefig(args.after/('comparison.'+ext),dpi=140)
 plt.close(fig)
 lines+=['','![FS 전후 분포](comparison.png)','','FS 계획만 재실행한 부분 비교입니다. 초기 분석의 토큰을 새 사용량으로 합산하지 않습니다.' if args.plan_only else '일반 AI도 같은 시기에 다시 실행한 대조군입니다.', '전후 실험은 시간 순서대로 실행했으므로 제공자 캐시·샘플링 변화와 수정 효과를 완전히 분리할 수 없습니다. 완료 수는 구조 검사이며 설계 정확도 점수가 아닙니다.','']
 (args.after/'comparison.md').write_text('\n'.join(lines))
 print(json.dumps(data,ensure_ascii=False))

if __name__=='__main__':main()
