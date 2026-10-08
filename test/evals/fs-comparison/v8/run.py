#!/usr/bin/env python3
"""Fresh-context maintenance, shared isolated executor; no host execution of model code."""
import argparse
import copy
import fnmatch
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import tarfile
import time

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('style_v7', HERE.parent / 'v7/run.py')
v7 = importlib.util.module_from_spec(spec); spec.loader.exec_module(v7)
executor, base, protocol = v7.executor, v7.base, v7.protocol
STAGES = json.loads((HERE / 'stages.json').read_text())
BASE_STYLES = copy.deepcopy(v7.STYLE_CONTRACT)
ARMS = ['ordinary', 'informed', 'fs']


def styles(stage):
    result = copy.deepcopy(BASE_STYLES)
    if stage != 'initial':
        result['ActionButton']['axes']['tone']['danger'] = 'bg-red-100 text-red-900'
        result['StatusBadge']['axes']['status']['queued'] = 'bg-amber-100 text-amber-900'
        result['PanelCard']['axes']['density']['spacious'] = 'p-6'
    if stage == 'defaults':
        for name, selected in {'ActionButton': {'tone':'quiet','size':'lg'}, 'StatusBadge': {'status':'queued','density':'comfortable'}, 'PanelCard': {'tone':'accent','density':'spacious'}}.items():
            result[name]['defaults'] = selected
    return result


def git(project, *args):
    subprocess.run(['git', *args], cwd=project, check=True, capture_output=True,
                   env={**os.environ, **executor.runtime_env()})


def commit(project, message):
    # Preserve model records on disk, but do not turn FS's own main analysis into main source.
    git(project, 'add', '--', '.', ':!.frontend-system', ':!node_modules', ':!dist')
    git(project, '-c', 'user.name=FS Eval', '-c', 'user.email=eval@localhost', 'commit', '--allow-empty', '-qm', message)


def prepare(project):
    scenario = json.loads((v7.HERE / 'scenarios.json').read_text())
    runtime = v7.prepare(project, scenario['cases'][0], scenario)
    original = (v7.HERE / 'PLAN.md').read_text()
    marker = '아래는 변경하지 않을 기존 기능 계약이다.'
    (project / 'CONTRACT.md').write_text('기존 기능 계약입니다. 이 프로젝트는 저장된 팀 작성 규칙을 채택합니다. 단계별 요청이 명시적으로 바꾼 범위 외에는 보존합니다.\n\n' + original[original.index(marker):])
    (project / 'TEAM_POLICY.md').write_text(
        'Approved team policy. This is a team preference, not universal Tailwind guidance.\n'
        'Fixed utility classes go directly in JSX className, not standalone style-map objects. '
        'The three multi-axis variant components use real class-variance-authority cva definitions consumed by JSX. '
        'CVA configuration objects, ordinary data objects, CVA result variables and simple boolean toggles are allowed. '
        'Keep complete Tailwind tokens. Preserve native props, children and caller className. '
        'Use style-policy.json and npm run lint:styles along with test/build; do not weaken these inputs. '
        'Theme changes need the user selection; code habits are not consent. Old choices remain until an explicit newer selection.\n'
        'Detailed rationale: ../runtime/references/learned/tailwind-team-authorship.md and ../runtime/mandatory-rules/tailwind-css/team-style-policy.md.\n')
    commit(project, 'Equal-information maintenance fixture')
    return runtime


def reference(project, stage):
    v7.reference(project)
    for name, config in styles(stage).items():
        axes = ','.join(config['axes'])
        definition = json.dumps({'variants':config['axes'], 'defaultVariants':config['defaults']})
        (project / f'ui/{name}.jsx').write_text(
            "import React from 'react';\nimport {cva} from 'class-variance-authority';\n"
            f'const classes = cva({json.dumps(config["base"])},{definition});\n'
            f'export default function {name}({{{axes},className,...props}}) {{\n'
            f'  return <{config["tag"]} {{...props}} className={{classes({{{axes},className}})}}/>;\n}}\n')


def oracle_source(stage):
    # Only the supplied finite expected state differs. The independent v7 checker remains unchanged.
    old = v7.STYLE_CONTRACT
    try:
        v7.STYLE_CONTRACT = styles(stage)
        source = v7.oracle_source()
    finally:
        v7.STYLE_CONTRACT = old
    marker = 'console.log(JSON.stringify('
    offset = source.index(marker)
    return source[:offset] + (HERE / 'maintenance-checks.mjs').read_text() + '\n' + source[offset:]


