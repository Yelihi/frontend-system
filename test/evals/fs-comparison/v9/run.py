#!/usr/bin/env python3
"""Planning-only comparison. Reuses isolated executor; never executes generated code."""
import argparse
from concurrent.futures import ThreadPoolExecutor
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import random
import shutil
import subprocess
import tempfile
import time

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[3]
spec = importlib.util.spec_from_file_location('v9_executor', HERE.parent / 'v3/maintenance/run.py')
executor = importlib.util.module_from_spec(spec)
spec.loader.exec_module(executor)
ARMS = ['ordinary', 'raw-K1', 'fs-K0', 'fs-K1']


def save(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    executor.save(path, value)


def authored_inputs():
    return {str(path.relative_to(HERE)): hashlib.sha256(path.read_bytes()).hexdigest()
            for path in HERE.rglob('*') if path.is_file() and not any(
                part in {'results', '__pycache__'} for part in path.relative_to(HERE).parts)}


def safe_read(project, name):
    path = project / name
    if path.is_symlink() or not path.is_file() or not path.resolve().is_relative_to(project.resolve()):
        raise ValueError(f'Missing or unsafe artifact: {name}')
    if path.stat().st_size > 1_000_000:
        raise ValueError(f'Oversized artifact: {name}')
    return path.read_text()


def protected(project):
    return {name: digest for name, digest in executor.inventory(project).items()
            if name.startswith('src/') or name in {'package.json', 'tsconfig.json', 'README.md'}}


def prepare(root, case, arm):
    project, runtime = root / 'project', root / 'runtime'
    shutil.copytree(HERE / 'fixture', project)
    runtime.mkdir()
    for folder in ['bundle', 'skills', 'references', 'mandatory-rules']:
        shutil.copytree(REPO / folder, runtime / folder)
    shutil.copy(REPO / 'package.json', runtime / 'package.json')
    setup = "const ordersSession = catalogSession;" if case == 'shared' else "const ordersSession = createSession('orders-token', () => ordersRoot.setAttribute('data-login', 'required'));"
    path = project / 'src/wiring.ts'
    path.write_text(path.read_text().replace('const ordersSession = catalogSession; // SESSION_SETUP', setup))
    ownership = ('The panels intentionally share one login realm and Session instance. The login indicator currently lives in the catalog panel.'
                 if case == 'shared' else 'The panels intentionally have independent login realms and Session instances. Expiring one must not log out the other.')
    path = project / 'README.md'
    path.write_text(path.read_text().replace('// OWNERSHIP', ownership) + '\n' + (HERE / 'corpus/baseline.md').read_text())
    level = 'K1' if arm == 'fs-K1' else 'K0'
    sync = subprocess.run(['node', str(HERE / 'prepare-knowledge.mjs'), str(runtime), level],
                          text=True, capture_output=True, check=True)
    if arm == 'raw-K1':
        (project / 'learning').mkdir()
        for name in ['boundaries.md', 'generations.md']:
            shutil.copy(HERE / 'corpus' / name, project / 'learning' / name)
    # Authored fixture only, before any model sees or can edit this tree.
    subprocess.run([str(REPO / 'node_modules/.bin/tsc'), '--project', str(project / 'tsconfig.json')], check=True, capture_output=True)
    for command in [['git', 'init', '-q', '-b', 'main'], ['git', 'add', '.'],
                    ['git', '-c', 'user.name=FS Eval', '-c', 'user.email=eval@localhost', 'commit', '-qm', 'Planning fixture']]:
        subprocess.run(command, cwd=project, check=True, capture_output=True, env={**os.environ, **executor.runtime_env()})
    return project, runtime, json.loads(sync.stdout)


def configs(project, arm):
    values = executor.permissions(project, 'fs' if arm.startswith('fs-') else 'baseline')
    # :tmpdir is writable for tool scratch space; block sibling experiment cells
    # explicitly while the longer project/runtime grants retain this cell's access.
    cell_root = project.parent.parent
    if cell_root.name.startswith('fs-v9-'):
        values = [v[:-1] + ',' + json.dumps(str(cell_root)) + '="deny"}'
                  if v.startswith('permissions.eval.filesystem=') else v for v in values]
    if not arm.startswith('fs-'):
        # Ordinary/raw cannot inspect FS workflow/reference files in the sibling runtime.
        runtime_key = json.dumps(str(project.parent / 'runtime')) + '='
        values = [v.replace(runtime_key + '"read"', runtime_key + '"deny"') for v in values]
    if arm.startswith('fs-'):
        wrapper = ['sandbox', '-C', str(project), '-P', 'eval']
        for value in values:
            wrapper += ['-c', value]
        wrapper += ['node', str(project.parent / 'runtime/bundle/mcp.js')]
        values += ['mcp_servers.frontend-system.command=' + json.dumps(executor.codex_binary()),
                   'mcp_servers.frontend-system.args=' + json.dumps(wrapper),
                   'mcp_servers.frontend-system.env={' + ','.join(k+'='+json.dumps(v) for k,v in executor.runtime_env().items()) + '}',
                   'mcp_servers.frontend-system.startup_timeout_sec=30',
                   'mcp_servers.frontend-system.tool_timeout_sec=120']
    return values


def question_prompt(arm):
    extra = ''
    if arm == 'raw-K1':
        extra = 'You also have the original learning notes in learning/*.md. Read them and use their conditions/exclusions where relevant.'
    if arm.startswith('fs-'):
        extra = ('Use FS: read ../runtime/skills/fs-plan/SKILL.md and follow its real analysis/routing process using the frontend-system MCP. '
                 'Select planId portal-refactor. Save project evidence and route relevant code, but ask before serializing a decision-dependent revision. '
                 'The repository source corpus is the only learned knowledge for this cell. Do not bypass FS or fabricate receipts.')
    return f'''Read README.md and the existing implementation. Help the owner plan the requested refactor.
First inspect and identify only material unresolved choices. Do not edit product code, approve a plan, or implement.
{extra}
Write questions.json as a JSON object {{"questions":[{{"id":"q1","question":"...","evidence":[{{"path":"src/...","quote":"exact source text"}}],"options":[{{"id":"a","description":"...","cost":"..."}}]}}]}}.
Use at most six questions, fewer if code/contracts settle the decisions. No minimum number is required.
Ground questions in the actual project; include viable alternatives and costs. Keep code facts separate from unknown intent.
Stop after questions.json is written; the next turn supplies only the owner's answers to questions actually asked.
Do not launch nested AI processes or use network. You may inspect code but do not execute or install anything.
Write in English for consistent comparison. The final chat reply should only list the artifact path and any blocker.'''


def plan_prompt(arm):
    extra = ('Follow FS to save an unapproved named revision portal-refactor with actual code/knowledge/choice links. '
             'Inspect contractDiagnostics and get_revision(detail:influence) to report recorded links, without claiming causal benefit. '
             'Also write a readable plan.md for the owner; do not approve or implement.' if arm.startswith('fs-') else '')
    return f'''The owner answered in owner-answers.json. Read it and use only those supplied decisions.
Draft plan.md for the README refactor: concrete scope, required obligations versus discretion/open choices,
ownership/interfaces, reasons/tradeoffs, and verifiable examples/checks. Keep unresolved intent explicit.
A detailed plan is not permission to implement. No product code edits or test execution. Do not invent approval.
{extra}
Write the plan for a reviewer who has not seen the conversation. More prose/rules/abstractions are not inherently better.
Do not launch nested AI processes or use network. Write in English. Finish with the artifact path and blockers.'''


def check_questions(project):
    data = json.loads(safe_read(project, 'questions.json'))
    questions = data.get('questions')
    if not isinstance(questions, list) or len(questions) > 6:
        raise ValueError('Question protocol: expected at most six questions')
    ids, citations = set(), []
    for q in questions:
        if not isinstance(q, dict) or not isinstance(q.get('id'), str) or q['id'] in ids or not q.get('question'):
            raise ValueError('Question protocol: invalid/duplicate question ID')
        ids.add(q['id'])
        if not isinstance(q.get('options'), list) or not isinstance(q.get('evidence'), list):
            raise ValueError('Question protocol: missing options/evidence')
        for item in q['evidence']:
            text = safe_read(project, item['path'])
            quote = item['quote']
            citations.append({'questionId': q['id'], 'path': item['path'], 'quote': quote,
                              'exact': isinstance(quote, str) and bool(quote.strip()) and quote in text})
    return {'count':len(questions), 'citations':citations, 'allQuotesExact':all(row['exact'] for row in citations)}


def run_cell(cell, phase, output, manifest):
    arm, project = cell['arm'], Path(cell['project'])
    target = output / cell['id'] / phase
    state = json.loads((output / cell['id'] / 'state.json').read_text())
    if executor.inventory(Path(cell['runtime'])) != state['runtimeInventory']:
        raise RuntimeError('Frozen runtime changed')
    if phase == 'plan':
        if not (output / cell['id'] / 'answers.json').exists():
            return {'id':cell['id'], 'status':'awaiting-answers'}
        previous = json.loads((output / cell['id'] / 'questions/result.json').read_text())
        if not previous['usage'] or previous['exitCode'] or previous['timedOut']:
            return {'id':cell['id'], 'status':'question-turn-incomplete'}
        answers = json.loads((output / cell['id'] / 'answers.json').read_text())
        # Mappings are coordinator-reviewed, but answers themselves must be frozen bank text.
        bank = (manifest['answerBank'] if 'answerBank' in manifest else
                json.loads((HERE / 'answers.json').read_text()))[cell['case']]
        questions = json.loads(safe_read(project, 'questions.json'))['questions']
        if {a['questionId'] for a in answers['answers']} != {q['id'] for q in questions}:
            raise ValueError('Every actually asked question needs one mapped answer')
        for answer in answers['answers']:
            if answer['answer'] != '\n'.join(bank[key] for key in answer['bankKeys']):
                raise ValueError('Answer differs from frozen bank')
        # Hidden bank keys/mapping rationale are not sent to the generator.
        save(project / 'owner-answers.json', {'answers':[{k:a[k] for k in ['questionId','answer']} for a in answers['answers']]})
    else:
        previous = None
    print(f"Running {cell['id']} / {phase}", flush=True)
    result = executor.invoke(project, target, manifest['model'], question_prompt(arm) if phase == 'questions' else plan_prompt(arm),
                             configs(project, arm), manifest['timeout'], executor.runtime_env(), previous)
    status = {'id':cell['id'], 'phase':phase, 'invocation':result,
              'sourceUnchanged':protected(project) == state['protected'],
              'runtimeUnchanged':executor.inventory(Path(cell['runtime'])) == state['runtimeInventory'],
              'environmentFailure':executor.environment_failure(result,target)}
    try:
        if phase == 'questions':
            status['questions'] = check_questions(project)
        else:
            status['planCharacters'] = len(safe_read(project,'plan.md'))
    except (ValueError, KeyError, OSError) as error:
        status['artifactError'] = str(error)
    # Persist data only; never import or execute model-generated project files.
    shutil.copytree(project, target / 'project', symlinks=True, ignore=shutil.ignore_patterns('.git'))
    save(target / 'audit.json',status)
    print(f"Finished {cell['id']} / {phase}: " + ('complete' if result['usage'] and not status.get('artifactError') else 'unverified'),flush=True)
    return status


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('phase',choices=['prepare','questions','plan'])
    parser.add_argument('--output',type=Path,required=True)
    parser.add_argument('--model',default='gpt-6-sol')
    parser.add_argument('--timeout',type=int,default=600)
    args = parser.parse_args()
    output = args.output.resolve()
    if args.phase == 'prepare':
        output.mkdir(parents=True,exist_ok=False)
        root = Path(tempfile.mkdtemp(prefix='fs-v9-')).resolve()
        cells = [{'id':case+'-'+arm,'case':case,'arm':arm} for case in ['shared','independent'] for arm in ARMS]
        random.Random(912).shuffle(cells)
        for cell in cells:
            folder = root / cell['id']; folder.mkdir()
            project,runtime,sync = prepare(folder,cell['case'],cell['arm'])
            cell.update(project=str(project),runtime=str(runtime))
            save(output / cell['id'] / 'sync.json',sync)
            save(output / cell['id'] / 'state.json',{'protected':protected(project),'runtimeInventory':executor.inventory(runtime)})
        manifest = {'version':9,'createdAt':time.strftime('%Y-%m-%dT%H:%M:%S%z'),'model':args.model,'timeout':args.timeout,
                    'replicates':1,'cells':cells,'inputs':authored_inputs(),
                    'executorHash':hashlib.sha256(Path(executor.__file__).read_bytes()).hexdigest(),
                    'runtime':{folder:executor.inventory(REPO/folder) for folder in ['bundle','skills','references','mandatory-rules']}}
        save(output/'manifest.json',manifest)
        shutil.copytree(HERE/'corpus',output/'frozen-corpus')
        shutil.copytree(HERE/'fixture',output/'frozen-fixture')
        for level in ['K0','K1']:
            cell=next(cell for cell in cells if cell['arm']=='fs-'+level)
            shutil.copytree(cell['runtime'],output/('frozen-runtime-'+level))
        for name in ['protocol.md','answers.json','run.py','review.py','prepare-knowledge.mjs']:
            shutil.copy(HERE/name,output/('frozen-'+name))
        print(output,flush=True)
        return
    manifest=json.loads((output/'manifest.json').read_text())
    if authored_inputs() != manifest['inputs']:
        raise RuntimeError('Preregistered inputs changed; start a separately labeled run')
    if not (output/'isolation/summary.json').exists() or json.loads((output/'isolation/summary.json').read_text())['status'] != 'preflight-passed':
        raise RuntimeError('Run existing maintenance --preflight-only --output <result>/isolation first')
    with ThreadPoolExecutor(max_workers=2) as pool:
        records=list(pool.map(lambda cell:run_cell(cell,args.phase,output,manifest),manifest['cells']))
    save(output/(args.phase+'-summary.json'),{'records':records})
    print(output,flush=True)

if __name__=='__main__':
    main()
