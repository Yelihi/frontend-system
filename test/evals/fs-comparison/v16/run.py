#!/usr/bin/env python3
"""Replay prior decisions in fresh contexts; reuse the established isolated executor."""
import argparse
from concurrent.futures import ThreadPoolExecutor
import importlib.util
import json
from pathlib import Path
import random
import shutil
import subprocess
import tempfile

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('v15', HERE.parent / 'v15/run.py')
v15 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v15)
ex, v10, REPO = v15.ex, v15.v10, v15.REPO
save, digest = v15.save, v15.digest
ARMS = ['raw', 'fs']


def prompt(arm):
    workflow = ('Use the supplied FS procedure in procedures/pr-feedback.md. FS knowledge search is available '
                'through node search.mjs "query"; ordinary file search is also available. ' if arm == 'fs' else '')
    return '''Review task.md and the relevant src/ code and prior decisions/ records. Both code and comments can be wrong. The same complete published knowledge library is in learning/; inspect relevant evidence only. Use the current requirements and applicable confirmed decisions. Distinguish scoped preferences from general facts; ask only an unresolved material question. Do not edit, install, use network, launch another model or wait for user input. A small local counterexample may run without writing files.
''' + workflow + '''Return one JSON object without fences, at most 350 words of prose:
{"action":"change|keep|ask","disposition":"reusable|project-only|needs-context|rejected","reason":"...","reusedDecisionIds":[],"exceptionReason":null,"questions":[],"sharedCandidate":null,"evidence":[{"path":"...","quote":"exact inspected text"}],"limits":"..."}.
Use only actual decision IDs. A sharedCandidate, when justified, states conditions and exceptions. Cite code and decision/evidence records supporting your reasoning. Do not claim unrun verification. Do not equate quoting text with verifying a claim.'''


def audit(project, target):
    try:
        answer = json.loads((target / 'final.md').read_text())
        if answer.get('action') not in ['change', 'keep', 'ask'] or answer.get('disposition') not in ['reusable', 'project-only', 'needs-context', 'rejected']:
            raise ValueError('Invalid verdict')
        if not isinstance(answer.get('questions'), list) or not isinstance(answer.get('reusedDecisionIds'), list):
            raise ValueError('Missing questions or reusedDecisionIds')
        checks = []
        for citation in answer['evidence']:
            path = (project / citation['path']).resolve()
            if not path.is_relative_to(project.resolve()):
                raise ValueError('Citation escapes input')
            quote = citation['quote']
            checks.append(bool(quote.strip()) and quote in path.read_text())
        return {'answer':answer, 'exactCitations':bool(checks) and all(checks),
                'questionCount':len(answer['questions']), 'semanticStatus':'requires-review'}
    except (ValueError, KeyError, TypeError, OSError) as error:
        return {'error':str(error), 'semanticStatus':'unverified'}


def prepare(out, model, repeats):
    out.mkdir(parents=True, exist_ok=False)
    root = Path(tempfile.mkdtemp(prefix='fs-v16-')).resolve()
    helper = root / 'search.mjs'
    subprocess.run([str(REPO / 'node_modules/.bin/esbuild'), str(HERE.parent / 'v15/search.mjs'),
                    '--bundle', '--platform=node', '--format=esm', '--outfile=' + str(helper)], check=True, capture_output=True)
    cases = json.loads((HERE / 'cases.json').read_text())
    cells = []
    for repeat in range(repeats):
        for case in cases:
            for arm in ARMS:
                ident = f"{case['id']}-{arm}-{repeat + 1}"
                project = root / ident / 'project'
                project.mkdir(parents=True)
                for name, body in case['files'].items():
                    target = project / name
                    target.parent.mkdir(parents=True, exist_ok=True)
                    target.write_text(body)
                shutil.copytree(REPO / 'references/learned', project / 'learning')
                if arm == 'fs':
                    shutil.copy(helper, project / 'search.mjs')
                    (project / 'procedures').mkdir()
                    shutil.copy(REPO / 'references/workflows/pr-feedback.md', project / 'procedures/pr-feedback.md')
                cells.append({'id':ident, 'case':case['id'], 'arm':arm, 'repeat':repeat+1,
                              'project':str(project), 'inputs':ex.inventory(project)})
    random.Random(1601).shuffle(cells)
    for arm in ARMS:
        cell = next(c for c in cells if c['arm'] == arm)
        sibling = next(c for c in cells if c['id'] != cell['id'])
        paths = {'own':str(Path(cell['project']) / 'task.md'), 'rubric':str(HERE / 'cases.json'),
                 'sibling':str(Path(sibling['project']) / 'task.md'), 'personal':str(Path.home() / '.codex/config.toml')}
        code = 'import{readFile}from"node:fs/promises";const o={};for(const[k,p]of Object.entries(' + json.dumps(paths) + ')){try{await readFile(p);o[k]="read"}catch{o[k]="denied"}}console.log(JSON.stringify(o));'
        result = v10.restricted(Path(cell['project']), 'ordinary', code)
        save(out / f'isolation-{arm}.json', {'exitCode':result.returncode, 'stdout':result.stdout, 'stderr':result.stderr})
        if result.returncode or json.loads(result.stdout) != {'own':'read','rubric':'denied','sibling':'denied','personal':'denied'}:
            raise RuntimeError('Isolation failed; no model calls')
    for name in ['run.py','cases.json','protocol.md']:
        shutil.copy(HERE / name, out / ('frozen-' + name))
    shutil.copy(REPO / 'references/workflows/pr-feedback.md', out / 'frozen-pr-feedback.md')
    save(out / 'manifest.json', {'model':model, 'reasoning':'medium', 'timeout':180, 'repeats':repeats,
        'scope':'PR feedback procedure + production knowledge search replay; not full plugin or live human study',
        'cells':cells, 'prompts':{arm:prompt(arm) for arm in ARMS},
        'inputs':{name:digest(HERE / name) for name in ['run.py','cases.json','protocol.md']},
        'executorHash':digest(Path(ex.__file__)), 'configHash':digest(Path(v10.__file__)),
        'procedureHash':digest(REPO / 'references/workflows/pr-feedback.md')})
    print(f'Prepared {len(cells)} isolated calls: {out}', flush=True)


