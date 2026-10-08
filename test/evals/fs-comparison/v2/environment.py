#!/usr/bin/env python3
"""Check the actual restricted command environment before spending model tokens."""
import json
import argparse
from contextlib import contextmanager, nullcontext
import select
import signal
import shutil
import os
from pathlib import Path
import subprocess
import tempfile
import time
from prepare import HERE, REPO, prepare


def permission_config(project):
    # No root read grant: prior results, personal files and the oracle stay outside.
    filesystem = {':minimal': 'read', str(project): 'write', ':tmpdir': 'write',
                  '/private/tmp': 'deny', str(project.parent / 'runtime'): 'read', '/Users/yelihi/.nvm': 'read',
                  '/Users/yelihi/.local': 'read', '/opt/homebrew': 'read',
                  '/Users/yelihi/Library/Caches/ms-playwright': 'read',
                  str(REPO): 'deny'}
    filesystem.update({path: 'read' for path in ('/System', '/Library', '/usr', '/bin', '/sbin', '/dev', '/private/etc')})
    table = ','.join(json.dumps(k) + '=' + json.dumps(v) for k, v in filesystem.items())
    return ['default_permissions="eval"', 'permissions.eval.filesystem={' + table + '}',
            'permissions.eval.network.enabled=true', 'approval_policy="never"']


@contextmanager
def browser_environment(project, output):
    # Child stderr must be a pipe: inheriting a file in the denied repository
    # aborts sandbox startup before Node can print a diagnostic.
    blocked = [str(REPO), str(Path.home() / '.codex'), str(Path.home() / '.agents'), '/private/tmp']
    profile = '(version 1)(allow default)' + ''.join(
        '(deny file-read* (subpath ' + json.dumps(path) + '))' for path in blocked)
    code = "import {chromium} from '@playwright/test'; const server=await chromium.launchServer({headless:true,host:'127.0.0.1'}); console.log(server.wsEndpoint());"
    broker = subprocess.Popen(['/usr/bin/sandbox-exec', '-p', profile, shutil.which('node'),
                               '--input-type=module', '-e', code], cwd=project,
                              stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, start_new_session=True)
    try:
        if not select.select([broker.stdout], [], [], 30)[0]:
            raise RuntimeError('Browser broker startup timed out')
        endpoint = broker.stdout.readline().strip()
        if not endpoint.startswith('ws://'):
            raise RuntimeError('Browser broker failed; see broker-stderr.log')
        yield {'PW_TEST_CONNECT_WS_ENDPOINT': endpoint, 'NEXT_TELEMETRY_DISABLED': '1', 'WATCHPACK_POLLING': 'true'}
    finally:
        try:
            os.killpg(broker.pid, signal.SIGTERM)
            broker.wait(timeout=10)
        except subprocess.TimeoutExpired:
            os.killpg(broker.pid, signal.SIGKILL)
            broker.wait()
        except ProcessLookupError:
            pass
        (output / 'broker-stderr.log').write_text(broker.stderr.read())


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--remote-browser', action='store_true')
    parser.add_argument('--checks', action='store_true')
    args = parser.parse_args()
    output = HERE / 'results' / ('restricted-environment-' + time.strftime('%Y-%m-%dT%H%M%S'))
    output.mkdir(exist_ok=False)
    project = Path(tempfile.mkdtemp(prefix='fs-v2-permissions-')).resolve() / 'project'
    prepare(project, dependencies=True)
    probe = project / 'probe.mjs'
    # Keep paths as data, never shell-interpolate the probe.
    probe.write_text('''import assert from 'node:assert/strict';
import {readFile, symlink, unlink} from 'node:fs/promises';
import {createServer} from 'node:http';
import {chromium} from '@playwright/test';
const paths = ''' + json.dumps([str(HERE.parent / 'v2-oracle.md'), str(HERE / 'grade.mjs'), str(HERE / 'results/preflight/preflight.json')]) + ''';
const results = {};
for (const path of paths) {
  try { await readFile(path); results[path] = 'READABLE'; }
  catch (error) { results[path] = error.code; }
}
await symlink(paths[0], 'oracle-link');
try { await readFile('oracle-link'); results.symlink = 'READABLE'; }
catch (error) { results.symlink = error.code; }
await unlink('oracle-link');
await new Promise(resolve => {
  const server = createServer((_, response) => response.end('ok'));
  server.on('error', error => { results.server = error.code; resolve(); });
  server.listen(0, '127.0.0.1', () => server.close(() => { results.server = true; resolve(); }));
});
try {
  const browser = process.env.PW_TEST_CONNECT_WS_ENDPOINT
    ? await chromium.connect(process.env.PW_TEST_CONNECT_WS_ENDPOINT) : await chromium.launch({headless:true});
  const page = await browser.newPage();
  try { await page.goto('file://' + paths[0]); results.browserOracle = 'READABLE'; }
  catch { results.browserOracle = 'denied'; }
  await browser.close(); results.chromium = true;
}
catch (error) { results.chromium = String(error); }
console.log(JSON.stringify(results));
assert.ok(paths.every(path => ['EPERM','EACCES'].includes(results[path])));
assert.ok(['EPERM','EACCES'].includes(results.symlink));
assert.equal(results.server, true);
assert.equal(results.chromium, true);
assert.equal(results.browserOracle, 'denied');
''')
    command = ['codex', 'sandbox', '-C', str(project), '-P', 'eval']
    for config in permission_config(project):
        command += ['-c', config]
    command += ['node', str(probe)]
    with browser_environment(project, output) if args.remote_browser else nullcontext({}) as extra_env:
        run = subprocess.run(command, cwd=project, capture_output=True, text=True, timeout=90,
                             env={**os.environ, **extra_env})
        checks = []
        if args.checks and run.returncode == 0:
            for script in ('lint', 'typecheck', 'test:unit', 'build', 'test:e2e'):
                checked = subprocess.run([*command[:-2], 'npm', 'run', script], cwd=project,
                                         capture_output=True, text=True, timeout=180, env={**os.environ, **extra_env})
                (output / (script.replace(':', '-') + '.log')).write_text(checked.stdout + checked.stderr)
                checks.append({'script': script, 'exitCode': checked.returncode})
                print(json.dumps(checks[-1]), flush=True)
    (output / 'stdout.log').write_text(run.stdout)
    (output / 'stderr.log').write_text(run.stderr)
    result = {'argv': command, 'project': str(project), 'exitCode': run.returncode,
              'passed': run.returncode == 0 and all(check['exitCode'] == 0 for check in checks), 'checks': checks, 'modelCalls': 0}
    (output / 'result.json').write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps(result))
    raise SystemExit(0 if result['passed'] else 1)


if __name__ == '__main__':
    main()
