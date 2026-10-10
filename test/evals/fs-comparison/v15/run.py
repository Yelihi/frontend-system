#!/usr/bin/env python3
"""Bounded, isolated decision diagnostic using the existing measured Codex executor."""
import argparse
from concurrent.futures import ThreadPoolExecutor
import hashlib
import importlib.util
import json
import random
import shutil
import subprocess
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('v10', HERE.parent / 'v10/run.py')
v10 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v10)
ex = v10.v9.executor
REPO = v10.REPO
ARMS = ['ordinary', 'raw', 'fs-search', 'oracle']


def save(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def prompt(arm):
    access = {
        'ordinary': 'No additional knowledge library is supplied. If a needed private policy is unavailable, say so rather than inventing it.',
        'raw': 'The complete published knowledge library and metadata index are in learning/. Use ordinary file search to consult relevant evidence.',
        'fs-search': 'The same complete published knowledge library and metadata index are in learning/. FS search is available: node search.mjs "query". It returns up to five actual FS candidates and full verified reference windows. You may also use ordinary file search.',
        'oracle': 'Selected relevant published references are in learning/. These are evidence, not a supplied decision; check their conditions and exceptions.',
    }[arm]
    return '''Read task.md, owner.md and src/view.tsx. Review only the proposed scoped change. Decide change, keep, or ask; consider keeping existing code and the cost of alternatives. Apply current owner decisions, distinguish facts from inference, and ask only material unresolved questions. Use targeted reads; do not dump the entire knowledge library. An exact quote proves where text occurs, not that it supports your conclusion.
''' + access + '''
Do not edit source, install dependencies, run application code, use network, launch other AI, or wait for user input. Stop with a final JSON object (no Markdown fences), about 250 words of prose maximum:
{"action":"change|keep|ask","reason":"...","alternative":"...","question":null,"evidence":[{"path":"owner.md","quote":"exact text"},{"path":"src/view.tsx","quote":"exact text"}],"knowledge":[{"path":"learning/reference.md","quote":"exact supporting text"}],"limits":"..."}.
question may be a string. knowledge may be empty if none was available or relevant. Cite only inspected files. Do not claim unrun verification or universal rules from conditional recommendations.'''


def audit_answer(project, target, case, arm):
    try:
        answer = json.loads((target / 'final.md').read_text())
        if answer.get('action') not in {'change', 'keep', 'ask'}:
            raise ValueError('Invalid action')
        citations = []
        for kind in ['evidence', 'knowledge']:
            if not isinstance(answer.get(kind), list):
                raise ValueError('Missing citation array: ' + kind)
            for citation in answer[kind]:
                path = (project / citation['path']).resolve()
                if not path.is_relative_to(project.resolve()):
                    raise ValueError('Citation escapes project')
                quote = citation['quote']
                citations.append({'kind':kind, 'path':citation['path'], 'exact':bool(quote.strip()) and quote in path.read_text()})
        expected = answer['action'] in case['allowedActions']
        missing_private_policy = arm == 'ordinary' and case['id'] == 'style-adopted' and answer['action'] == 'ask'
        return {'answer':answer, 'actionMatches':expected, 'safeMissingPolicy':missing_private_policy,
                'citationChecks':citations, 'exactCitations':bool(citations) and all(c['exact'] for c in citations),
                'semanticStatus':'requires-human-review'}
    except (OSError, ValueError, KeyError, TypeError) as error:
        return {'error':str(error), 'semanticStatus':'unverified'}


def prepare(out, model):
    out.mkdir(parents=True, exist_ok=False)
    root = Path(tempfile.mkdtemp(prefix='fs-v15-')).resolve()
    cases = json.loads((HERE / 'cases.json').read_text())
    corpus = REPO / 'references/learned'
    index = json.loads((corpus / 'index.json').read_text())
    helper = root / 'search.mjs'
    subprocess.run([str(REPO / 'node_modules/.bin/esbuild'), str(HERE / 'search.mjs'), '--bundle',
                    '--platform=node', '--format=esm', '--outfile=' + str(helper)], check=True, capture_output=True)
    cells = []
    for case in cases:
        for arm in ARMS:
            ident = case['id'] + '-' + arm
            project = root / ident / 'project'
            project.mkdir(parents=True)
            for path, body in case['files'].items():
                target = project / path
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_text(body)
            (project / 'task.md').write_text(case['request'])
            if arm in {'raw','fs-search'}:
                shutil.copytree(corpus, project / 'learning')
            elif arm == 'oracle':
                (project / 'learning').mkdir()
                for entry in index['entries']:
                    if entry['id'] in case['references']:
                        shutil.copy(corpus / entry['path'], project / 'learning' / entry['path'])
            if arm == 'fs-search':
                shutil.copy(helper, project / 'search.mjs')
            cells.append({'id':ident, 'case':case['id'], 'arm':arm, 'project':str(project), 'inputs':ex.inventory(project)})
    random.Random(1501).shuffle(cells)
    # Probe the same sandbox used by all model shells before any model call.
    probes = []
    for arm in ARMS:
        cell = next(c for c in cells if c['arm'] == arm)
        sibling = next(c for c in cells if c['id'] != cell['id'])
        paths = {'own':str(Path(cell['project']) / 'owner.md'), 'rubric':str(HERE / 'cases.json'),
                 'sibling':str(Path(sibling['project']) / 'owner.md'), 'personal':str(Path.home() / '.codex/config.toml')}
        source = 'import {readFile} from "node:fs/promises";const out={};for(const[k,p] of Object.entries(' + json.dumps(paths) + ')){try{await readFile(p);out[k]="read"}catch{out[k]="denied"}}console.log(JSON.stringify(out));'
        result = v10.restricted(Path(cell['project']), 'ordinary', source)
        row = {'arm':arm, 'exitCode':result.returncode, 'stdout':result.stdout, 'stderr':result.stderr}
        probes.append(row)
        save(out / 'isolation.json', probes)
        if result.returncode or json.loads(result.stdout) != {'own':'read','rubric':'denied','sibling':'denied','personal':'denied'}:
            raise RuntimeError('Isolation failed; no model calls')
    for name in ['cases.json','protocol.md','run.py','search.mjs','retrieval-cases.json']:
        shutil.copy(HERE / name, out / ('frozen-' + name))
    shutil.copytree(corpus, out / 'frozen-corpus')
    shutil.copy(helper, out / 'frozen-search.mjs')
    save(out / 'manifest.json', {'model':model, 'reasoning':'medium', 'timeout':180, 'arms':ARMS,
        'scope':'FS production search component, not full plugin workflow', 'cells':cells,
        'inputs':{name:digest(HERE / name) for name in ['cases.json','protocol.md','run.py','search.mjs']},
        'executorHash':digest(Path(ex.__file__)), 'configHash':digest(Path(v10.__file__)),
        'corpus':ex.inventory(corpus), 'searchHash':digest(helper), 'prompts':{arm:prompt(arm) for arm in ARMS}})
    print('Prepared ' + str(out), flush=True)


def run_cell(cell, out, manifest, cases):
    project = Path(cell['project'])
    target = out / cell['id']
    if ex.inventory(project) != cell['inputs']:
        raise RuntimeError('Input changed: ' + cell['id'])
    print('Running ' + cell['id'], flush=True)
    result = ex.invoke(project, target, manifest['model'], manifest['prompts'][cell['arm']],
                       v10.configs(project, 'ordinary'), manifest['timeout'], ex.runtime_env())
    audit = audit_answer(project, target, cases[cell['case']], cell['arm'])
    audit['inputsUnchanged'] = ex.inventory(project) == cell['inputs']
    audit['environmentFailure'] = ex.environment_failure(result, target)
    audit['complete'] = bool(result['exitCode'] == 0 and not result['timedOut'] and result['usage'] and
                             result['completedTurns'] == 1 and not audit.get('error') and
                             audit['inputsUnchanged'] and not audit['environmentFailure'])
    events = [json.loads(line) for line in (target / 'events.jsonl').read_text().splitlines() if line.strip().startswith('{')]
    audit['toolCalls'] = sum(e.get('type') == 'item.completed' and e.get('item',{}).get('type') in {'command_execution','mcp_tool_call'} for e in events)
    audit['searchCalls'] = sum(e.get('type') == 'item.completed' and e.get('item',{}).get('type') == 'command_execution' and 'node search.mjs' in e['item'].get('command','') for e in events)
    save(target / 'audit.json', audit)
    print('Finished ' + cell['id'] + ': ' + ('complete' if audit['complete'] else 'unverified'), flush=True)


def summarize(out, manifest):
    rows = []
    for cell in manifest['cells']:
        target = out / cell['id']
        if not (target / 'audit.json').exists():
            continue
        result = json.loads((target / 'result.json').read_text())
        audit = json.loads((target / 'audit.json').read_text())
        rows.append({'id':cell['id'], 'case':cell['case'], 'arm':cell['arm'], 'result':result, 'audit':audit})
    groups = {}
    for arm in ARMS:
        selected = [r for r in rows if r['arm'] == arm]
        usages = [r['result']['usage'] for r in selected if r['result']['usage']]
        groups[arm] = {'calls':len(selected), 'complete':sum(r['audit']['complete'] for r in selected),
            'actionMatches':sum(r['audit']['complete'] and r['audit'].get('actionMatches',False) for r in selected),
            'safeMissingPolicy':sum(r['audit'].get('safeMissingPolicy',False) for r in selected),
            'knownTotalTokens':sum(u['total_tokens'] for u in usages),
            'knownUncachedPlusOutput':sum(u['uncached_input_tokens'] + u['output_tokens'] for u in usages if u['uncached_input_tokens'] is not None),
            'unknownUsage':len(selected)-len(usages), 'toolCalls':sum(r['audit']['toolCalls'] for r in selected)}
    threads = [r['result']['threadId'] for r in rows]
    save(out / 'summary.json', {'groups':groups, 'uniqueThreads':len(set(threads))==len(threads), 'rows':rows})
    print(json.dumps(groups), flush=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('phase', choices=['prepare','run','summarize'])
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--model', default='gpt-6-sol')
    args = parser.parse_args()
    out = args.output.resolve()
    if args.phase == 'prepare':
        prepare(out, args.model)
        return
    manifest = json.loads((out / 'manifest.json').read_text())
    if args.phase == 'run':
        if any(digest(HERE / name) != expected for name, expected in manifest['inputs'].items()) or digest(Path(ex.__file__)) != manifest['executorHash'] or digest(Path(v10.__file__)) != manifest['configHash']:
            raise RuntimeError('Frozen runner changed')
        cases = {c['id']:c for c in json.loads((out / 'frozen-cases.json').read_text())}
        cells = [c for c in manifest['cells'] if not (out / c['id']).exists()]
        with ThreadPoolExecutor(max_workers=2) as pool:
            list(pool.map(lambda c:run_cell(c, out, manifest, cases), cells))
    summarize(out, manifest)


if __name__ == '__main__':
    main()
