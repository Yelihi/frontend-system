#!/usr/bin/env python3
"""Fresh model availability/usage probes, explicitly excluded from the benchmark."""
import json
import os
from pathlib import Path
import signal
import subprocess
import tempfile
import time
from prepare import HERE
from environment import permission_config

MODELS = ['gpt-6-astra', 'gpt-6-sol', 'gpt-6-luna']
DISABLED_SKILLS = sorted({str(p) for root in (Path.home() / '.codex/skills', Path.home() / '.agents/skills') for p in root.rglob('SKILL.md')})
COMMON_CONFIG = [
    'skills.config=[' + ','.join('{path=' + json.dumps(p) + ',enabled=false}' for p in DISABLED_SKILLS) + ']',
    'project_doc_max_bytes=0', 'features.plugins=false', 'features.apps=false',
    'features.memories=false', 'memories.use_memories=false', 'memories.generate_memories=false',
    'features.hooks=false', 'features.multi_agent=false', 'features.skip_host_skill_discovery=true',
    'features.skill_search=false', 'features.shell_snapshot=false', 'web_search="disabled"',
    'model_reasoning_effort="medium"', 'suppress_unstable_features_warning=true',
]


def invoke(project, output, model, prompt, configs=(), timeout=900, env=None):
    output.mkdir(parents=True, exist_ok=False)
    command = ['codex', 'exec', '--ignore-user-config', '--ignore-rules', '--ephemeral', '--json',
               '--skip-git-repo-check', '-C', str(project), '-m', model, '-o', str(output / 'final.md')]
    for config in [*COMMON_CONFIG, *permission_config(project), *configs]:
        command += ['-c', config]
    command += ['-']
    (output / 'invocation.json').write_text(json.dumps({'argv': command, 'prompt': prompt}, indent=2))
    started = time.monotonic()
    timed_out = False
    with (output / 'events.jsonl').open('w') as stdout, (output / 'stderr.log').open('w') as stderr:
        child = subprocess.Popen(command, cwd=project, stdin=subprocess.PIPE, stdout=stdout, stderr=stderr,
                                 env={**os.environ, **(env or {})}, start_new_session=True)
        try:
            child.communicate(prompt.encode(), timeout=timeout)
        except subprocess.TimeoutExpired:
            timed_out = True
            os.killpg(child.pid, signal.SIGKILL)
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
        except json.JSONDecodeError:
            pass
    turns = [event['usage'] for event in events if event.get('type') == 'turn.completed' and 'usage' in event]
    usage = None
    if turns:
        usage = {key: sum(turn[key] for turn in turns) for key in set.intersection(*(set(turn) for turn in turns))}
        usage['total_tokens'] = usage['input_tokens'] + usage['output_tokens']
        usage['uncached_input_tokens'] = usage['input_tokens'] - usage['cached_input_tokens'] if 'cached_input_tokens' in usage else None
    result = {'requestedModel': model, 'exitCode': child.returncode, 'timedOut': timed_out,
              'elapsedSeconds': round(time.monotonic() - started, 3), 'completedTurns': len(turns), 'usage': usage,
              'errors': [event for event in events if event.get('type') in ('error', 'turn.failed')]}
    (output / 'result.json').write_text(json.dumps(result, indent=2) + '\n')
    return result


def main():
    output = HERE / 'results' / ('connections-' + time.strftime('%Y-%m-%dT%H%M%S'))
    project = Path(tempfile.mkdtemp(prefix='fs-v2-connection-')).resolve()
    for model in MODELS:
        result = invoke(project, output / model, model, 'Reply exactly OK. Do not call tools or read any files.', timeout=120)
        print(json.dumps(result), flush=True)
        if result['exitCode'] or not result['completedTurns']:
            raise SystemExit('Connectivity failed; stop before benchmark calls')


if __name__ == '__main__':
    main()
