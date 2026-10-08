#!/usr/bin/env python3
"""Fixed-answer plan/work comparison. Reuses the existing isolated Codex executor."""
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
REPO = HERE.parents[4]
sys.path.insert(0, str(HERE.parent / 'maintenance'))
module_spec = importlib.util.spec_from_file_location('maintenance_executor', HERE.parent / 'maintenance/run.py')
executor = importlib.util.module_from_spec(module_spec)
module_spec.loader.exec_module(executor)
from environment import browser_environment  # noqa: E402


def product_files(project):
    return {name: value for name, value in executor.inventory(project).items()
            if not any(part in {'.git', '.frontend-system', 'node_modules', 'dist'} for part in Path(name).parts)
            and Path(name).suffix != '.md'}


def knowledge_trace(path):
    rows = []
    for line in path.read_text().splitlines():
        try:
            event = json.loads(line)
        except ValueError:
            continue
        item = event.get('item', {})
        if event.get('type') != 'item.completed' or item.get('type') != 'mcp_tool_call':
            continue
        if item.get('tool') not in {'discover_knowledge_triggers', 'inspect_code_knowledge', 'read_learned_knowledge', 'save_knowledge_review'}:
            continue
        text = '\n'.join(block.get('text', '') for block in (item.get('result') or {}).get('content', []) if block.get('type') == 'text')
        row = {'tool': item['tool'], 'input': item.get('arguments')}
        try:
            result = json.loads(text)
            row['candidateIds'] = [entry['id'] for entry in result.get('candidates', result.get('entries', []))]
            row['checklistCount'] = len(result.get('checklist', []))
        except (ValueError, AttributeError):
            row['response'] = text[:1200]
        rows.append(row)
    return {'calls': rows, 'adoption': 'unverified; inspect conditions, decisions, code and checks; direct shell reads are not counted here'}


def prepare(project):
    shutil.copytree(HERE / 'fixture', project)
    runtime = project.parent / 'runtime'
    runtime.mkdir()
    for folder in ['bundle', 'skills', 'references', 'mandatory-rules']:
        shutil.copytree(REPO / folder, runtime / folder)
    shutil.copy(REPO / 'package.json', runtime / 'package.json')
    for package in ['react', 'react-dom', 'scheduler', 'playwright', 'playwright-core', '@playwright/test']:
        shutil.copytree(REPO / 'test/fixtures/frontend/node_modules' / package, runtime / 'node_modules' / package)
    for package in ['esbuild', '@esbuild']:
        shutil.copytree(REPO / 'node_modules' / package, runtime / 'node_modules' / package)
    (runtime / 'build.mjs').write_text("import {build} from './node_modules/esbuild/lib/main.js';\n"
        "await build({entryPoints:['App.jsx'],bundle:true,outdir:'dist',platform:'browser',format:'esm'});\n")
    (project / 'node_modules').symlink_to(runtime / 'node_modules', target_is_directory=True)
    (project / 'package.json').write_text(json.dumps({'type': 'module', 'scripts': {
        'test': 'node --test', 'build': 'node ../runtime/build.mjs'}}))
    for command in [['git', 'init', '-q', '-b', 'main'], ['git', 'add', '.'],
                    ['git', '-c', 'user.name=FS Eval', '-c', 'user.email=eval@localhost', 'commit', '-qm', 'Fixed React starter']]:
        subprocess.run(command, cwd=project, check=True, capture_output=True, env={**os.environ, **executor.runtime_env()})
    return runtime


def grade(project, profile, stage, output, browser_env):
    output.mkdir(parents=True, exist_ok=True)
    result_path = output / 'grade.json'
    try:
        child = subprocess.run(['node', str(HERE / 'evaluate.mjs'), str(project), profile, stage, str(result_path)],
                               capture_output=True, text=True, timeout=180, env={**os.environ, **browser_env})
        (output / 'stdout.log').write_text(child.stdout)
        (output / 'stderr.log').write_text(child.stderr)
        if child.returncode or not result_path.exists():
            raise RuntimeError('Build/grader did not complete; inspect grader logs')
        return json.loads(result_path.read_text())
    except (OSError, RuntimeError, subprocess.TimeoutExpired) as error:
        report = {'eligible': False, 'status': 'unverified', 'reason': str(error), 'results': []}
        executor.save(result_path, report)
        return report