def scope_result(project, baseline, stage):
    current = base.product_files(project)
    patterns = next(s['editable'] for s in STAGES if s['id'] == stage)
    violations = [name for name in sorted(set(baseline) | set(current))
        if current.get(name) != baseline.get(name)
        and not any(fnmatch.fnmatchcase(name, pattern) for pattern in patterns)
        and not (name.endswith(('.test.mjs','.test.jsx')) and (name not in baseline or stage != 'initial'))]
    return {'id':'N1-approved-change-scope','status':'failed' if violations else 'passed','paths':violations}


def grade(project, stage, output, baseline):
    output.mkdir(parents=True, exist_ok=True)
    try:
        result = executor.restricted(project, ['node','--input-type=module','-',str(project)], oracle_source(stage), timeout=120)
        (output / 'stdout.log').write_text(result.stdout); (output / 'stderr.log').write_text(result.stderr)
        report = json.loads(result.stdout) if result.returncode == 0 else None
        if not isinstance(report, dict) or 'results' not in report: raise RuntimeError('Restricted grader failed; inspect logs')
        report['results'].append(scope_result(project, baseline, stage))
        rows = report['results']
        report['eligible'] = all(r['status']=='passed' for r in rows)
        report['planCompliance'] = {'satisfied':sum(r['status']=='passed' for r in rows), 'total':len(rows)}
        report['variantPairs'] = sum(len(list(s['axes'].values())[0])*len(list(s['axes'].values())[1]) for s in styles(stage).values())
        report['limits'] = 'Finite contracts, mocked React events and real CSS compilation; not browser behavior or universal code quality.'
    except (OSError, ValueError, RuntimeError, subprocess.TimeoutExpired) as error:
        report = {'status':'unverified','eligible':False,'reason':str(error),'results':[]}
    executor.save(output / 'grade.json',report)
    return report


def calibration(project, output):
    rows = []
    for stage in STAGES:
        sid = stage['id']; reference(project,sid); baseline = base.product_files(project)
        variants = [('correct',None,None), ('import-alias',None,None), ('non-class-template',None,None), ('cva-selection-data',None,None),
                    ('static-map','S-inline-ActionButton',None), ('wrong-default','F-style-variants-ActionButton',None),
                    ('lost-native-prop','F-style-native-props',None), ('protected-domain','N1-approved-change-scope',None)]
        if sid != 'initial': variants.append(('missing-danger','F-style-variants-ActionButton',None))
        for name, diagnostic, _ in variants:
            reference(project,sid)
            path = project / 'ui/ActionButton.jsx'; source = path.read_text()
            if name=='import-alias': source=source.replace('{cva}', '{cva as define}').replace('= cva(', '= define(')
            if name=='non-class-template': source+='\nconst diagnosticId = value => `item-${value}`;\n'
            if name=='cva-selection-data':
                label=styles(sid)['ActionButton']['defaults']['tone']
                source=source.replace('"tone": '+json.dumps(label), '"tone": `'+label[:2]+'${'+json.dumps(label[2:])+'}`')
            if name=='static-map': source=source.replace('export default', 'const style={root:"outline-none"};\nexport default').replace('className})}', 'className: [className,style.root].filter(Boolean).join(" ")})}')
            if name=='wrong-default':
                selected = styles(sid)['ActionButton']['defaults']
                source=source.replace('"defaultVariants": '+json.dumps(selected), '"defaultVariants": {"tone":"missing","size":"missing"}')
            if name=='lost-native-prop': source=source.replace('{...props}', '')
            if name=='protected-domain':
                domain=project/'domain/orders.mjs'
                # Use an existing protected file, never rely on a guessed module name.
                domain=next((project/'domain').glob('*.mjs')); domain.write_text(domain.read_text()+'\n// unauthorized\n')
            if name=='missing-danger': source=source.replace('"danger": "bg-red-100 text-red-900"','"obsolete": "bg-red-100 text-red-900"')
            path.write_text(source)
            report=grade(project,sid,output/sid/name,baseline)
            failed={r['id'] for r in report['results'] if r['status']!='passed'}
            matched=report.get('status')=='graded' and (diagnostic in failed if diagnostic else report['eligible'])
            public_lint = None
            if diagnostic is None:
                lint = executor.restricted(project, ['npm','run','lint:styles'], '', timeout=120)
                public_lint = lint.returncode == 0
                matched = matched and public_lint
            rows.append({'stage':sid,'variant':name,'expected':diagnostic,'matched':matched,'publicLintPassed':public_lint,'grade':report['planCompliance'] if 'planCompliance' in report else None})
    executor.save(output/'summary.json',{'rows':rows,'matched':sum(r['matched'] for r in rows),'modelCalls':0})
    if not all(r['matched'] for r in rows): raise RuntimeError('Maintenance calibration failed; no model calls')


