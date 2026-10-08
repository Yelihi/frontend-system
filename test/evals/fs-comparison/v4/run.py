#!/usr/bin/env python3
"""Evidence-led network pilot; reuse isolated executor, preparation and usage deltas."""
import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import time

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('fundamentals', HERE.parent / 'v3/fundamentals/run.py')
base = importlib.util.module_from_spec(spec)
spec.loader.exec_module(base)
executor = base.executor

REFERENCE_CLIENT = """export function createClient({transport,onUnauthorized}) {
  return {async request(path,options={}) {
    const response=await transport(path,{...options,headers:{...options.headers},credentials:'same-origin'});
    if(response.status===401) {onUnauthorized();throw Object.assign(new Error('Authentication required'),{code:'unauthorized'});}
    if(response.status>=400) throw Object.assign(new Error('Request rejected'),{code:'http-error',status:response.status,data:response.data});
    return response.data;
  }};
}
"""
REFERENCE_UI = """import React,{useState} from 'react';
export default function App({client}) {
  const [message,setMessage]=useState('');
  async function load() {try {await client.request('/orders');setMessage('Loaded');}catch {setMessage('목록을 확인해주세요.');}}
  async function submit() {try {await client.request('/order',{method:'POST'});setMessage('Ordered');}catch {setMessage('주문 내역을 확인해주세요.');}}
  return <main><button onClick={load}>조회</button><button onClick={submit}>주문</button><p role="status">{message}</p></main>;
}
"""
STARTER_CLIENT = """export function createClient({transport}) {
  return {async request(path,options={}) {options.credentials='include';return (await transport(path,options)).data;}};
}
"""


def prepare(project, case, scenario):
    runtime = base.prepare(project)
    shutil.copytree(base.REPO / 'node_modules/typescript', runtime / 'node_modules/typescript')
    (project / 'api.mjs').write_text(REFERENCE_CLIENT if case['preserveClient'] else STARTER_CLIENT)
    (project / 'App.jsx').write_text(REFERENCE_UI.replace("client.request('/orders')", "fetch('/orders',{credentials:'include'})").replace("client.request('/order',{method:'POST'})", "fetch('/order',{method:'POST',credentials:'include'})"))
    (project / 'CONTRACT.md').write_text(scenario['publicContract'])
    for command in [['git', 'add', '.'], ['git', '-c', 'user.name=FS Eval', '-c', 'user.email=eval@localhost', 'commit', '-qm', 'Network pilot starter']]:
        subprocess.run(command, cwd=project, check=True, capture_output=True, env={**os.environ, **executor.runtime_env()})
    return runtime


def compliance_scope(project, baseline):
    current = base.product_files(project)
    violations = []
    for name in sorted(set(baseline) | set(current)):
        if name in {'App.jsx', 'api.mjs'}: continue
        if name not in baseline and name.endswith(('.test.mjs', '.test.jsx')): continue
        if current.get(name) != baseline.get(name): violations.append(name)
    return {'id': 'N1-approved-change-scope', 'status': 'failed' if violations else 'passed', 'paths': violations}