def run_cell(cell, out, manifest):
    project, target = Path(cell['project']), out / cell['id']
    if ex.inventory(project) != cell['inputs']:
        raise RuntimeError('Inputs changed: ' + cell['id'])
    print('Running ' + cell['id'], flush=True)
    result = ex.invoke(project, target, manifest['model'], manifest['prompts'][cell['arm']],
                       v10.configs(project,'ordinary'), manifest['timeout'], ex.runtime_env())
    row = audit(project, target)
    row['inputsUnchanged'] = ex.inventory(project) == cell['inputs']
    row['complete'] = bool(result['exitCode'] == 0 and not result['timedOut'] and result['usage']
                           and result['completedTurns'] == 1 and row['inputsUnchanged'] and not row.get('error')
                           and not ex.environment_failure(result,target))
    save(target / 'audit.json',row)
    print('Finished ' + cell['id'] + ': ' + ('complete' if row['complete'] else 'unverified'),flush=True)


def summarize(out, manifest):
    rows = []
    for cell in manifest['cells']:
        target = out / cell['id']
        if (target / 'audit.json').exists():
            rows.append({k:cell[k] for k in ['id','case','arm','repeat']} |
                        {'result':json.loads((target / 'result.json').read_text()), 'audit':json.loads((target / 'audit.json').read_text())})
    threads = [r['result']['threadId'] for r in rows]
    groups = {}
    for arm in ARMS:
        selected = [r for r in rows if r['arm']==arm]
        usage = [r['result']['usage'] for r in selected if r['result']['usage']]
        groups[arm] = {'calls':len(selected),'complete':sum(r['audit']['complete'] for r in selected),
            'totalTokens':sum(u['total_tokens'] for u in usage),
            'uncachedPlusOutput':sum(u['uncached_input_tokens']+u['output_tokens'] for u in usage if u['uncached_input_tokens'] is not None),
            'unknownUsage':len(selected)-len(usage)}
    save(out/'summary.json',{'scope':manifest['scope'],'groups':groups,'uniqueThreads':len(set(threads))==len(threads),
         'rows':rows,'semanticStatus':'requires-review; enums and exact citations are not a quality score'})
    print(json.dumps(groups),flush=True)


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('phase',choices=['prepare','run','summarize'])
    parser.add_argument('--output',type=Path,required=True)
    parser.add_argument('--model',default='gpt-6-sol')
    parser.add_argument('--repeats',type=int,choices=[1,2,3],default=1)
    args=parser.parse_args();out=args.output.resolve()
    if args.phase=='prepare':
        prepare(out,args.model,args.repeats);return
    manifest=json.loads((out/'manifest.json').read_text())
    if args.phase=='run':
        if any(digest(HERE/name)!=expected for name,expected in manifest['inputs'].items()) or digest(Path(ex.__file__))!=manifest['executorHash'] or digest(Path(v10.__file__))!=manifest['configHash']:
            raise RuntimeError('Frozen runner changed')
        cells=[c for c in manifest['cells'] if not (out/c['id']).exists()]
        with ThreadPoolExecutor(max_workers=2) as pool:
            list(pool.map(lambda cell:run_cell(cell,out,manifest),cells))
    summarize(out,manifest)


if __name__=='__main__':
    main()
