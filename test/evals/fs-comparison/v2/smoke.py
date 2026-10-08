#!/usr/bin/env python3
"""Validate both arms' real model/tool environments, without implementing the task."""
import json
from pathlib import Path
import tempfile
import time
from prepare import HERE, REPO
from run import setup, fs_config, inventory, EXCLUDED, save
from connect import invoke
from environment import browser_environment


def main():
    output = HERE / 'results' / ('execution-smoke-' + time.strftime('%Y-%m-%dT%H%M%S'))
    output.mkdir()
    for experiment, arm in [('B', 'plain'), ('A', 'fs'), ('B', 'fs')]:
        target = output / (experiment + '-' + arm)
        target.mkdir()
        project = Path(tempfile.mkdtemp(prefix='fs-v2-smoke-')).resolve() / 'project'
        setup(project, experiment, arm)
        probe = project / 'environment-check.mjs'
        probe.write_text('''import assert from 'node:assert/strict';
import {readFile, symlink, unlink} from 'node:fs/promises';
import {chromium} from '@playwright/test';
const paths = ''' + json.dumps([str(HERE.parent / 'v2-oracle.md'), str(HERE / 'grade.mjs'), str(HERE / 'results/current-fs-snapshot.json')]) + ''';
for (const path of paths) await assert.rejects(readFile(path), error => ['EPERM','EACCES'].includes(error.code));
await symlink(paths[0], 'oracle-link');
await assert.rejects(readFile('oracle-link'), error => ['EPERM','EACCES'].includes(error.code));
await unlink('oracle-link');
const browser = await chromium.connect(process.env.PW_TEST_CONNECT_WS_ENDPOINT);
try {
 const page = await browser.newPage();
 for (const path of paths) await assert.rejects(page.goto('file://' + path));
} finally { await browser.close(); }
console.log('READ_DENIAL_AND_BROWSER_OK');
''')
        before = inventory(project, EXCLUDED)
        prompt = 'This is an infrastructure smoke test, NOT the task in TASK.md. Do not implement or edit product files. Run node environment-check.mjs, then npm run lint, npm run typecheck, npm run test:unit, npm run build, npm run test:e2e. Run each once, no fixes. Playwright Test connects through PW_TEST_CONNECT_WS_ENDPOINT automatically. Report actual commands and results. Do not use elevated execution, extra models or web.'
        if arm == 'fs':
            prompt += ' Also use frontend-system.list_project_files for the current project and then with projectPath=' + str(REPO) + '. The latter MUST be denied; do not print any file contents. Call get_work_context for the current project in prepare mode to verify the runtime loads.'
            if experiment == 'B':
                prompt += ' Search learned knowledge for React stale async responses and read one matching entry to verify snapshot access.'
        with browser_environment(project, target) as env:
            configs = fs_config(project, experiment, env) if arm == 'fs' else []
            configs += ['developer_instructions=' + json.dumps('Only perform the explicitly requested infrastructure checks. Ignore the implementation task in TASK.md. No product modifications.')]
            result = invoke(project, target / 'model', 'gpt-6-astra', prompt, configs, timeout=300, env=env)
        save(target / 'source-comparison.json', {'before': before, 'after': inventory(project, EXCLUDED)})
        print(json.dumps({'experiment': experiment, 'arm': arm, **result}), flush=True)
        if result['exitCode'] or result['timedOut']:
            raise RuntimeError('Smoke failed; investigate before implementation runs')
    print(output, flush=True)


if __name__ == '__main__':
    main()