def grade(project, case, output, compliance=False, baseline=None):
    output.mkdir(parents=True, exist_ok=True)
    preserved = hashlib.sha256(REFERENCE_CLIENT.encode()).hexdigest() if case['preserveClient'] else ''
    try:
        source = (HERE / 'evaluate.mjs').read_text()
        if compliance:
            # Preserve the existing behavioral oracle unchanged; add separately identified checks.
            position = source.index('console.log(JSON.stringify(')
            source = source[:position] + (HERE / 'compliance-checks.mjs').read_text() + '\n' + source[position:]
        result = executor.restricted(project, ['node', '--input-type=module', '-', str(project), preserved], source, timeout=45)
        (output / 'stdout.log').write_text(result.stdout)
        (output / 'stderr.log').write_text(result.stderr)
        report = json.loads(result.stdout) if result.returncode == 0 else None
        if not isinstance(report, dict) or 'eligible' not in report:
            raise RuntimeError('Restricted grader failed; inspect logs')
        if compliance:
            if baseline is None: raise RuntimeError('Compliance grading requires a baseline')
            behavior = [row for row in report['results'] if not row['id'].startswith(('F2-', 'N2-', 'N3-', 'Q1-'))]
            report['behaviorEligible'] = all(row['status'] == 'passed' for row in behavior)
            report['results'].append(compliance_scope(project, baseline))
            obligations = report['results']
            report['planCompliance'] = {
                'version': 1, 'satisfied': sum(row['status'] == 'passed' for row in obligations),
                'total': len(obligations),
                'forbiddenViolations': [row['id'] for row in obligations if row['id'].startswith('N') and row['status'] != 'passed'],
                'decisionViolations': [row['id'] for row in obligations if row['id'].startswith('Q') and row['status'] != 'passed'],
                'semanticReview': 'unverified',
            }
            report['eligible'] = all(row['status'] == 'passed' for row in obligations)
            report['limits'] = 'Compliance v1: explicit finite contracts and stage snapshots; question meaning, transient edits and arbitrary JavaScript bypasses remain unverified.'
    except (OSError, ValueError, RuntimeError, subprocess.TimeoutExpired) as error:
        report = {'status': 'unverified', 'eligible': False, 'reason': str(error), 'results': []}
    executor.save(output / 'grade.json', report)
    return report


def calibration(project, cases, output):
    rows = []
    for case in cases:
        variants = [('correct', REFERENCE_CLIENT, REFERENCE_UI),
                    ('mutate-input', REFERENCE_CLIENT.replace("const response=", "options.changed=true; const response="), REFERENCE_UI),
                    ('swallow-http-error', REFERENCE_CLIENT.replace('response.status>=400', 'false'), REFERENCE_UI),
                    ('duplicate-auth-handler', REFERENCE_CLIENT.replace('onUnauthorized();', 'onUnauthorized();onUnauthorized();'), REFERENCE_UI),
                    ('direct-ui-request', REFERENCE_CLIENT, REFERENCE_UI.replace("client.request('/orders')", "fetch('/orders')"))]
        for name, client, ui in variants:
            (project / 'api.mjs').write_text(client)
            (project / 'App.jsx').write_text(ui)
            report = grade(project, case, output / case['id'] / name)
            rows.append({'case': case['id'], 'variant': name, **report})
            executor.save(output / 'summary.json', {'modelCalls': 0, 'rows': rows})
            if report['status'] == 'unverified' or report['eligible'] != (name == 'correct'):
                raise RuntimeError('Network grader calibration failed before model calls')
    executor.save(output / 'summary.json', {'status': 'calibrated', 'modelCalls': 0, 'rows': rows})


def compliance_calibration(project, cases, output):
    rows = []
    for case in cases:
        (project / 'api.mjs').write_text(REFERENCE_CLIENT)
        (project / 'App.jsx').write_text(REFERENCE_UI)
        baseline = base.product_files(project)
        money = (project / 'money.mjs').read_text()
        variants = [
            ('correct', REFERENCE_CLIENT, REFERENCE_UI, None, None),
            ('allowed-discretion', REFERENCE_CLIENT, REFERENCE_UI.replace('load()', 'loadOrders()').replace('onClick={load}', 'onClick={loadOrders}'), 'extra.test.mjs', None),
            ('deep-clone', REFERENCE_CLIENT.replace('{...options,headers:{...options.headers}', '{...structuredClone(options),headers:{...options.headers}'), REFERENCE_UI, None, 'F2-shallow-copy-and-reference-identity'),
            ('extra-export', REFERENCE_CLIENT + 'export const debug = true;\n', REFERENCE_UI, None, 'N3-no-unapproved-public-api'),
            ('replace-callback-error', REFERENCE_CLIENT.replace('onUnauthorized();', 'try {onUnauthorized();} catch {}'), REFERENCE_UI, None, 'Q1-selected-callback-failure-policy'),
            ('new-product-file', REFERENCE_CLIENT, REFERENCE_UI, 'helper.mjs', 'N1-approved-change-scope'),
            ('new-module-edge', "import './money.mjs';\n" + REFERENCE_CLIENT, REFERENCE_UI, None, 'N2-approved-module-boundaries'),
            ('protected-file-edit', REFERENCE_CLIENT, REFERENCE_UI, 'money.mjs', 'N1-approved-change-scope'),
        ]
        for name, client, ui, extra, expected_failure in variants:
            (project / 'api.mjs').write_text(client)
            (project / 'App.jsx').write_text(ui)
            if extra: (project / extra).write_text(money + '\n// changed\n' if extra == 'money.mjs' else 'export const probe = true;\n')
            try:
                report = grade(project, case, output / case['id'] / name, compliance=True, baseline=baseline)
                rows.append({'case': case['id'], 'variant': name, **report})
                executor.save(output / 'summary.json', {'modelCalls': 0, 'rows': rows})
                failures = {row['id'] for row in report['results'] if row['status'] != 'passed'}
                if report['status'] == 'unverified' or report['eligible'] != (expected_failure is None) or expected_failure and expected_failure not in failures:
                    raise RuntimeError('Compliance grader calibration failed before model calls')
            finally:
                if extra == 'money.mjs': (project / extra).write_text(money)
                elif extra: (project / extra).unlink()
    executor.save(output / 'summary.json', {'status': 'calibrated', 'modelCalls': 0, 'rows': rows})


