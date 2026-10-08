#!/usr/bin/env python3
"""Read-only accounting; incomplete stages keep unknown costs and grades."""
import argparse
import json
from pathlib import Path

ARMS=['ordinary','informed','fs']
STAGES=['initial','variants','defaults']


def analyze(root):
    summary=json.loads((root/'summary.json').read_text()) if (root/'summary.json').exists() else {}
    journeys={(j['arm'],j['stage']):j for j in summary.get('journeys',[])}
    rows=[]
    for arm in ARMS:
        for stage in STAGES:
            folder=root/arm/stage
            records=[]
            for phase in ['prepare','work']:
                for attempt in range(2 if phase=='work' else 1):
                    path=folder/phase/str(attempt)/'record.json'
                    if not path.exists():continue
                    if path.is_symlink() or not path.resolve().is_relative_to(root.resolve()):raise ValueError('Artifact escaped the result directory')
                    records.append(json.loads(path.read_text()))
            if not records:continue
            journey=journeys.get((arm,stage))
            complete=bool(journey and journey.get('eligible'))
            known=[r['invocation']['usage'] for r in records if r['invocation'].get('usage')]
            usage_known=len(known)==len(records)
            total=sum(u['total_tokens'] for u in known) if usage_known else None
            uncached=sum(u['input_tokens']-u['cached_input_tokens']+u['output_tokens'] for u in known) if usage_known and all(u.get('cached_input_tokens') is not None for u in known) else None
            work=[r for r in records if r['phase']=='work']
            grade=work[-1]['grade'].get('planCompliance') if work else None
            first=work[0]['grade'].get('planCompliance') if work else None
            # A pending work phase is not a completed stage, even if preparation has usage.
            stage_finished=bool(journey)
            trace=journey.get('trace',[]) if journey else []
            rows.append({'arm':arm,'stage':stage,'eligible':complete,'stageRecorded':stage_finished,
                'firstGrade':first,'finalGrade':grade,'workflow':journey.get('workflow') if journey else None,
                'totalTokens':total if stage_finished else None,'uncachedInputPlusOutput':uncached if stage_finished else None,
                'reportedTokenLowerBound':sum(u['total_tokens'] for u in known),
                'seconds':sum(r['invocation']['elapsedSeconds'] for r in records), 'timeScope':'recorded calls; unfinished calls may be absent',
                'calls':len(records),'repairs':max(0,len(work)-1),
                'mcpCalls':len(trace) if journey else None,'mcpErrors':sum(bool(t['error']) for t in trace) if journey else None,
                'threadIds':sorted({r['invocation']['threadId'] for r in records if r['invocation'].get('threadId')})})
    totals=[]
    for arm in ARMS:
        selected=[r for r in rows if r['arm']==arm]
        finished=len(selected)==3 and all(r['stageRecorded'] for r in selected)
        totals.append({'arm':arm,'allStagesRecorded':finished,'allStagesEligible':finished and all(r['eligible'] for r in selected),'stagesRecorded':len(selected),
            'totalTokens':sum(r['totalTokens'] for r in selected) if finished and all(r['totalTokens'] is not None for r in selected) else None,
            'uncachedInputPlusOutput':sum(r['uncachedInputPlusOutput'] for r in selected) if finished and all(r['uncachedInputPlusOutput'] is not None for r in selected) else None,
            'reportedTokenLowerBound':sum(r['reportedTokenLowerBound'] for r in selected),
            'seconds':sum(r['seconds'] for r in selected) if finished else None})
    return {'manifestHash':summary.get('manifestHash'),'status':summary.get('status','running'),
        'rows':rows,'totals':totals,'limits':'Task-contract scores, not hidden preference obedience. Ordinary vs informed measures document-location guidance; informed vs FS adds workflow. Incomplete cumulative costs remain unknown. No statistical superiority from one run.'}


def markdown(report):
    lines=['# v8 actual comparison','','| Arm | Stage | First / final | Eligible | Tokens | Uncached input + output | Seconds | MCP errors |',
        '| --- | --- | --- | --- | ---: | ---: | ---: | ---: |']
    def score(value):return f"{value['satisfied']}/{value['total']}" if value else 'unknown'
    for r in report['rows']:
        lines.append(f"| {r['arm']} | {r['stage']} | {score(r['firstGrade'])} / {score(r['finalGrade'])} | {r['eligible']} | {r['totalTokens']} | {r['uncachedInputPlusOutput']} | {r['seconds']:.3f} | {r['mcpErrors']} |")
    lines+=['','| Arm | All 3 eligible | Cumulative tokens | Uncached input + output | Seconds |','| --- | --- | ---: | ---: | ---: |']
    for r in report['totals']:lines.append(f"| {r['arm']} | {r['allStagesEligible']} | {r['totalTokens']} | {r['uncachedInputPlusOutput']} | {r['seconds']} |")
    return '\n'.join(lines+['',report['limits'],''])

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('result',type=Path);args=parser.parse_args()
    report=analyze(args.result)
    (args.result/'analysis.json').write_text(json.dumps(report,indent=2)+'\n')
    (args.result/'analysis.md').write_text(markdown(report))
    print(markdown(report))
