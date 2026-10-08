#!/usr/bin/env python3
"""Equal-information maintenance with one conversation per journey. Never bypasses isolation."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import signal
import subprocess
import sys
import tempfile
import time
import uuid

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[4]
sys.path.insert(0, str(HERE.parent.parent / 'v2'))
from connect import COMMON_CONFIG  # noqa: E402
from environment import permission_config  # noqa: E402


def save(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


def inventory(root):
    return {str(p.relative_to(root)): hashlib.sha256(p.read_bytes()).hexdigest()
            for p in sorted(root.rglob('*')) if p.is_file() and not p.is_symlink()}


# Keep personal Git configuration outside both the model and MCP environments.
GIT_ENV = {'GIT_CONFIG_GLOBAL': '/dev/null', 'GIT_CONFIG_NOSYSTEM': '1',
           'GIT_CONFIG_COUNT': '2', 'GIT_CONFIG_KEY_0': 'core.excludesfile', 'GIT_CONFIG_VALUE_0': '/dev/null',
           'GIT_CONFIG_KEY_1': 'core.attributesfile', 'GIT_CONFIG_VALUE_1': '/dev/null'}


def codex_binary():
    return str(Path(shutil.which('codex')).resolve())


def runtime_env():
    # Launch the permitted real binary, not a shim traversing an unreadable current symlink.
    return {**GIT_ENV, 'PATH': str(Path(codex_binary()).parent) + os.pathsep + os.environ.get('PATH', '')}


def invoke(project, output, model, prompt, configs=(), timeout=300, env=None, previous=None):
    """Persist this journey only; resume its explicit ID, never the user's last conversation."""
    output.mkdir(parents=True, exist_ok=False)
    command = [codex_binary(), 'exec', '-C', str(project), '--ignore-user-config', '--ignore-rules',
               '--json', '--skip-git-repo-check', '-m', model, '-o', str(output / 'final.md')]
    for config in [*COMMON_CONFIG, *configs]:
        command += ['-c', config]
    command += ['resume', previous['threadId'], '-'] if previous else ['-']
    save(output / 'invocation.json', {'argv': command, 'prompt': prompt})
    started, timed_out = time.monotonic(), False
    with (output / 'events.jsonl').open('w') as stdout, (output / 'stderr.log').open('w') as stderr:
        child = subprocess.Popen(command, cwd=project, stdin=subprocess.PIPE, stdout=stdout, stderr=stderr,
                                 env={**os.environ, **(env or {})}, start_new_session=True)
        try:
            child.communicate(prompt.encode(), timeout=timeout)
        except subprocess.TimeoutExpired:
            timed_out = True
            try:
                os.killpg(child.pid, signal.SIGKILL)
            except ProcessLookupError:
                pass
            child.communicate()
        finally:
            try:
                os.killpg(child.pid, signal.SIGKILL)
            except ProcessLookupError:
                pass
    events = []
    for line in (output / 'events.jsonl').read_text().splitlines():
        try:
            events.append(json.loads(line))
        except ValueError:
            pass
    threads = [event.get('thread_id') for event in events if event.get('type') == 'thread.started']
    turns = [event for event in events if event.get('type') == 'turn.completed']
    session_error = None
    try:
        if len(threads) != 1 or str(uuid.UUID(threads[0])) != threads[0]:
            raise ValueError('Missing or invalid journey thread ID')
        if previous and threads[0] != previous['threadId']:
            raise ValueError('Resume returned a different thread ID')
    except (ValueError, TypeError, AttributeError) as error:
        session_error = str(error)
    cumulative = turns[-1].get('usage') if turns else None
    usage, usage_error = None, None
    if turns and not timed_out and child.returncode == 0 and not session_error:
        try:
            if len(turns) != 1 or not isinstance(cumulative, dict):
                raise ValueError('Expected one completed turn with cumulative usage')
            before = previous['cumulativeUsage'] if previous else dict.fromkeys(cumulative, 0)
            if not isinstance(before, dict) or set(before) != set(cumulative):
                raise ValueError('Missing or changed cumulative usage counters')
            if not {'input_tokens', 'output_tokens'} <= cumulative.keys():
                raise ValueError('Required usage counters missing')
            if any(type(value) is not int or type(before[key]) is not int or value < before[key]
                   for key, value in cumulative.items()):
                raise ValueError('Usage counter reset or invalid value; cannot measure this turn')
            # Codex 0.159.3 emits thread totals. Sum deltas, not cumulative snapshots.
            usage = {key: value - before[key] for key, value in cumulative.items()}
            usage['total_tokens'] = usage['input_tokens'] + usage['output_tokens']
            usage['uncached_input_tokens'] = usage['input_tokens'] - usage['cached_input_tokens'] if 'cached_input_tokens' in usage else None
        except ValueError as error:
            usage_error = str(error)
    result = {'requestedModel': model, 'exitCode': child.returncode, 'timedOut': timed_out,
              'elapsedSeconds': round(time.monotonic() - started, 3), 'completedTurns': len(turns),
              'threadId': threads[0] if len(threads) == 1 else None, 'sessionError': session_error,
              'usage': usage, 'cumulativeUsage': cumulative, 'usageError': usage_error,
              'errors': [event for event in events if event.get('type') in ('error', 'turn.failed')]}
    save(output / 'result.json', result)
    return result