def tool_calls(log):
    found = []
    for line in log.read_text().splitlines():
        try:
            event = json.loads(line)
        except ValueError:
            continue
        item = event.get('item', {})
        if event.get('type') == 'item.completed' and item.get('type') == 'mcp_tool_call':
            blocks = (item.get('result') or {}).get('content', [])
            try:
                response = json.loads('\n'.join(block.get('text', '') for block in blocks if block.get('type') == 'text'))
            except ValueError:
                response = None
            found.append({'tool': item.get('tool'), 'arguments': item.get('arguments'), 'response': response,
                          'error': item.get('error') or item.get('status') == 'failed' or (item.get('result') or {}).get('isError', False) or response is None})
    return found


def selected_answers(final_text, answer_bank):
    # Explicit topic protocol; this does not grade the semantic relevance of the question.
    data = json.loads(final_text.strip().removeprefix('```json').removeprefix('```').removesuffix('```').strip())
    if not isinstance(data, dict) or 'questions' not in data:
        raise ValueError('Expected an object containing questions')
    questions = data['questions']
    if not isinstance(questions, list) or any(not isinstance(q, dict) or not isinstance(q.get('topic'), str) or q['topic'] not in answer_bank or not isinstance(q.get('question'), str) or not q['question'].strip() for q in questions):
        raise ValueError('Expected concrete questions with supported topic IDs')
    return questions, {q['topic']: answer_bank[q['topic']] for q in questions}


def comparison_rows(journeys):
    rows = []
    for journey in journeys:
        work = [record for record in journey['records'] if record['phase'] == 'work']
        first = work[0]['grade'] if work else {}
        usage = journey['usage']
        rows.append({
            'case': journey['case'], 'arm': journey['arm'],
            'questionProtocol': journey.get('questionProtocol', 'unverified'),
            'firstImplementationPassed': first.get('eligible') if work else None,
            'firstPlanCompliance': first.get('planCompliance'),
            'finalPlanCompliance': journey.get('planCompliance'),
            'finalEligible': journey['eligible'], 'repairCalls': max(0, len(work) - 1),
            'modelElapsedSeconds': sum(record['invocation'].get('elapsedSeconds', 0) for record in journey['records']) if all('elapsedSeconds' in record['invocation'] for record in journey['records']) else None,
            'totalTokens': usage['total_tokens'] if usage else None,
            'uncachedInputTokens': usage['input_tokens'] - usage['cached_input_tokens'] if usage and usage.get('cached_input_tokens') is not None else None,
        })
    return rows


