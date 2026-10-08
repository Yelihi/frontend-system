#!/usr/bin/env python3
"""Run the frozen v2 pairs; all implementation sessions are fresh and restricted."""
import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import shutil
import signal
import subprocess
import tempfile
import time
from prepare import HERE, REPO, prepare
from connect import MODELS, COMMON_CONFIG, invoke
from environment import permission_config, browser_environment

spec = importlib.util.spec_from_file_location('browser_calibrate', HERE / 'browser-calibrate.py')
browser_calibrate = importlib.util.module_from_spec(spec)
spec.loader.exec_module(browser_calibrate)

PROCEDURE_TOOLS = ['list_project_files', 'list_plans', 'get_workflow_context', 'get_revision',
    'save_revision', 'approve_revision', 'save_project_record', 'get_project_record', 'save_execution',
    'get_check_record', 'begin_work_attempt', 'save_semantic_review', 'inspect_project', 'configure_project',
    'get_project_snapshot', 'record_project_refresh', 'get_project_document', 'read_project_source',
    'save_project_context', 'get_work_context', 'get_change_context', 'run_project_checks']
EXCLUDED = {'node_modules', '.next', '.git', 'playwright-report', 'test-results', '.runtime'}
CHECKS = ['lint', 'typecheck', 'test:unit', 'build', 'test:e2e']
ENVIRONMENT_NOTE = '''
환경: 설치된 의존성과 제공한 mandatory-rules/ 원문을 사용하세요. lint, typecheck,
test:unit, build, test:e2e를 실행하고 현재 소스에 연결된 결과를 기록하세요.
Playwright Test는 PW_TEST_CONNECT_WS_ENDPOINT에 설정된 격리 Chromium을 자동 사용합니다.
직접 Playwright 스크립트는 chromium.connect(process.env.PW_TEST_CONNECT_WS_ENDPOINT)를 사용하세요.
검사 실패의 전체 수정 시도는 최대 3회이며 개별 테스트 개발 실행은 이 횟수와 구분합니다.
설계·구현·검증은 위의 구체 계약 범위에서 승인됐습니다. 해당 범위의 계획 기록을 위해
재승인을 요청할 필요가 없습니다. 새로운 제품 요구나 범위 변경을 만들지 마세요.
이 디렉터리와 제공된 ../runtime(FS 조건만) 외의 평가·개인 자료는 읽지 마세요.
'''