def permissions(project, arm='fs'):
    configs = permission_config(project)
    prefix = 'permissions.eval.filesystem='
    filesystem = next(config for config in configs if config.startswith(prefix))
    # Reuse the working inline table. Quoted dotted -c keys become literal quote characters in this CLI.
    additions = {codex_binary(): 'read'}
    if arm == 'baseline':
        additions[str(project.parent / 'runtime/skills')] = 'deny'
    replacement = filesystem[:-1] + ',' + ','.join(json.dumps(k) + '=' + json.dumps(v) for k, v in additions.items()) + '}'
    return [replacement if config == filesystem else config for config in configs] + ['permissions.eval.network.enabled=false',
        'shell_environment_policy.set={' + ','.join(k + '=' + json.dumps(v) for k, v in runtime_env().items()) + '}']


def environment_failure(result, output):
    if result.get('sessionError') or result.get('usageError'):
        return result.get('sessionError') or result['usageError']
    if result['exitCode'] and not result['completedTurns'] and not result['timedOut']:
        return 'Model process failed before completing a turn'
    for line in (output / 'events.jsonl').read_text().splitlines():
        try:
            item = json.loads(line).get('item', {})
        except ValueError:
            continue
        failed = item.get('status') == 'failed' or item.get('exit_code', 0) not in (0, None)
        if failed and 'Operation not permitted' in json.dumps(item):
            return 'Tool permission failure; not a valid controlled comparison'
    return None


def restricted(project, argv, source, timeout=30, arm='fs'):
    command = [codex_binary(), 'sandbox', '-C', str(project), '-P', 'eval']
    for config in permissions(project, arm):
        command += ['-c', config]
    return subprocess.run([*command, *argv], input=source, cwd=project,
                          text=True, capture_output=True, timeout=timeout, env={**os.environ, **runtime_env()})


def grade(project, stage, output):
    try:
        result = restricted(project, ['node', '--input-type=module', '-', 'grade', str(project), stage],
                            (HERE / 'evaluate.mjs').read_text())
        (output / 'grader.stdout').write_text(result.stdout)
        (output / 'grader.stderr').write_text(result.stderr)
        report = json.loads(result.stdout) if result.returncode == 0 else None
        if not isinstance(report, dict) or not isinstance(report.get('eligible'), bool):
            raise RuntimeError('Restricted grader failed; see logs')
        return report
    except (subprocess.TimeoutExpired, ValueError, RuntimeError) as error:
        return {'stage': stage, 'eligible': False, 'status': 'unverified', 'reason': str(error), 'results': []}


