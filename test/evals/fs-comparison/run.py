#!/usr/bin/env python3
"""Sequential, fresh-session paired experiment using the installed Codex CLI."""
import argparse
import gzip
import hashlib
import io
import json
import os
from pathlib import Path
import platform
import shutil
import signal
import subprocess
import tarfile
import tempfile
import time

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]
FIXTURE = REPO / 'test/fixtures/frontend'


def command(args, cwd=REPO, **kwargs):
    return subprocess.check_output(args, cwd=str(cwd), **kwargs).decode().strip()


def write_json(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


def digest(data):
    return hashlib.sha256(data).hexdigest()


def inventory(root):
    return {str(p.relative_to(root)): digest(p.read_bytes()) for p in sorted(root.rglob('*')) if p.is_file()}


def telemetry(events):
    turns = [e['usage'] for e in events if e.get('type') == 'turn.completed' and 'usage' in e]
    usage = {key: sum(t.get(key, 0) for t in turns) for key in ('input_tokens', 'cached_input_tokens', 'cache_write_input_tokens', 'output_tokens', 'reasoning_output_tokens')} if turns else None
    if usage:
        usage['uncached_input_tokens'] = usage['input_tokens'] - usage['cached_input_tokens']
        usage['total_tokens'] = usage['input_tokens'] + usage['output_tokens']
    items = [e['item'] for e in events if e.get('type') == 'item.completed' and 'item' in e]
    # Tool calls have stable item IDs; never double count item.started + item.completed.
    mcp = [i for i in items if i.get('type') == 'mcp_tool_call']
    return {
        'threadId': next((e.get('thread_id') for e in events if e.get('type') == 'thread.started'), None),
        'usage': usage,
        'completedTurns': len(turns),
        'toolItems': sum(i.get('type') in ('command_execution', 'mcp_tool_call', 'file_change') for i in items),
        'mcpCalls': len(mcp),
        'mcpTools': sorted(set(i.get('tool', '') for i in mcp)),
        'errors': [e.get('error', e.get('message')) for e in events if e.get('type') in ('error', 'turn.failed')],
    }


def copy_tree(source, target):
    if platform.system() == 'Darwin':
        subprocess.run(['cp', '-cR', str(source), str(target)], check=True)
    else:
        shutil.copytree(source, target, symlinks=True)


def run(args):
    stamp = time.strftime('%Y-%m-%dT%H%M%S')
    output = HERE / 'results' / stamp
    output.mkdir(parents=True, exist_ok=False)
    # Keep long experiments outside OS temporary-directory cleanup.
    scratch = HERE / '.work'
    scratch.mkdir(exist_ok=True)
    setup = Path(tempfile.mkdtemp(prefix='fs-eval-setup-', dir=scratch))
    baseline = setup / 'baseline'
    baseline.mkdir()
    commit = command(['git', 'rev-parse', 'HEAD'])
    archive = subprocess.check_output(['git', 'archive', commit + ':test/fixtures/frontend'], cwd=str(REPO))
    with tarfile.open(fileobj=io.BytesIO(archive)) as source:
        source.extractall(str(baseline))
    # The committed fixture itself has historical FS evidence: remove it in BOTH arms.
    shutil.rmtree(baseline / '.frontend-system', ignore_errors=True)
    (baseline / '.gitignore').write_text('node_modules/\n.next/\nplaywright-report/\ntest-results/\n')
    base_files = inventory(baseline)
    runtime = setup / 'runtime'
    runtime.mkdir()
    for folder in ('bundle', 'skills', 'references', 'mandatory-rules'):
        shutil.copytree(REPO / folder, runtime / folder)
    fs_files = inventory(runtime)
    prompt = (HERE / 'prompt.md').read_text()
    disabled = []
    for base in (Path.home() / '.codex/skills', Path.home() / '.agents/skills'):
        disabled.extend(str(p) for p in base.rglob('SKILL.md'))
    skills_config = 'skills.config=[' + ','.join('{path=' + json.dumps(p) + ',enabled=false}' for p in sorted(set(disabled))) + ']'
    common_config = [
        'project_doc_max_bytes=0', 'features.plugins=false', 'features.apps=false',
        'features.memories=false', 'memories.use_memories=false', 'memories.generate_memories=false',
        'features.hooks=false', 'features.multi_agent=false', 'features.skip_host_skill_discovery=true',
        'features.skill_search=false', 'features.shell_snapshot=false',
        'web_search="disabled"', 'model_reasoning_effort="medium"',
        'sandbox_workspace_write.network_access=true', 'suppress_unstable_features_warning=true', skills_config,
    ]
    common_instruction = ('Work only on the provided project. Do not inspect personal configuration, other projects, previous sessions or evaluation outputs. '
                          'Do not use additional models, agents, web search or external services. The user has authorized implementation and verification of the explicit requirements.')
    schedule = []
    for repeat in range(args.repeats):
        models = args.models[repeat % len(args.models):] + args.models[:repeat % len(args.models)]
        for model in models:
            for arm in (['plain', 'fs'] if repeat % 2 == 0 else ['fs', 'plain']):
                schedule.append({'model': model, 'arm': arm, 'repeat': repeat + 1})
    manifest = {
        'sourceCommit': commit, 'fixtureTree': command(['git', 'rev-parse', commit + ':test/fixtures/frontend']),
        'excludedFixturePaths': ['.frontend-system/'],
        'promptSha256': digest(prompt.encode()), 'baselineFiles': base_files, 'fsFiles': fs_files,
        'evaluatorSha256': digest((HERE / 'score.mjs').read_bytes()), 'runnerSha256': digest(Path(__file__).read_bytes()),
        'codex': command(['codex', '--version']), 'node': command(['node', '--version']),
        'platform': platform.platform(), 'reasoningEffort': 'medium', 'timeoutSeconds': args.timeout,
        'executionPermissions': 'danger-full-access; identical to the outer host; disposable project copies',
        'models': args.models, 'repeats': args.repeats, 'schedule': schedule,
        'commonConfig': common_config, 'commonDeveloperInstructions': common_instruction,
        'requestedModelOnly': True, 'serverCacheReset': False, 'startedAt': stamp,
    }
    write_json(output / 'manifest.json', manifest)
    shutil.copyfile(HERE / 'prompt.md', output / 'prompt.md')
    print('RESULTS ' + str(output), flush=True)
    for index, spec in enumerate(schedule, 1):
        run_output = output / ('%02d-%s-%s-r%d' % (index, spec['model'], spec['arm'], spec['repeat']))
        run_output.mkdir()
        assert inventory(runtime) == fs_files, 'FS snapshot changed before execution'
        workspace = Path(tempfile.mkdtemp(prefix='fs-eval-work-', dir=scratch))
        project = workspace / 'project'
        shutil.copytree(baseline, project)
        copy_tree(FIXTURE / 'node_modules', project / 'node_modules')
        git_env = {**os.environ, 'GIT_AUTHOR_DATE': '2026-09-30T00:00:00Z', 'GIT_COMMITTER_DATE': '2026-09-30T00:00:00Z'}
        command(['git', 'init', '-q', '-b', 'main'], project)
        command(['git', 'add', '.'], project)
        command(['git', '-c', 'user.name=FS Experiment', '-c', 'user.email=experiment@localhost', 'commit', '-qm', 'Controlled starting project'], project, env=git_env)
        initial_tree = command(['git', 'rev-parse', 'HEAD^{tree}'], project)
        assert not (project / '.frontend-system').exists()
        assert all(digest((project / p).read_bytes()) == h for p, h in base_files.items())
        config = list(common_config)
        instruction = common_instruction
        if spec['arm'] == 'fs':
            instruction += (' Use Frontend System for this task: read ' + str(runtime / 'skills/fs-plan/SKILL.md') +
                            ' and follow fs-plan, then read ' + str(runtime / 'skills/fs-work/SKILL.md') +
                            ' and follow fs-work to implement and verify. The supplied frontend-system MCP provides its tools. '
                            'Keep all project records in the current project. Treat the explicit user requirements as the approved scope; do not invent approval of scope changes.')
            config += ['mcp_servers.frontend-system.command="node"',
                       'mcp_servers.frontend-system.args=[' + json.dumps(str(runtime / 'bundle/mcp.js')) + ']']
        config += ['developer_instructions=' + json.dumps(instruction)]
        invocation = ['codex', 'exec', '--ignore-user-config', '--ignore-rules', '--ephemeral', '--json',
                      '-C', str(project), '-m', spec['model'], '-s', 'danger-full-access', '-o', str(run_output / 'final.md')]
        for item in config:
            invocation += ['-c', item]
        invocation += ['-']
        write_json(run_output / 'invocation.json', {'argv': invocation, 'promptSha256': manifest['promptSha256']})
        started = time.time()
        print('START %d/%d %s %s r%d' % (index, len(schedule), spec['model'], spec['arm'], spec['repeat']), flush=True)
        timed_out = False
        with (run_output / 'events.jsonl').open('wb') as stdout, (run_output / 'stderr.log').open('wb') as stderr:
            child = subprocess.Popen(invocation, cwd=str(project), stdin=subprocess.PIPE, stdout=stdout, stderr=stderr,
                                     env={**os.environ, 'NEXT_TELEMETRY_DISABLED': '1'}, start_new_session=True)
            try:
                child.communicate(prompt.encode(), timeout=args.timeout)
            except subprocess.TimeoutExpired:
                timed_out = True
                os.killpg(child.pid, signal.SIGKILL)
                child.communicate()
            finally:
                # Also stop a dev server or MCP process left behind by the model.
                try: os.killpg(child.pid, signal.SIGKILL)
                except ProcessLookupError: pass
        elapsed = time.time() - started
        events = []
        for line in (run_output / 'events.jsonl').read_text().splitlines():
            try: events.append(json.loads(line))
            except json.JSONDecodeError: pass
        data = {**spec, 'order': index, 'initialTree': initial_tree, 'initialCommit': command(['git', 'rev-parse', 'HEAD'], project),
                'elapsedSeconds': round(elapsed, 3), 'exitCode': child.returncode, 'timedOut': timed_out, **telemetry(events)}
        data['fsSnapshotIntactAfterRun'] = inventory(runtime) == fs_files
        # Include added files in the patch without committing generated work.
        command(['git', 'add', '-N', '.'], project)
        (run_output / 'changes.patch').write_text(command(['git', 'diff', '--no-ext-diff', '--binary'], project) + '\n')
        data['numstat'] = command(['git', 'diff', '--numstat'], project).splitlines()
        protected = [p for p in base_files if not p.startswith(('app/', 'src/')) and p not in ('AGENTS.md', 'CLAUDE.md', '.gitignore')]
        data['changedProtectedFiles'] = [p for p in protected if not (project / p).exists() or digest((project / p).read_bytes()) != base_files[p]]
        records = project / '.frontend-system'
        if records.exists(): shutil.copytree(records, run_output / 'project-records', ignore=shutil.ignore_patterns('state.json', '.workflow-lock', 'reports'))
        write_json(run_output / 'result.json', data)
        # A separate copy prevents the external scorer from changing the model's output.
        evaluated = workspace / 'evaluated'
        copy_tree(project, evaluated)
        shutil.rmtree(evaluated / '.next', ignore_errors=True)
        for p in protected:
            (evaluated / p).parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(baseline / p, evaluated / p)
        with (run_output / 'scorer.log').open('w') as log:
            scored = subprocess.Popen(['node', str(HERE / 'score.mjs'), str(evaluated), str(run_output / 'checks')],
                                      stdout=log, stderr=subprocess.STDOUT, start_new_session=True)
            try:
                data['scorerExitCode'] = scored.wait(timeout=900)
            except subprocess.TimeoutExpired:
                data['scorerExitCode'] = 'timeout'
                os.killpg(scored.pid, signal.SIGKILL)
                scored.wait()
        write_json(run_output / 'result.json', data)
        with gzip.open(str(run_output / 'events.jsonl.gz'), 'wb') as zipped:
            zipped.write((run_output / 'events.jsonl').read_bytes())
        (run_output / 'events.jsonl').unlink()
        print('DONE ' + json.dumps({**spec, 'seconds': data['elapsedSeconds'], 'usage': data['usage'], 'mcpCalls': data['mcpCalls'], 'scorerExit': data['scorerExitCode']}), flush=True)
        shutil.rmtree(workspace)
        assert data['fsSnapshotIntactAfterRun'], 'FS snapshot changed during execution; preserve this run as an infrastructure failure'
    shutil.rmtree(setup)
    print('COMPLETE ' + str(output), flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--models', nargs='+', default=['gpt-6-astra', 'gpt-6-sol', 'gpt-6-luna'])
    parser.add_argument('--repeats', type=int, default=3)
    parser.add_argument('--timeout', type=int, default=900)
    options = parser.parse_args()
    if options.repeats < 1 or options.timeout < 1: parser.error('repeats and timeout must be positive')
    run(options)