def usage(records):
    values=[r['invocation'].get('usage') for r in records]
    if not values or any(v is None for v in values): return None
    return {key:sum(v[key] for v in values) if all(v.get(key) is not None for v in values) else None
            for key in ['input_tokens','cached_input_tokens','output_tokens','total_tokens']}


def instruction(arm):
    shared = ('Read CONTRACT.md and the current REQUEST document. Follow the project team rules and approved user choices. '
        'All arms have the same project documents, public checks and ../runtime/references/learned and ../runtime/mandatory-rules. '
        'Do not use network, other models, conversations or install dependencies. '
        'Do not edit package.json, style-policy.json, CONTRACT.md, TEAM_POLICY.md or any REQUEST-/ANSWERS- documents. '
        'Planning turns must not edit product or test code. Do not commit; the evaluator commits delivered stages. '
        'Keep existing tests. Update only assertions explicitly superseded by the current request; preserve other guarantees. ')
    if arm!='ordinary': shared+='Read TEAM_POLICY.md and ../runtime/references/learned/tailwind-team-authorship.md for applicable conventions. '
    if arm=='fs': shared+='Use fs-plan and fs-work from ../runtime/skills with frontend-system MCP. Record evidence, actual approval, attempts, checks, reviews and completed execution. Use a distinct plan ID per request; reuse current saved project facts where valid. '
    else: shared+='Use your ordinary planning/coding process. Store a concise plan with the selected choices and verification for the current request, then implement it when approved. '
    return shared


def workflow_observed(trace):
    successful=[i for i in trace if not i['error']]
    names={i['tool'] for i in successful}
    routed=any(i['tool']=='get_work_context' and isinstance(i.get('response'),dict) and i['response'].get('routing',{}).get('hash') for i in successful)
    evidenced=any(i['tool']=='save_revision' and isinstance(i.get('response'),dict) and (i['response'].get('evidenceStatus')=='recorded' or i['response'].get('evidence')) for i in successful)
    started='begin_work_attempt' in names or any(i['tool']=='start_work' and (i.get('response') or {}).get('attempt',{}).get('id') for i in successful)
    baseline=any(i['tool']=='run_project_checks' and (i.get('response') or {}).get('purpose')=='baseline'
        or i['tool']=='start_work' and (i.get('response') or {}).get('baseline',{}).get('purpose')=='baseline' for i in successful)
    completed=any(i['tool']=='save_execution' and i['arguments'].get('execution',{}).get('status')=='complete'
        or i['tool']=='complete_work' and (i.get('response') or {}).get('status')=='complete' for i in successful)
    return bool(routed and evidenced and started and baseline and completed and {'approve_revision','save_project_context'}<=names)


def repair_prompt(report):
    # Give every arm the observed diagnostic, not just an opaque test ID. Do not
    # reveal oracle source or reference implementations; retain the first grade.
    failures=[{'id':r['id'], 'reason':str(r.get('reason',''))[:1200],
               **({'paths':r['paths']} if 'paths' in r else {})}
              for r in report['results'] if r['status']!='passed']
    return '승인된 변경 범위와 보존 의무를 바꾸지 말고 다음 관측된 실패를 수정하세요. 진단은 새 설계 선택의 승인이 아닙니다:\n'+json.dumps(failures,ensure_ascii=False)