def main(suite=None):
    # A suite supplies fixtures/oracles; the permission, conversation and usage protocol stays shared.
    suite_here = suite.HERE if suite else HERE
    prepare_case = suite.prepare if suite else prepare
    grade_case = suite.grade if suite else grade
    calibrate_case = suite.calibration if suite else calibration
    calibrate_compliance = suite.compliance_calibration if suite else compliance_calibration
    scenario = json.loads((suite_here / 'scenarios.json').read_text())
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument('--run', action='store_true')
    mode.add_argument('--calibrate-only', action='store_true')
    parser.add_argument('--track', choices=['implementation', 'planning', 'compliance'], default='implementation')
    parser.add_argument('--model', default='gpt-6-sol')
    parser.add_argument('--case', choices=[case['id'] for case in scenario['cases']], help='Run one paired case')
    parser.add_argument('--timeout', type=int, default=300, help='Same per-call seconds for both arms')
    args = parser.parse_args()
    if args.timeout < 1: parser.error('--timeout must be positive')
    output = suite_here / 'results' / time.strftime('%Y-%m-%dT%H%M%S')
    output.mkdir(parents=True, exist_ok=False)
    compliance = json.loads((suite_here / 'compliance.json').read_text()) if args.track == 'compliance' else None
    if compliance: scenario['compliance'] = compliance
    if args.case: scenario['cases'] = [case for case in scenario['cases'] if case['id'] == args.case]
    manifest = {'track': args.track, 'model': args.model, 'timeout': args.timeout, 'replicas': 1, 'scenario': scenario,
                'code': {str(p.relative_to(suite_here)): hashlib.sha256(p.read_bytes()).hexdigest() for p in suite_here.rglob('*') if p.is_file() and not any(part in {'results','__pycache__','validation'} for part in p.relative_to(suite_here).parts)},
                'protocol': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
                'executor': hashlib.sha256(Path(executor.__file__).read_bytes()).hexdigest(),
                'preparation': hashlib.sha256(Path(base.__file__).read_bytes()).hexdigest(),
                'preflight': hashlib.sha256((executor.HERE / 'preflight.mjs').read_bytes()).hexdigest(),
                'support': {name: hashlib.sha256((HERE.parent / 'v2' / name).read_bytes()).hexdigest() for name in ['connect.py', 'environment.py', 'prepare.py']},
                'toolchain': {'codex': subprocess.check_output([executor.codex_binary(), '--version'], text=True).strip(), 'node': subprocess.check_output(['node', '--version'], text=True).strip()},
                'runtime': {name: executor.inventory(base.REPO / name) for name in ['bundle', 'skills', 'references', 'mandatory-rules']},
                'config': executor.COMMON_CONFIG}
    manifest['hash'] = hashlib.sha256(json.dumps(manifest, sort_keys=True).encode()).hexdigest()
    executor.save(output / 'manifest.json', manifest)
    calls, journeys = 0, []
    def summary(status, reason=None):
        executor.save(output / 'summary.json', {'status': status, 'reason': reason, 'modelCalls': calls, 'manifestHash': manifest['hash'], 'journeys': journeys, 'comparison': comparison_rows(journeys)})
    if not args.run and not args.calibrate_only:
        summary('prepared-not-run'); print(output); return
    try:
        print('Preflight: isolation + evidence workflow (no model calls)', flush=True)
        preflight = subprocess.run([sys.executable, str(executor.HERE / 'run.py'), '--preflight-only', '--output', str(output / 'isolation')], capture_output=True, text=True)
        executor.save(output / 'isolation-process.json', {'exitCode': preflight.returncode, 'stdout': preflight.stdout, 'stderr': preflight.stderr})
        if preflight.returncode:
            raise RuntimeError('Isolation/evidence preflight failed; no model calls')
        with tempfile.TemporaryDirectory(prefix='fs-network-calibration-') as temp:
            project = Path(temp).resolve() / 'project'
            prepare_case(project, scenario['cases'][0], scenario)
            calibrate_case(project, scenario['cases'], output / 'calibration')
            if compliance: calibrate_compliance(project, scenario['cases'], output / 'compliance-calibration')
        if args.calibrate_only:
            summary('calibrated'); print(output); return
        for number, case in enumerate(scenario['cases']):
            for arm in (['plain', 'fs'] if number % 2 == 0 else ['fs', 'plain']):
                destination = output / f"{case['id']}-{arm}"
                destination.mkdir()
                with tempfile.TemporaryDirectory(prefix='fs-network-pilot-') as temp:
                    project = Path(temp).resolve() / 'project'
                    runtime = prepare_case(project, case, scenario)
                    for name, expected in manifest['runtime'].items():
                        if executor.inventory(runtime / name) != expected: raise RuntimeError('Runtime changed since manifest')
                    runtime_hashes = executor.inventory(runtime)
                    configs = executor.permissions(project, 'fs' if arm == 'fs' else 'baseline')
                    if arm == 'fs': configs += executor.fs_config(project)
                    instruction = ('Use fs-plan and fs-work from ../runtime/skills; follow evidence-led-design.md and frontend-system MCP. New plans require evidence. ' if arm == 'fs' else 'Use your ordinary planning/coding process. ')
                    instruction += 'Reference material is available in ../runtime/references/learned and ../runtime/mandatory-rules. Read CONTRACT.md. Do not use other models, conversations, network, or install dependencies. Keep CONTRACT.md, PROVIDED_PLAN.md, USER_DECISIONS.md (when supplied) and package.json unchanged. Questions/planning turns must not edit product files.'
                    configs += ['developer_instructions=' + json.dumps(instruction)]
                    plan = scenario['implementationPlan'] + (' api.mjs는 이미 적합하므로 바이트 단위로 보존한다.' if case['preserveClient'] else '')
                    if args.track in {'implementation', 'compliance'}:
                        (project / 'PROVIDED_PLAN.md').write_text(plan + (compliance['plan'] if compliance else ''))
                        phases = [('prepare', 'PROVIDED_PLAN.md의 설계에 따라 코드를 조사하고 이 계약만 구현할 계획과 검증을 준비하세요. 제품 코드는 아직 변경하지 마세요.'), ('work', 'PROVIDED_PLAN.md와 일치하는 계획의 구현을 승인합니다. 구현·검증하고 완료 근거를 기록하세요.')]
                    else:
                        phases = [('questions', case['description'] + '\n먼저 코드 조사 후 필요한 질문만 작성하세요. 구현하지 마세요.\n' + scenario['planningProtocol']), ('plan', '')]
                    if compliance:
                        phases[0] = ('prepare', phases[0][1] + '\n' + compliance.get('intro', 'Q1은 미결정입니다. 승인된 나머지 계약을 보존하고 다음 질문 절차를 따르세요.') + '\n' + compliance['questionProtocol'])
                    baseline = base.product_files(project)
                    locked = {name: (project / name).read_bytes() for name in ['CONTRACT.md', 'package.json', 'PROVIDED_PLAN.md'] if (project / name).exists()}
                    previous, records, trace = None, [], []
                    for phase, prompt in phases:
                        if compliance and phase == 'work':
                            decision_text = json.dumps(answers, ensure_ascii=False, indent=2)
                            (project / 'USER_DECISIONS.md').write_text(decision_text)
                            locked['USER_DECISIONS.md'] = (project / 'USER_DECISIONS.md').read_bytes()
                            prompt = '답변은 USER_DECISIONS.md에 있습니다. PROVIDED_PLAN.md와 이 답변에 정확히 일치하는 구현을 승인합니다. 다른 설계 변경은 승인하지 않습니다. 답변을 계획에 반영한 뒤 구현하세요. 구현·검증하고 완료 근거를 기록하세요.'
                        if phase == 'plan': prompt = '질문한 항목에 대한 제품 답변입니다:\n' + json.dumps(answers, ensure_ascii=False) + '\n최종 계획 또는 남은 중요 미결정 사항을 기록하세요. 제공되지 않은 답을 사용자 결정으로 만들지 마세요. 구현은 하지 마세요.'
                        before = base.product_files(project)
                        for attempt in range(2 if phase == 'work' else 1):
                            target = destination / phase / str(attempt)
                            print(f"Running {args.model} / {case['id']} / {arm} / {phase} / {attempt + 1}", flush=True)
                            calls += 1
                            result = executor.invoke(project, target / 'model', args.model, prompt, configs, timeout=args.timeout, env=executor.runtime_env(), previous=previous)
                            previous = result
                            infra = executor.environment_failure(result, target / 'model')
                            trace.extend(tool_calls(target / 'model/events.jsonl'))
                            unchanged = phase == 'work' or before == base.product_files(project)
                            if executor.inventory(runtime) != runtime_hashes: raise RuntimeError('Protected runtime changed')
                            if result['exitCode'] or result['completedTurns'] != 1 or infra:
                                report = {'status': 'unverified', 'eligible': False, 'reason': infra or 'Invocation incomplete'}
                            elif not unchanged or any(not (project / name).exists() or (project / name).read_bytes() != content for name, content in locked.items()):
                                report = {'status': 'protocol-failed', 'eligible': False, 'reason': 'Plan-stage product edit or immutable input changed'}
                            else:
                                report = (grade_case(project, case, target / 'grader', compliance=True, baseline=baseline) if compliance else grade_case(project, case, target / 'grader')) if phase == 'work' else {'status': 'recorded-not-semantically-graded', 'eligible': True}
                            if (phase == 'questions' or compliance and phase == 'prepare') and report['eligible']:
                                try:
                                    questions, answers = selected_answers((target / 'model/final.md').read_text(), compliance['answers'] if compliance else case['answers'])
                                    if compliance and not set(compliance['requiredTopics']).issubset(answers):
                                        raise ValueError('Q1-required-question-before-implementation: missing required question')
                                    executor.save(target / 'interaction.json', {'questions': questions, 'answersProvided': answers, 'semanticQuestionReview': 'unverified'})
                                except (ValueError, KeyError) as error:
                                    report = {'status': 'protocol-failed', 'eligible': False, 'reason': str(error)}
                            shutil.copytree(project, target / 'snapshot', symlinks=True, ignore=shutil.ignore_patterns('.git', 'node_modules', 'dist'))
                            record = {'phase': phase, 'attempt': attempt, 'invocation': result, 'grade': report}
                            executor.save(target / 'record.json', record); records.append(record)
                            if infra: raise RuntimeError(infra)
                            if report['eligible'] or report['status'] != 'graded': break
                            prompt = '계획을 바꾸지 말고 다음 외부 실패를 수정하세요: ' + ', '.join(row['id'] for row in report['results'] if row['status'] != 'passed')
                        if not report['eligible']: break
                    successful = [item for item in trace if not item['error']]
                    names = {item['tool'] for item in successful}
                    routed = any(item['tool'] == 'get_work_context' and isinstance(item['response'], dict) and item['response'].get('routing', {}).get('hash') for item in successful)
                    evidence_saved = any(item['tool'] == 'save_revision' and isinstance(item['response'], dict) and (item['response'].get('evidence') or item['response'].get('evidenceStatus') == 'recorded') for item in successful)
                    workflow = arm != 'fs' or (routed and evidence_saved and 'save_project_context' in names and (args.track not in {'implementation', 'compliance'} or any(item['tool'] == 'save_execution' and item['arguments'].get('execution', {}).get('status') == 'complete' for item in successful)))
                    usage_complete = all(row['invocation']['usage'] is not None and not row['invocation']['errors'] for row in records)
                    usage = {key: (sum(row['invocation']['usage'][key] for row in records) if all(key in row['invocation']['usage'] for row in records) else None) for key in ['input_tokens', 'output_tokens', 'total_tokens', 'cached_input_tokens']} if usage_complete else None
                    journey = {'case': case['id'], 'arm': arm, 'records': records, 'workflow': 'observed' if workflow else 'workflow-failed', 'trace': trace,
                               'usage': usage, 'planCompliance': report.get('planCompliance'), 'questionProtocol': ('observed' if compliance and any(row['phase'] == 'prepare' and row['grade']['eligible'] for row in records) else 'unverified'), 'semanticReview': 'unverified', 'eligible': args.track in {'implementation', 'compliance'} and records[-1]['phase'] == 'work' and report['eligible'] and workflow}
                    executor.save(destination / 'journey.json', journey); journeys.append(journey); summary('running')
                    if report['status'] == 'unverified' and records[-1]['invocation']['completedTurns'] == 1 and records[-1]['invocation']['exitCode'] == 0:
                        raise RuntimeError('Grader infrastructure failed; stop before further model calls')
        summary('completed')
    except (OSError, RuntimeError, subprocess.SubprocessError) as error:
        summary('blocked', str(error)); print(f'Blocked: {error}')
        print(output); raise SystemExit(1)
    print(output)


if __name__ == '__main__': main()
