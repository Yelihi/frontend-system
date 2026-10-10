"""Aggregate explicit semantic adjudications; never grade quality from model enums."""
import argparse
import hashlib
import json
from pathlib import Path


def answer_hash(answer):
    return hashlib.sha256(json.dumps(answer,ensure_ascii=False,sort_keys=True).encode()).hexdigest()


def score(cases, cells, rows, review):
    if not review.get('reviewer') or not review.get('limitations'):
        raise ValueError('Identify the actual reviewer and limits')
    expected={c['id']:c for c in cells}; observed={r['id']:r for r in rows}
    judgments=review['judgments']
    if len(expected)!=len(cells) or len(observed)!=len(rows) or len({j['id'] for j in judgments})!=len(judgments):
        raise ValueError('Duplicate cell/result/judgment')
    annotations={j['id']:j for j in judgments}
    if set(annotations)-set(expected):raise ValueError('Unknown review cell')
    by_case={case['id']:case for case in cases}; groups={}
    for ident,cell in expected.items():
        case=by_case[cell['case']];row=observed.get(ident);j=annotations.get(ident)
        g=groups.setdefault(cell['arm'],{'repeatedQuestions':0,'repeatEligible':0,'repeatUnverified':0,
            'reuseCorrect':0,'reuseEligible':0,'reuseUnverified':0,'exceptionCorrect':0,'exceptionEligible':0,
            'exceptionUnverified':0,'guardrailCorrect':0,'guardrailEligible':0,'guardrailUnverified':0})
        valid=bool(row and row['audit'].get('complete') and row['audit'].get('exactCitations') and j)
        if j:
            if not row or j.get('answerHash')!=answer_hash(row['audit'].get('answer')):raise ValueError('Stale adjudication: '+ident)
            if not j.get('rationale'):raise ValueError('Explain the semantic judgment')
            for field in ['reuseCorrect','exceptionCorrect','guardrailCorrect']:
                if j.get(field) is not None and type(j[field]) is not bool:raise ValueError('Expected boolean or null: '+field)
            count=j.get('repeatedQuestions')
            if count is not None and (type(count) is not int or count<0 or count>len(row['audit']['answer']['questions'])):
                raise ValueError('Invalid repeated question count')
        if case['eligibleRepeat']:
            g['repeatEligible']+=1
            if valid and j.get('repeatedQuestions') is not None:g['repeatedQuestions']+=j['repeatedQuestions']
            else:g['repeatUnverified']+=1
        for prefix,eligible in [('reuse',bool(case['reuse'])),('exception',case['exception']),('guardrail',case['id'] in ['freeze-reject','vue-unresolved','error-reusable','preference-not-universal'])]:
            if not eligible:continue
            g[prefix+'Eligible']+=1
            value=j.get(prefix+'Correct') if valid else None
            if value is None:g[prefix+'Unverified']+=1
            elif value:g[prefix+'Correct']+=1
    return {'groups':groups,'reviewer':review['reviewer'],'limitations':review['limitations'],
            'authority':'Semantically adjudicated synthetic replay, not independent real-user effectiveness'}


def main():
    parser=argparse.ArgumentParser();parser.add_argument('output',type=Path);parser.add_argument('reviews',type=Path)
    args=parser.parse_args();load=lambda path:json.loads(path.read_text())
    result=score(load(args.output/'frozen-cases.json'),load(args.output/'manifest.json')['cells'],
                 load(args.output/'summary.json')['rows'],load(args.reviews))
    print(json.dumps(result,ensure_ascii=False,indent=2))


if __name__=='__main__':main()