def reference(profile, stage):
    """One human-written valid example, not a required structure or AI result."""
    code = (HERE / 'fixture/App.jsx').read_text()
    # Calibration must accept user-facing errors, not require raw API messages.
    code = code.replace('setError(error.message);', "setError('주문을 완료하지 못했습니다. 다시 시도해주세요.');")
    code = code.replace("  await api.track('quote-viewed', values);", """
  if (!(PROFILE === 'independent' && values.kind === 'gift')) {
    try { await api.track('quote-viewed', values); } catch { /* Analytics is best effort. */ }
  }""")
    code = code.replace("    setPending(true);", """
    const quantity = Number(values.quantity);
    const memberAllowed = CHANGED && (kind === 'purchase' || PROFILE === 'shared');
    if (quantity > 10 || !['', 'SAVE', ...(memberAllowed ? ['MEMBER'] : [])].includes(values.coupon) ||
        (values.coupon === 'MEMBER' && quantity < 2)) {
      setError('수량과 쿠폰을 확인해주세요.');
      return;
    }
    setPending(true);""")
    code = code.replace('      setResult(order.id);', """
      if (PROFILE === 'independent' && kind === 'gift') {
        try { await api.track('gift-ordered', input); } catch { /* Preserve order success. */ }
      }
      setResult(order.id);""")
    return f'const PROFILE = {json.dumps(profile)}; const CHANGED = {json.dumps(stage == "change")};\n' + code


def calibrate(project, output, browser_env):
    rows = []
    for profile in ['independent', 'shared']:
        for stage in ['initial', 'change']:
            valid = reference(profile, stage)
            variants = [('correct', valid),
                        ('missing-error-notice', valid.replace("setError('주문을 완료하지 못했습니다. 다시 시도해주세요.');", "setError('');")),
                        ('blocking-analytics', valid.replace("try { await api.track('quote-viewed', values); } catch { /* Analytics is best effort. */ }", "await api.track('quote-viewed', values);")),
                        ('required-optional-message', valid.replace('    setPending(true);', "    if (kind === 'gift' && !values.message) { setError('message required'); return; }\n    setPending(true);"))]
            if stage == 'change':
                variants.append(('wrong-policy-scope', valid.replace("(kind === 'purchase' || PROFILE === 'shared')", "(kind === 'purchase' || PROFILE === 'independent')")))
            for name, code in variants:
                (project / 'App.jsx').write_text(code)
                report = grade(project, profile, stage, output / profile / stage / name, browser_env)
                rows.append({'profile': profile, 'stage': stage, 'variant': name, 'eligible': report['eligible'], 'status': report['status']})
                if report['status'] == 'unverified' or report['eligible'] != (name == 'correct'):
                    executor.save(output / 'summary.json', {'status': 'calibration-failed', 'rows': rows, 'modelCalls': 0})
                    raise RuntimeError('Behavior grader calibration failed; do not spend model tokens')
    executor.save(output / 'summary.json', {'status': 'calibrated', 'rows': rows, 'modelCalls': 0})


