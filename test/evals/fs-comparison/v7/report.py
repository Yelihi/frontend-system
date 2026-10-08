#!/usr/bin/env python3
"""Read-only comparison including aborted arms absent from summary.journeys."""
import argparse
import json
from pathlib import Path

def read(root,path):
    target=(root/path).resolve()
    if not target.is_relative_to(root.resolve()):raise ValueError('Artifact escapes result root')
    return json.loads(target.read_text())

def analyze(root):
    summary=read(root,Path('summary.json'))
    manifest=read(root,Path('manifest.json'))
    rows=[]
    for case in manifest['scenario']['cases']:
        for arm in ['plain','fs']:
            directory=root/f"{case['id']}-{arm}"
            records=[read(root,path.relative_to(root)) for path in sorted(directory.glob('*/*/record.json'))]
            work=[r for r in records if r['phase']=='work']
            invocations=[r['invocation'] for r in records]
            complete=bool(work) and {'prepare','work'}.issubset(r['phase'] for r in records) and all(i.get('completedTurns')==1 and i.get('exitCode')==0 and not i.get('timedOut') for i in invocations)
            journey=next((j for j in summary.get('journeys',[]) if j['case']==case['id'] and j['arm']==arm),{})
            final=work[-1]['grade'] if work else {}
            graded=final.get('status')=='graded'
            checks=final.get('results',[])
            usages=[i.get('usage') for i in invocations]
            usage_complete=complete and all(not i.get('errors') for i in invocations) and all(u is not None and all(u.get(k) is not None for k in ['input_tokens','cached_input_tokens','output_tokens','total_tokens']) for u in usages)
            reported=[u['total_tokens'] for u in usages if u and u.get('total_tokens') is not None]
            errors=[e for i in invocations for e in i.get('errors',[])]
            rows.append({'case':case['id'],'arm':arm,'status':'completed' if complete else 'incomplete' if records else 'not-run',
                'eligible':journey.get('eligible',False),'workflow':journey.get('workflow','unverified'),
                'firstPass':work[0]['grade'].get('eligible') if work and work[0]['grade'].get('status')=='graded' else None,
                'grades':{prefix:{'passed':sum(c['status']=='passed' for c in checks if c['id'].startswith(prefix)), 'total':sum(c['id'].startswith(prefix) for c in checks)} if graded else None for prefix in ['F','S','Q','N']},
                'totalTokens':sum(u['total_tokens'] for u in usages) if usage_complete else None,
                'uncachedInput':sum(u['input_tokens']-u['cached_input_tokens'] for u in usages) if usage_complete else None,
                'outputTokens':sum(u['output_tokens'] for u in usages) if usage_complete else None,
                'reportedPartialTokens':sum(reported) if reported and not usage_complete else None,
                'seconds':round(sum(i['elapsedSeconds'] for i in invocations),3) if records else None,
                'externalRepairs':max(0,len(work)-1) if work else None,'errors':errors,
                'mcpCalls':len(journey.get('trace',[])) if journey else None,
                'mcpErrors':sum(bool(t.get('error')) for t in journey.get('trace',[])) if journey else None})
    return {'result':root.name,'manifestHash':summary['manifestHash'],'runnerStatus':summary['status'],'modelCalls':summary['modelCalls'],'rows':rows,
        'limits':'An incomplete arm has no total cost/grade. Partial reported tokens and seconds until failure are separate observations. Counts are finite contract checks, not universal code quality.'}

def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('results',nargs='+',type=Path);args=parser.parse_args()
    print(json.dumps({'runs':[analyze(path.resolve()) for path in args.results]},ensure_ascii=False,indent=2))
if __name__=='__main__':main()