def run_stage(project, runtime, frozen, arm, stage, output, args, on_call):
    sid=stage['id']; request_name=f'REQUEST-{sid}.md'; answer_name=f'ANSWERS-{sid}.md'
    request=stage['request']+'\nAllowed product edits: '+', '.join(stage['editable'])+'. New *.test.mjs/*.test.jsx and plan Markdown are permitted. In maintenance stages only, update existing test assertions explicitly superseded by this request. Other existing files are protected.'
    (project/request_name).write_text(request)
    baseline=base.product_files(project)
    locked={p.name:p.read_bytes() for p in project.iterdir() if p.is_file() and (p.name in {'package.json','style-policy.json','CONTRACT.md','TEAM_POLICY.md'} or p.name.startswith(('REQUEST-','ANSWERS-')))}
    configs=executor.permissions(project,'fs' if arm=='fs' else 'baseline')
    if arm=='fs': configs+=executor.fs_config(project)
    configs+=['developer_instructions='+json.dumps(instruction(arm))]
    topic=stage['topic']
    preparation=(f'{request_name}을 조사하고 계획과 검증을 준비하세요. 제품/테스트 코드는 아직 변경하지 마세요. '
        '최종 출력은 JSON {"questions":[{"topic":"topic-id","question":"근거와 선택지를 포함한 질문"}]}입니다. '
        +(f'미결정 질문 topic은 {topic}입니다. 해당 질문을 하세요.' if topic else '미결정 사항이 없으므로 questions는 빈 배열입니다. 기존 답을 재질문하지 마세요.'))
    records=[];trace=[];previous=None; infra=None
    for phase in ['prepare','work']:
        if phase=='prepare': prompt=preparation
        else:
            if topic:
                (project/answer_name).write_text(json.dumps({topic:stage['answer']},ensure_ascii=False,indent=2)+'\n')
                locked[answer_name]=(project/answer_name).read_bytes()
            prompt=f'{request_name}'+(f' 및 {answer_name}' if topic else '')+'에 정확히 일치하는 계획의 구현을 승인합니다. 답변을 계획에 반영한 뒤 구현·검증하고 완료 근거를 기록하세요. 다른 변경은 승인하지 않습니다.'
        before=base.product_files(project)
        for attempt in range(2 if phase=='work' else 1):
            target=output/phase/str(attempt)
            print(f'Running {args.model} / {arm} / {sid} / {phase} / {attempt+1}',flush=True);on_call()
            result=executor.invoke(project,target/'model',args.model,prompt,configs,timeout=args.timeout,env=executor.runtime_env(),previous=previous)
            previous=result
            infra=executor.environment_failure(result,target/'model')
            trace.extend(protocol.tool_calls(target/'model/events.jsonl'))
            if executor.inventory(runtime)!=frozen: infra='Protected runtime changed'
            immutable=all((project/name).is_file() and (project/name).read_bytes()==content for name,content in locked.items())
            if result['exitCode'] or result['completedTurns']!=1 or infra:
                report={'status':'unverified','eligible':False,'reason':infra or 'Invocation incomplete'}
            elif not immutable or phase=='prepare' and before!=base.product_files(project):
                report={'status':'protocol-failed','eligible':False,'reason':'Immutable inputs or planning-stage product/test changed'}
            elif phase=='work': report=grade(project,sid,target/'grader',baseline)
            else:
                try:
                    questions,answers=protocol.selected_answers((target/'model/final.md').read_text(),{topic:stage['answer']} if topic else {})
                    if topic and topic not in answers: raise ValueError('Required unresolved question missing')
                    executor.save(target/'interaction.json',{'questions':questions,'answers':answers,'semanticReview':'unverified'})
                    report={'status':'question-protocol-observed','eligible':True}
                except (ValueError,KeyError) as error: report={'status':'protocol-failed','eligible':False,'reason':str(error)}
            shutil.copytree(project,target/'snapshot',symlinks=True,ignore=shutil.ignore_patterns('.git','node_modules','dist'))
            record={'phase':phase,'attempt':attempt,'invocation':result,'grade':report};records.append(record)
            executor.save(target/'record.json',record)
            if report['eligible'] or report['status']!='graded':break
            prompt=repair_prompt(report)
        if not report['eligible']:break
    workflow=arm!='fs' or workflow_observed(trace)
    work=[r for r in records if r['phase']=='work']
    journey={'arm':arm,'stage':sid,'records':records,'trace':trace,'usage':usage(records),
        'modelSeconds':sum(r['invocation']['elapsedSeconds'] for r in records),
        'workflow':('observed' if workflow else 'workflow-failed') if arm=='fs' else 'not-applicable', 'firstGrade':work[0]['grade'] if work else None,
        'finalGrade':report,'eligible':bool(work and report['eligible'] and workflow), 'infra':infra}
    executor.save(output/'journey.json',journey)
    return journey