def main():
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument('--run', action='store_true', help='Runs real models after isolation and grader calibration')
    mode.add_argument('--calibrate-only', action='store_true', help='Real restricted browser, zero model calls')
    parser.add_argument('--model', default='gpt-6-sol')
    parser.add_argument('--arms', nargs='+', choices=['plain', 'knowledge', 'fs'], default=['plain', 'knowledge', 'fs'])
    parser.add_argument('--profiles', nargs='+', choices=['independent', 'shared'], default=['independent', 'shared'])
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    output = (args.output or HERE / 'results' / time.strftime('%Y-%m-%dT%H%M%S')).resolve()
    output.mkdir(parents=True, exist_ok=False)
    scenario = json.loads((HERE / 'scenario.json').read_text())
    manifest = {'version': 1, 'track': 'fixed-answers/plan-work/frontend-fundamentals', 'model': args.model,
                'toolchain': {'codex': subprocess.check_output([executor.codex_binary(), '--version'], text=True).strip(),
                              'node': subprocess.check_output(['node', '--version'], text=True).strip(),
                              'esbuild': json.loads((REPO / 'node_modules/esbuild/package.json').read_text())['version']},
                'arms': args.arms, 'profiles': args.profiles, 'timeoutPerCallSeconds': 300, 'externalRepairsPerStage': 1,
                'order': [{'profile': profile, 'arm': arm} for number, profile in enumerate(args.profiles)
                          for arm in (args.arms if number % 2 == 0 else list(reversed(args.arms)))],
                'scenario': scenario, 'fixture': executor.inventory(HERE / 'fixture'),
                'files': {name: hashlib.sha256((HERE / name).read_bytes()).hexdigest() for name in ['run.py', 'evaluate.mjs', 'scenario.json']},
                'executorHash': hashlib.sha256(Path(executor.__file__).read_bytes()).hexdigest(),
                'supportHashes': {name: hashlib.sha256((HERE.parent / 'maintenance' / name).read_bytes()).hexdigest() for name in ['preflight.mjs']},
                'legacySupportHashes': {name: hashlib.sha256((HERE.parent.parent / 'v2' / name).read_bytes()).hexdigest() for name in ['environment.py', 'connect.py', 'prepare.py']},
                'executorConfig': executor.COMMON_CONFIG,
                'dependencyVersions': {name: json.loads((REPO / 'test/fixtures/frontend/node_modules' / name / 'package.json').read_text())['version'] for name in ['react', 'react-dom', 'scheduler', 'playwright', 'playwright-core', '@playwright/test']},
                'runtime': {folder: executor.inventory(REPO / folder) for folder in ['bundle', 'skills', 'references', 'mandatory-rules']},
                'sourceHashes': {}, 'sourceReviewStates': {},
                'limits': ['All fixed answers are given after questions to equalize implementation information; this is not selective interactive answering.',
                           'Question relevance, semantic knowledge use and architecture require independent review; no aggregate quality score.']}
    catalog = json.loads((REPO / 'knowledge/catalog.json').read_text())
    for source_id in scenario['sourceIds']:
        document = catalog['documents'][source_id]
        manifest['sourceHashes'][source_id] = hashlib.sha256((REPO / document['path']).read_bytes()).hexdigest()
        manifest['sourceReviewStates'][source_id] = document.get('sourceReview', {}).get('status', 'legacy-unreviewed')
    manifest['hash'] = hashlib.sha256(json.dumps(manifest, sort_keys=True).encode()).hexdigest()
    executor.save(output / 'manifest.json', manifest)
    if not args.run and not args.calibrate_only:
        executor.save(output / 'summary.json', {'status': 'prepared-not-run', 'modelCalls': 0, 'manifestHash': manifest['hash']})
        print(output)
        return
    calls, journeys = 0, []
    try:
        print('Preflight: existing permission/Git/MCP isolation checks (no model calls)', flush=True)
        preflight = subprocess.run([sys.executable, str(HERE.parent / 'maintenance/run.py'), '--preflight-only', '--output', str(output / 'isolation')], capture_output=True, text=True)
        executor.save(output / 'isolation-process.json', {'exitCode': preflight.returncode, 'stdout': preflight.stdout, 'stderr': preflight.stderr})
        if preflight.returncode:
            raise RuntimeError('Isolation preflight failed; see isolation/summary.json and isolation-process.json')
        with tempfile.TemporaryDirectory(prefix='fs-fundamentals-preflight-') as temp:
            project = Path(temp).resolve() / 'project'
            prepare(project)
            broker_output = output / 'browser'
            broker_output.mkdir()
            with browser_environment(project, broker_output) as browser_env:
                calibrate(project, output / 'calibration', browser_env)
        if args.calibrate_only:
            executor.save(output / 'summary.json', {'status': 'calibrated', 'modelCalls': 0, 'manifestHash': manifest['hash']})
            print(output)
            return
        for cell in manifest['order']:
            destination = output / f"{cell['profile']}-{cell['arm']}"
            destination.mkdir()
            with tempfile.TemporaryDirectory(prefix='fs-fundamentals-') as temp:
                project = Path(temp).resolve() / 'project'
                runtime = prepare(project)
                for folder, expected in manifest['runtime'].items():
                    if executor.inventory(runtime / folder) != expected:
                        raise RuntimeError('Runtime changed since manifest preparation')
                runtime_before = executor.inventory(runtime)
                (project / 'CONTRACT.md').write_text(scenario['publicContract'])
                arm = cell['arm']
                configs = executor.permissions(project, 'fs' if arm == 'fs' else 'baseline')
                if arm == 'plain':
                    configs = [value[:-1] + ',' + ','.join(json.dumps(str(runtime / folder)) + '="deny"' for folder in ['references', 'mandatory-rules']) + '}'
                               if value.startswith('permissions.eval.filesystem=') else value for value in configs]
                if arm == 'fs': configs += executor.fs_config(project)
                instruction = ('Use FS skills: fs-plan for question/plan turns, fs-work only after the explicit implementation request. Read them from ../runtime/skills and use frontend-system MCP. ' if arm == 'fs' else 'Use your ordinary planning and coding workflow. ')
                instruction += ('The shared knowledge corpus is ../runtime/references/learned and ../runtime/mandatory-rules. Read relevant material. ' if arm != 'plain' else '')
                instruction += 'Work only in this project. Read CONTRACT.md. Do not use other conversations, models, web, or install dependencies. Questions and plans must precede product edits. The evaluator supplies fixed product answers and simulated implementation authorization. Keep package.json, CONTRACT.md and money.mjs unchanged. Record plan decisions and tests in project files; no prescribed architecture.'
                configs += ['developer_instructions=' + json.dumps(instruction)]
                answers = '\n'.join(item['answer'] for item in scenario['answers'][cell['profile']])
                phases = [('questions', scenario['initialRequest'], None),
                          ('plan', '제품 담당자의 고정 답변입니다.\n' + answers + '\n이 답변을 반영한 최종 계획과 검증 방법을 제시해주세요. 구현은 아직 하지 마세요.', None),
                          ('work-initial', '평가의 모의 사용자로서 앞서 제시한 현재 요구 범위의 계획을 승인합니다. 이제 구현·검증해주세요. 새 요구는 추가하지 않습니다.', 'initial'),
                          ('plan-change', scenario['followupRequest'], None),
                          ('work-change', '평가의 모의 사용자로서 방금 제시한 회원 쿠폰 변경 계획을 승인합니다. 이제 구현·검증하고 다른 흐름의 기존 계약을 보존해주세요.', 'change')]
                previous, records = None, []
                with browser_environment(project, destination) as browser_env:
                    for phase, prompt, stage in phases:
                        before = product_files(project)
                        for attempt in range(2 if stage else 1):
                            target = destination / phase / str(attempt)
                            print(f'Running {args.model} / {cell["profile"]} / {arm} / {phase} / {attempt + 1}', flush=True)
                            calls += 1
                            result = executor.invoke(project, target / 'model', args.model, prompt, configs, timeout=300, env=executor.runtime_env(), previous=previous)
                            previous = result
                            problem = executor.environment_failure(result, target / 'model')
                            if executor.inventory(runtime) != runtime_before:
                                raise RuntimeError('Read-only runtime changed')
                            plan_unchanged = stage is not None or product_files(project) == before
                            if problem or result['exitCode'] or result['completedTurns'] != 1:
                                report = {'eligible': False, 'status': 'unverified', 'reason': problem or 'Invocation incomplete', 'results': []}
                            elif not plan_unchanged:
                                report = {'eligible': False, 'status': 'protocol-failed', 'reason': 'Product edited during plan phase', 'results': []}
                            else:
                                report = grade(project, cell['profile'], stage, target / 'grader', browser_env) if stage else {'eligible': True, 'status': 'plan-recorded-not-semantically-graded', 'results': []}
                            shutil.copytree(project, target / 'snapshot', symlinks=True, ignore=shutil.ignore_patterns('.git', 'node_modules', 'dist'))
                            record = {'phase': phase, 'attempt': attempt, 'invocation': result, 'grade': report, 'planProductUnchanged': plan_unchanged,
                                      'knowledgeTrace': knowledge_trace(target / 'model/events.jsonl')}
                            executor.save(target / 'record.json', record)
                            records.append(record)
                            if report['status'] == 'unverified' and (problem or not result['timedOut']):
                                raise RuntimeError(report.get('reason', 'Grader unavailable'))
                            if report['eligible'] or report['status'] == 'protocol-failed' or result['timedOut']: break
                            prompt = '합의한 요구사항을 유지하면서 다음 외부 검사 실패를 수정해주세요: ' + ', '.join(row['id'] for row in report['results'] if row['status'] != 'passed')
                        if not report['eligible']: break
                complete_usage = all(row['invocation']['usage'] is not None and not row['invocation']['errors'] for row in records)
                record = {**cell, 'threadId': previous['threadId'], 'records': records,
                          'behaviorEligible': records[-1]['phase'] == 'work-change' and records[-1]['grade']['eligible'],
                          'semanticReview': 'unverified', 'questionReview': 'unverified',
                          'usage': {key: sum(row['invocation']['usage'][key] for row in records) for key in ['input_tokens', 'output_tokens', 'total_tokens']} if complete_usage else None}
                if record['usage'] is not None:
                    for key in ['cached_input_tokens', 'reasoning_output_tokens']:
                        record['usage'][key] = sum(row['invocation']['usage'][key] for row in records) if all(type(row['invocation']['usage'].get(key)) is int for row in records) else None
                executor.save(destination / 'journey.json', record)
                journeys.append(record)
                executor.save(output / 'summary.json', {'status': 'running', 'modelCalls': calls, 'manifestHash': manifest['hash'], 'journeys': journeys})
        executor.save(output / 'summary.json', {'status': 'completed', 'modelCalls': calls, 'manifestHash': manifest['hash'], 'journeys': journeys})
    except (OSError, RuntimeError, subprocess.SubprocessError) as error:
        executor.save(output / 'summary.json', {'status': 'blocked', 'reason': str(error), 'modelCalls': calls, 'manifestHash': manifest['hash'], 'journeys': journeys})
        print(f'Blocked: {error}\n{output}')
        raise SystemExit(1)
    print(output)


if __name__ == '__main__':
    main()