def fs_config(project):
    wrapper = ['sandbox', '-C', str(project), '-P', 'eval']
    for config in permissions(project):
        wrapper += ['-c', config]
    wrapper += ['node', str(project.parent / 'runtime/bundle/mcp.js')]
    return ['mcp_servers.frontend-system.command=' + json.dumps(codex_binary()),
            'mcp_servers.frontend-system.args=' + json.dumps(wrapper),
            'mcp_servers.frontend-system.env={' + ','.join(k + '=' + json.dumps(v) for k, v in runtime_env().items()) + '}',
            'mcp_servers.frontend-system.startup_timeout_sec=30',
            'mcp_servers.frontend-system.tool_timeout_sec=120']


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--models', nargs='+', default=['gpt-6-sol'])
    parser.add_argument('--repeats', type=int, default=1)
    parser.add_argument('--prepare-only', action='store_true')
    parser.add_argument('--preflight-only', action='store_true', help='Check both arms, Git, nested CLI and MCP without model calls')
    parser.add_argument('--session-check-only', action='store_true', help='After isolation checks, verify conversation resume with two small model calls per model')
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    if args.repeats < 1:
        parser.error('--repeats must be positive')
    output = (args.output or HERE / 'results' / time.strftime('%Y-%m-%dT%H%M%S')).resolve()
    output.mkdir(parents=True, exist_ok=False)
    spec = json.loads(subprocess.check_output(['node', str(HERE / 'evaluate.mjs'), 'spec'], text=True))
    subprocess.run(['node', str(HERE / 'evaluate.mjs'), 'calibrate', str(output / 'calibration.json')], check=True)
    manifest = {'version': 2, 'track': 'equal-information/continuous-session-maintenance', 'models': args.models,
                'codexVersion': subprocess.check_output([codex_binary(), '--version'], text=True).strip(),
                'usageAccounting': 'Difference of successive thread cumulative counters; incomplete/reset counters are unverified.',
                'gitEnvironment': GIT_ENV, 'preflightHash': hashlib.sha256((HERE / 'preflight.mjs').read_bytes()).hexdigest(),
                'permissionBinary': codex_binary(),
                'repeats': args.repeats, 'stageTimeoutSeconds': 300, 'maxRepairRoundsPerStage': 2,
                'spec': spec, 'executorConfig': COMMON_CONFIG, 'runnerHash': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
                'executorHashes': {name: hashlib.sha256((HERE.parent.parent / 'v2' / name).read_bytes()).hexdigest() for name in ['connect.py', 'environment.py']},
                'runtime': {folder: inventory(REPO / folder) for folder in ['bundle', 'skills', 'references', 'mandatory-rules']},
                'order': [{'model': model, 'replica': replica, 'arm': arm} for replica in range(args.repeats)
                          for model in args.models for arm in (['baseline', 'fs'] if replica % 2 == 0 else ['fs', 'baseline'])],
                'scope': 'Headless controller only; no browser, human readability, interaction answer bank or full architecture proof.'}
    manifest['hash'] = hashlib.sha256(json.dumps(manifest, sort_keys=True).encode()).hexdigest()
    save(output / 'manifest.json', manifest)
    if args.prepare_only:
        save(output / 'summary.json', {'status': 'prepared-not-run', 'manifestHash': manifest['hash'], 'journeys': [], 'usage': None})
        print(output)
        return
    # Verify oracle isolation before spending tokens, then availability before either arm.
    with tempfile.TemporaryDirectory(prefix='fs-maintenance-preflight-') as temp:
        project = Path(temp).resolve() / 'project'
        project.mkdir()
        runtime = project.parent / 'runtime'
        runtime.mkdir()
        for folder in ['bundle', 'skills', 'references', 'mandatory-rules']:
            shutil.copytree(REPO / folder, runtime / folder)
        shutil.copy(REPO / 'package.json', runtime / 'package.json')
        (project / 'package.json').write_text('{"type":"module"}')
        (project / 'probe.mjs').write_text('export const preflight = true;\n')
        subprocess.run(['git', 'init', '-q', '-b', 'main', str(project)], check=True, capture_output=True, env={**os.environ, **runtime_env()})
        for command in [['git', 'add', '.'], ['git', '-c', 'user.name=FS Eval', '-c', 'user.email=eval@localhost', 'commit', '-qm', 'Preflight starter']]:
            subprocess.run(command, cwd=project, check=True, capture_output=True, env={**os.environ, **runtime_env()})
        secret = str(HERE / 'evaluate.mjs')
        try:
            for arm in ['baseline', 'fs']:
                print(f'Preflight: {arm} permissions / Git / nested CLI', flush=True)
                probe = 'import {readFileSync} from "node:fs"; import {execFileSync} from "node:child_process"; let denied=false; try {readFileSync(' + json.dumps(secret) + ');} catch(e){denied=["EPERM","EACCES"].includes(e.code);} if(!denied)process.exit(2); execFileSync("git",["status","--porcelain"]); execFileSync(' + json.dumps(codex_binary()) + ',["--version"]);'
                if arm == 'baseline':
                    probe += 'let skillDenied=false; try {readFileSync(' + json.dumps(str(runtime / 'skills/fs-work/SKILL.md')) + ');} catch(e){skillDenied=["EPERM","EACCES"].includes(e.code);} if(!skillDenied)process.exit(3);'
                else:
                    probe += 'readFileSync(' + json.dumps(str(runtime / 'skills/fs-work/SKILL.md')) + ');'
                probe += 'console.log("isolated");'
                isolation = restricted(project, ['node', '--input-type=module', '-'], probe, arm=arm)
                save(output / f'isolation-{arm}.json', {'exitCode': isolation.returncode, 'stdout': isolation.stdout, 'stderr': isolation.stderr})
                if isolation.returncode or isolation.stdout.strip() != 'isolated':
                    raise RuntimeError(f'{arm}: permissions/Git/nested CLI preflight failed')
            print('Preflight: FS MCP project snapshot', flush=True)
            mcp = subprocess.run(['node', str(HERE / 'preflight.mjs'), str(project)], input=json.dumps(fs_config(project)), text=True, capture_output=True, timeout=45, env={**os.environ, **runtime_env()})
            save(output / 'mcp-preflight.json', {'exitCode': mcp.returncode, 'stdout': mcp.stdout, 'stderr': mcp.stderr})
            if mcp.returncode:
                raise RuntimeError('FS MCP snapshot preflight failed')
            if args.preflight_only:
                save(output / 'summary.json', {'status': 'preflight-passed', 'manifestHash': manifest['hash'], 'journeys': [], 'usage': None})
                print('Preflight passed (modelCalls: 0)', flush=True)
                print(output)
                return
            for model in args.models:
                token = uuid.uuid4().hex
                connected = None
                for step, prompt in enumerate([f'Remember this token for our next turn: {token}. Reply exactly OK. Do not use tools or files.',
                                               'Return only the token from my previous message. Do not use tools or files.']):
                    print(f'Preflight: {model} conversation {"resume" if step else "start"}', flush=True)
                    target = output / 'connections' / model / str(step)
                    connected = invoke(project, target, model, prompt, timeout=45, configs=permissions(project), env=runtime_env(), previous=connected)
                    if (connected['exitCode'] or connected['completedTurns'] != 1 or connected['usage'] is None
                            or connected['errors'] or environment_failure(connected, target)
                            or (target / 'final.md').read_text().strip() != (token if step else 'OK')):
                        raise RuntimeError('Conversation/usage preflight failed before paired runs; see connections logs')
            if args.session_check_only:
                save(output / 'summary.json', {'status': 'session-check-passed', 'manifestHash': manifest['hash'], 'journeys': [], 'modelCalls': 2 * len(args.models)})
                print(f'Session check passed (modelCalls: {2 * len(args.models)})', flush=True)
                print(output)
                return
        except (OSError, subprocess.TimeoutExpired, RuntimeError) as error:
            save(output / 'summary.json', {'status': 'blocked-before-comparison', 'reason': str(error), 'manifestHash': manifest['hash'], 'journeys': [], 'usage': None})
            print(f'Preflight blocked: {error}', flush=True)
            print(output)
            raise SystemExit(1)
    journeys = []
    for cell in manifest['order']:
        destination = output / f"{cell['model']}-{cell['replica']}-{cell['arm']}"
        destination.mkdir()
        with tempfile.TemporaryDirectory(prefix='fs-maintenance-') as temp:
            base = Path(temp).resolve()
            project, runtime = base / 'project', base / 'runtime'
            project.mkdir(); runtime.mkdir()
            for folder in ['bundle', 'skills', 'references', 'mandatory-rules']:
                shutil.copytree(REPO / folder, runtime / folder)
            shutil.copy(REPO / 'package.json', runtime / 'package.json')
            # Same knowledge corpus/engineering criteria for both arms; procedural skills/MCP are treatment.
            (project / 'CONTRACT.md').write_text(spec['contract'])
            (project / 'money.mjs').write_text(spec['keep'])
            (project / 'policy.mjs').write_text('export function quote() { throw new Error("Not implemented"); }\n')
            (project / 'checkout.mjs').write_text('export function createCheckout() { throw new Error("Not implemented"); }\n')
            (project / 'package.json').write_text('{"type":"module","scripts":{"test":"node --test"}}\n')
            for command in [['git', 'init', '-q', '-b', 'main'], ['git', 'add', '.'], ['git', '-c', 'user.name=FS Eval', '-c', 'user.email=eval@localhost', 'commit', '-qm', 'Fixed starter']]:
                subprocess.run(command, cwd=project, check=True, capture_output=True, env={**os.environ, **runtime_env()})
            for folder in manifest['runtime']:
                if inventory(runtime / folder) != manifest['runtime'][folder]:
                    raise RuntimeError('Runtime differs from frozen manifest; restart with a new manifest')
            before_runtime = inventory(runtime)
            stage_records, all_runs = [], []
            previous = None
            history = spec['contract'] + '\nShared knowledge: ../runtime/references/learned and ../runtime/mandatory-rules.\n'
            configs = permissions(project, cell['arm']) + (fs_config(project) if cell['arm'] == 'fs' else [])
            procedure = ('At the start of this journey read ../runtime/skills/fs-plan/SKILL.md and fs-work/SKILL.md; use frontend-system MCP and follow their procedures. ' if cell['arm'] == 'fs' else 'Use your ordinary coding workflow. ')
            instruction = procedure + 'Work only in the supplied project. No web, other models, dependency installation or history outside this conversation. Read CONTRACT.md and current requirements. Use the same knowledge as relevant. Planning/implementation/testing are authorized within the contract; do not wait for reapproval. Continue the current plan and work across follow-up turns, revising them for changed requirements as needed. Record decisions/tests in project files. Do not edit CONTRACT.md, money.mjs, package.json or TASK.md. No hidden requirements; make no feature additions.'
            configs += ['developer_instructions=' + json.dumps(instruction), 'permissions.eval.network.enabled=false']
            started = time.monotonic()
            for stage in spec['stages']:
                history += '\n' + spec['requests'][stage]
                (project / 'TASK.md').write_text(history)
                attempts = []
                for repair in range(3):
                    target = destination / stage / str(repair)
                    prompt = history if previous is None else spec['requests'][stage]
                    if repair:
                        prompt = 'External contract checks failed: ' + ', '.join(r['id'] for r in attempts[-1]['grade']['results'] if r['status'] != 'passed') + '. Repair those failures, preserving all other requirements.'
                    print(f"Running {cell['model']} / {cell['arm']} / {stage} / attempt {repair + 1}", flush=True)
                    result = invoke(project, target / 'model', cell['model'], prompt, configs, timeout=300, env=runtime_env(), previous=previous)
                    previous = result
                    infrastructure = environment_failure(result, target / 'model')
                    all_runs.append(result)
                    if infrastructure or result['exitCode'] or not result['completedTurns']:
                        report = {'stage': stage, 'eligible': False, 'status': 'unverified', 'reason': infrastructure or 'Model invocation did not complete', 'results': []}
                    else:
                        report = grade(project, stage, target)
                    if inventory(runtime) != before_runtime:
                        raise RuntimeError('Runtime mutated; stop and retain results')
                    protected = {'money.mjs', 'policy.mjs', 'checkout.mjs'}
                    shutil.copytree(project, target / 'snapshot', symlinks=True, ignore=shutil.ignore_patterns('.git', 'node_modules', 'knowledge'))
                    save(target / 'record.json', {'grade': report, 'usage': result['usage'], 'files': {p: v for p, v in inventory(project).items() if p in protected}})
                    attempts.append({'grade': report, 'invocation': result})
                    print(f"Result: {report.get('status', 'passed' if report['eligible'] else 'failed')}", flush=True)
                    if infrastructure or (report.get('status') == 'unverified' and not result['timedOut']):
                        save(output / 'summary.json', {'status': 'blocked-during-comparison', 'reason': report.get('reason'), 'manifestHash': manifest['hash'], 'journeys': journeys, 'incompleteCell': {**cell, 'stage': stage, 'record': str((target / 'record.json').relative_to(output))}})
                        print(f"Comparison stopped: {report.get('reason')}", flush=True)
                        print(output)
                        raise SystemExit(1)
                    if report['eligible'] or report.get('status') == 'unverified':
                        break
                stage_records.append({'id': stage, 'repairRounds': len(attempts) - 1, 'attempts': attempts})
                if not attempts[-1]['grade']['eligible']:
                    break
            complete_usage = all(r['usage'] is not None and not r['exitCode'] and not r['timedOut'] and not r['errors'] for r in all_runs)
            usage = {key: sum(r['usage'][key] for r in all_runs) for key in ['input_tokens', 'output_tokens', 'total_tokens']} if complete_usage else None
            if usage is not None:
                for key in ['cached_input_tokens', 'reasoning_output_tokens']:
                    usage[key] = sum(r['usage'][key] for r in all_runs) if all(isinstance(r['usage'].get(key), (int, float)) for r in all_runs) else None
            record = {**cell, 'manifestHash': manifest['hash'], 'stages': stage_records, 'usage': usage,
                      'eligible': len(stage_records) == len(spec['stages']) and all(s['attempts'][-1]['grade']['eligible'] for s in stage_records),
                      'repairRounds': sum(s['repairRounds'] for s in stage_records), 'wallSeconds': round(time.monotonic() - started, 3),
                      'keepViolatingSubmissions': sum(any(c['id'] == 'keep-valid-code' and c['status'] == 'failed' for c in a['grade']['results']) for s in stage_records for a in s['attempts']),
                      'treatmentAdherence': 'requires raw tool-log review; FS assignment alone does not prove use', 'humanReview': 'unverified',
                      'threadId': previous['threadId'], 'context': 'Fresh conversation and repository per journey; explicit same-thread resume across stages and repairs.'}
            save(destination / 'journey.json', record)
            journeys.append(record)
            save(output / 'summary.json', {'status': 'completed' if len(journeys) == len(manifest['order']) else 'running', 'manifestHash': manifest['hash'], 'journeys': journeys})
    print(output)


if __name__ == '__main__':
    main()