def main():
    parser=argparse.ArgumentParser();mode=parser.add_mutually_exclusive_group()
    mode.add_argument('--run',action='store_true');mode.add_argument('--calibrate-only',action='store_true')
    parser.add_argument('--model',default='gpt-6-sol');parser.add_argument('--timeout',type=int,default=2400)
    parser.add_argument('--reverse',action='store_true')
    args=parser.parse_args()
    if args.timeout<1:parser.error('timeout must be positive')
    output=HERE/'results'/time.strftime('%Y-%m-%dT%H%M%S');output.mkdir(parents=True,exist_ok=False)
    arms=list(reversed(ARMS)) if args.reverse else ARMS
    hash_file=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
    manifest={'model':args.model,'timeout':args.timeout,'armOrder':arms,'stages':STAGES,
        'runtime':{n:executor.inventory(base.REPO/n) for n in ['bundle','skills','references','mandatory-rules']},
        'suite':{p.name:hash_file(p) for p in HERE.iterdir() if p.is_file()},
        'v7':{str(p.relative_to(v7.HERE)):hash_file(p) for p in v7.HERE.rglob('*') if p.is_file() and not any(x in {'results','validation','__pycache__'} for x in p.relative_to(v7.HERE).parts)},
        'support':{str(p):hash_file(p) for p in [Path(protocol.__file__),Path(executor.__file__),Path(base.__file__),executor.HERE/'preflight.mjs',HERE.parent/'v6/evaluate.mjs',HERE.parent/'v2/connect.py',HERE.parent/'v2/environment.py']},
        'config':executor.COMMON_CONFIG,'toolchain':{'codex':subprocess.check_output([executor.codex_binary(),'--version'],text=True).strip(),'node':subprocess.check_output(['node','--version'],text=True).strip()}}
    manifest['hash']=hashlib.sha256(json.dumps(manifest,sort_keys=True).encode()).hexdigest();executor.save(output/'manifest.json',manifest)
    # Preserve the actual runtime and authored evaluation inputs, not only hashes of
    # a dirty worktree. Generated/model artifacts and installed dependencies stay out.
    archive = output / 'inputs.tar.gz'
    def authored_only(member):
        return None if any(part in {'results','validation','__pycache__','node_modules'} for part in Path(member.name).parts) else member
    with tarfile.open(archive, 'w:gz') as handle:
        for name in ['bundle','skills','references','mandatory-rules','src','package.json','package-lock.json']:
            handle.add(base.REPO/name, arcname='frontend-system/'+name, filter=authored_only)
        handle.add(HERE.parent, arcname='eval', filter=authored_only)
    executor.save(output/'inputs-archive.json', {'file':archive.name,'sha256':hash_file(archive),'manifestHash':manifest['hash'],
        'limits':'Authored source/runtime only. Restore installed dependencies from lockfiles; model service/version availability remains external.'})
    journeys=[];calls=0
    def called():
        nonlocal calls
        calls+=1
    def summary(status,reason=None):executor.save(output/'summary.json',{'status':status,'reason':reason,'modelCalls':calls,'manifestHash':manifest['hash'],'journeys':journeys})
    if not args.run and not args.calibrate_only:summary('prepared-not-run');print(output);return
    try:
        print('Preflight: existing permission/Git/MCP isolation checks (no model calls)',flush=True)
        preflight=subprocess.run([sys.executable,str(executor.HERE/'run.py'),'--preflight-only','--output',str(output/'isolation')],capture_output=True,text=True)
        executor.save(output/'isolation-process.json',{'exitCode':preflight.returncode,'stdout':preflight.stdout,'stderr':preflight.stderr})
        if preflight.returncode:raise RuntimeError('Isolation preflight failed; no model calls')
        with tempfile.TemporaryDirectory(prefix='fs-v8-calibration-') as temp:
            project=Path(temp).resolve()/'project';prepare(project);calibration(project,output/'calibration')
        if args.calibrate_only:summary('calibrated');print(output);return
        for arm in arms:
            with tempfile.TemporaryDirectory(prefix='fs-v8-maintenance-') as temp:
                project=Path(temp).resolve()/'project';runtime=prepare(project)
                if any(executor.inventory(runtime/n)!=expected for n,expected in manifest['runtime'].items()):raise RuntimeError('Runtime changed since manifest')
                frozen=executor.inventory(runtime)
                for stage in STAGES:
                    journey=run_stage(project,runtime,frozen,arm,stage,output/arm/stage['id'],args,called)
                    journeys.append(journey);summary('running')
                    if journey['infra']:raise RuntimeError(journey['infra'])
                    if journey['finalGrade']['status']=='unverified':raise RuntimeError('Invocation/grader unverified; preserve partial usage and stop')
                    if not journey['eligible']:break
                    commit(project,'Delivered '+stage['id'])
        summary('completed')
    except (OSError,RuntimeError,subprocess.SubprocessError) as error:
        summary('blocked',str(error));print(f'Blocked: {error}\n{output}',flush=True);raise SystemExit(1)
    print(output,flush=True)

if __name__=='__main__':main()