def save(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


def inventory(root, exclude=()):
    result = {}
    for directory, dirs, files in os.walk(root):
        dirs[:] = sorted(d for d in dirs if d not in exclude)
        for name in sorted(files):
            path = Path(directory) / name
            if not path.is_symlink():
                result[str(path.relative_to(root))] = hashlib.sha256(path.read_bytes()).hexdigest()
    return result


def setup(project, experiment, arm, dependencies=True):
    prepare(project, dependencies=dependencies, experiment=experiment)
    shutil.copytree(REPO / 'mandatory-rules', project / 'mandatory-rules')
    task = project / 'TASK.md'
    task.write_text(task.read_text() + ENVIRONMENT_NOTE)
    if arm == 'fs':
        runtime = project.parent / 'runtime'
        runtime.mkdir()
        for folder in ('bundle', 'skills', 'references', 'mandatory-rules'):
            shutil.copytree(REPO / folder, runtime / folder,
                            ignore=shutil.ignore_patterns('learned') if experiment == 'A' and folder == 'references' else None)
        if experiment == 'B':
            shutil.copytree(REPO / 'knowledge', runtime / 'knowledge')
        shutil.copyfile(REPO / 'package.json', runtime / 'package.json')
    for args in (['init', '-q', '-b', 'main'], ['add', '.'],
                 ['-c', 'user.name=FS Evaluation', '-c', 'user.email=eval@localhost', 'commit', '-qm', 'Fixed starter']):
        subprocess.run(['git', *args], cwd=project, check=True, capture_output=True)


def fs_config(project, experiment, env):
    wrapper = ['sandbox', '-C', str(project), '-P', 'eval']
    for value in permission_config(project):
        wrapper += ['-c', value]
    wrapper += ['node', str(project.parent / 'runtime/bundle/mcp.js')]
    configs = ['mcp_servers.frontend-system.command=' + json.dumps(shutil.which('codex')),
               'mcp_servers.frontend-system.args=' + json.dumps(wrapper),
               'mcp_servers.frontend-system.env={' + ','.join(json.dumps(k) + '=' + json.dumps(v) for k, v in env.items()) + '}',
               'mcp_servers.frontend-system.startup_timeout_sec=30',
               'mcp_servers.frontend-system.tool_timeout_sec=300']
    if experiment == 'A':
        configs.append('mcp_servers.frontend-system.enabled_tools=' + json.dumps(PROCEDURE_TOOLS))
    return configs


def instruction(experiment, arm):
    value = 'Complete the task in TASK.md. Use only this project and the supplied runtime. No web, extra models, external services, installs, or personal/session history. '
    if arm == 'fs':
        value += 'Use Frontend System: read ../runtime/skills/fs-plan/SKILL.md, then ../runtime/skills/fs-work/SKILL.md and follow their procedures with the frontend-system MCP. '
        if experiment == 'A':
            value += 'This is the procedure-only condition. Learned/source knowledge, knowledge search, optional design tools and knowledge-sync procedures are excluded. Follow planning, pinned policy, validation and completion procedures; skip learned-knowledge instructions. The remaining workflow guidance is inseparable from the procedure and is included in its cost. '
    return value


def freeze(output):
    if (HERE / 'frozen.json').exists():
        raise RuntimeError('Already frozen')
    readiness = json.loads((HERE / 'results/readiness.json').read_text())
    assert readiness['readyForModelRuns'], 'Readiness evidence must be reviewed first'
    schedule = []
    for experiment in ('A', 'B'):
        for repeat in range(3):
            models = MODELS[repeat:] + MODELS[:repeat]
            for model in models:
                for arm in (['plain', 'fs'] if (repeat + (experiment == 'B')) % 2 == 0 else ['fs', 'plain']):
                    schedule.append(dict(experiment=experiment, model=model, arm=arm, repeat=repeat + 1))
    with tempfile.TemporaryDirectory(prefix='fs-v2-baselines-') as scratch:
        initial_files = {}
        for experiment in ('A', 'B'):
            baseline = Path(scratch) / experiment
            setup(baseline, experiment, 'plain', dependencies=False)
            initial_files[experiment] = inventory(baseline, EXCLUDED)
    manifest = {'schemaVersion': 2, 'schedule': schedule, 'timeoutSeconds': 900, 'initialFiles': initial_files,
                'reasoningEffort': 'medium', 'commonConfig': COMMON_CONFIG, 'environmentNote': ENVIRONMENT_NOTE,
                'procedureToolsA': PROCEDURE_TOOLS, 'fsSnapshot': json.loads((HERE / 'results/current-fs-snapshot.json').read_text()),
                'files': {str(path.relative_to(HERE.parent)): hashlib.sha256(path.read_bytes()).hexdigest()
                          for path in [*HERE.glob('*.py'), *HERE.glob('*.mjs'), HERE / 'public-assets.json', HERE.parent / 'v2-protocol.md', HERE.parent / 'v2-oracle.md']},
                'readiness': readiness, 'createdAt': time.strftime('%Y-%m-%dT%H:%M:%S'),
                'infraExclusions': 'Only executor/provider unavailability before an implementation turn or evaluator crash. Model timeout, contract/rule failure and refusal are outcomes. Never replace a completed implementation.',
                'usageAccounting': 'Sum provider turn.completed usage. Missing usage is null, not zero; input+output total; cached and reasoning are not added again.',
                'browser': 'Fresh repository-read-denied Chromium process, localhost Playwright WebSocket; command and MCP executors use the same restricted Codex profile.'}
    output.mkdir(parents=True, exist_ok=False)
    save(output / 'manifest.json', manifest)
    save(HERE / 'frozen.json', {'output': str(output), 'manifestSha256': hashlib.sha256((output / 'manifest.json').read_bytes()).hexdigest()})
    return manifest


def evaluate(project, output):
    output.mkdir()
    before = inventory(project, EXCLUDED)
    checks = []
    for script in CHECKS:
        with (output / (script.replace(':', '-') + '.log')).open('w') as log:
            started = time.monotonic()
            process = subprocess.Popen(['npm', 'run', script], cwd=project, stdout=log, stderr=subprocess.STDOUT,
                                       env={**os.environ, 'NEXT_TELEMETRY_DISABLED': '1'}, start_new_session=True)
            try:
                code = process.wait(timeout=300)
            except subprocess.TimeoutExpired:
                code = 'timeout'
            finally:
                try:
                    os.killpg(process.pid, signal.SIGKILL)
                except ProcessLookupError:
                    pass
                process.wait()
            checks.append({'script': script, 'exitCode': code, 'seconds': round(time.monotonic() - started, 3)})
    score = browser_calibrate.browser_grade(project, output / 'grade')
    save(output / 'checks.json', {'checks': checks, 'sourceBefore': before, 'sourceAfter': inventory(project, EXCLUDED)})
    return score


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--resume', type=Path)
    args = parser.parse_args()
    output = args.resume or HERE / 'results' / ('model-runs-' + time.strftime('%Y-%m-%dT%H%M%S'))
    manifest = json.loads((output / 'manifest.json').read_text()) if args.resume else freeze(output)
    assert hashlib.sha256((output / 'manifest.json').read_bytes()).hexdigest() == json.loads((HERE / 'frozen.json').read_text())['manifestSha256']
    for name, digest in manifest['files'].items():
        assert hashlib.sha256((HERE.parent / name).read_bytes()).hexdigest() == digest, name + ' changed after freeze'
    subprocess.run(['node', str(HERE / 'preflight.mjs'), str(output / 'preflight')], check=True)
    for index, case in enumerate(manifest['schedule'], 1):
        target = output / f'{index:02d}'
        if (target / 'complete.json').exists():
            continue
        if target.exists():
            raise RuntimeError('Interrupted run preserved; adjudicate before resuming: ' + str(target))
        target.mkdir()
        save(target / 'case.json', case)
        for name, digest in manifest['fsSnapshot']['files'].items():
            assert hashlib.sha256((REPO / name).read_bytes()).hexdigest() == digest, name + ' changed after freeze'
        workspace = Path(tempfile.mkdtemp(prefix='fs-v2-run-')).resolve()
        project = workspace / 'project'
        print('START ' + str(index) + '/36 ' + json.dumps(case), flush=True)
        setup(project, case['experiment'], case['arm'])
        initial = inventory(project, EXCLUDED)
        assert initial == manifest['initialFiles'][case['experiment']], 'Starter drift'
        save(target / 'initial-files.json', initial)
        runtime_before = inventory(project.parent / 'runtime')
        with browser_environment(project, target) as env:
            configs = fs_config(project, case['experiment'], env) if case['arm'] == 'fs' else []
            configs += ['developer_instructions=' + json.dumps(instruction(case['experiment'], case['arm']))]
            result = invoke(project, target / 'model', case['model'], (project / 'TASK.md').read_text(), configs,
                            timeout=manifest['timeoutSeconds'], env=env)
        save(target / 'final-files.json', inventory(project, EXCLUDED))
        result['changedSharedInputs'] = [name for name, digest in initial.items()
            if name in ('TASK.md', 'common-rules.md', 'frontend-quality.md') or name.startswith('mandatory-rules/')
            if not (project / name).is_file() or hashlib.sha256((project / name).read_bytes()).hexdigest() != digest]
        assert inventory(project.parent / 'runtime') == runtime_before, 'Runtime mutated; preserve and stop'
        subprocess.run(['git', 'add', '-N', '.'], cwd=project, check=True)
        diff = subprocess.check_output(['git', 'diff', '--no-ext-diff', '--binary'], cwd=project)
        (target / 'changes.patch').write_bytes(diff)
        shutil.copytree(project, target / 'source', ignore=shutil.ignore_patterns(*EXCLUDED))
        score = evaluate(project, target / 'checks')
        result['automatedPassed'] = sum(case['status'] == 'passed' for case in score['cases'])
        result['qualityScore'] = None
        result['reviewStatus'] = 'independent-review-required'
        save(target / 'complete.json', result)
        shutil.rmtree(workspace)
        print('DONE ' + str(index) + ' ' + json.dumps(result), flush=True)


if __name__ == '__main__':
    main()
