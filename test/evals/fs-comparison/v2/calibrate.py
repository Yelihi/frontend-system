#!/usr/bin/env python3
"""Exercise reference code and deliberate defects. Never calls a model."""
import hashlib
import difflib
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import time
from prepare import HERE, prepare, public_prompt


def save(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def grade(project, output):
    result = subprocess.run(['node', str(HERE / 'grade.mjs'), str(project), str(output)], capture_output=True, text=True, timeout=60)
    if result.returncode:
        raise RuntimeError(result.stderr)
    return json.loads((output / 'score.json').read_text())


def controller(project):
    result = subprocess.run(['node', str(HERE / 'controller-check.mjs'), str(project)], capture_output=True, text=True, timeout=20)
    if result.returncode not in (0, 1) or not result.stdout:
        raise RuntimeError(result.stderr)
    return json.loads(result.stdout)


def replace(project, path, before, after):
    target = project / path
    text = target.read_text()
    assert text.count(before) == 1, (path, before)
    target.write_text(text.replace(before, after))


def change_probes(project, output):
    """Reference evidence only; a reviewer must still judge Q10 for model outputs."""
    bindings = json.loads((project / 'checkout.contract.json').read_text())
    probes = []
    catalog = project / 'src/catalog.js'
    for name, target, after, expected_status, expected_total in (
        ('shipping-policy', project / bindings['quote']['module'], None, 200, 53400),
        ('catalog-memory', catalog, "export async function loadCatalog() { return [{id:'A',price:20000,stock:10},{id:'B',price:8000,stock:4}]; }\n", 200, 79200),
        ('catalog-delay', catalog, "export async function loadCatalog() { await new Promise(resolve => setTimeout(resolve, 10)); return [{id:'A',price:20000,stock:10},{id:'B',price:8000,stock:4}]; }\n", 200, 79200),
        ('catalog-failure', catalog, "export async function loadCatalog() { throw new Error('Catalog unavailable'); }\n", 500, None),
    ):
        before = target.read_text()
        if after is None:
            assert before.count('net >= 50000') == 1
            after = before.replace('net >= 50000', 'net >= 60000')
        path = str(target.relative_to(project))
        try:
            target.write_text(after)
            check = '''import assert from 'node:assert/strict';
for (const endpoint of ['quote', 'orders']) {
  const { POST } = await import(`./app/api/${endpoint}/route.js`);
  const response = await POST(new Request('http://fixture/api/' + endpoint, {method:'POST',body:JSON.stringify({lines:[{productId:'A',quantity:4},{productId:'B',quantity:1}],coupon:'SAVE10'})}));
  assert.equal(response.status, STATUS);
  const data = await response.json();
  if (STATUS === 200) assert.equal((endpoint === 'orders' ? data.quote : data).total, TOTAL);
  else assert.equal(typeof data.error, 'string');
}
'''.replace('STATUS', str(expected_status)).replace('TOTAL', json.dumps(expected_total))
            run = subprocess.run(['node', '--input-type=module', '-e', check], cwd=project, capture_output=True, text=True, timeout=20)
            (output / f'{name}.log').write_text(run.stdout + run.stderr)
            assert run.returncode == 0, (name, run.stderr)
            (output / f'{name}.diff').write_text(''.join(difflib.unified_diff(before.splitlines(True), after.splitlines(True), fromfile=path, tofile=path)))
            probes.append({'name': name, 'changedFile': path, 'actualHandlersPassed': 2, 'expectedStatus': expected_status, 'expectedTotal': expected_total, 'semanticScore': None})
        finally:
            target.write_text(before)
    save(output / 'change-probes.json', probes)
    return probes


def main():
    if (HERE / 'frozen.json').exists():
        raise RuntimeError('This version is frozen; create a new version before changing calibration inputs')
    output = HERE / 'results' / ('calibration-' + time.strftime('%Y-%m-%dT%H%M%S'))
    output.mkdir(parents=True, exist_ok=False)
    scratch = HERE.parent / '.work'
    scratch.mkdir(exist_ok=True)
    root = Path(tempfile.mkdtemp(prefix='v2-calibration-', dir=scratch))
    summary = {'modelCalls': 0, 'references': [], 'mutations': [], 'browser': 'not-run', 'semanticReview': 'not-run', 'readyForModelRuns': False}
    try:
        starter = prepare(root / 'starter')
        protected_names = ['package.json', 'package-lock.json', 'eslint.config.mjs', 'next.config.mjs', 'jsconfig.json', 'tsconfig.check.json', 'playwright.config.mjs', 'tests/catalog.test.mjs', 'e2e/catalog.spec.mjs']
        assets = {name: sha(starter / name) for name in protected_names}
        save(HERE / 'public-assets.json', assets)
        save(output / 'public-assets.json', assets)
        save(output / 'starter-files.json', {str(p.relative_to(starter)): sha(p) for p in sorted(starter.rglob('*')) if p.is_file()})
        for experiment in ('A', 'B'):
            (output / f'prompt-{experiment}.md').write_text(public_prompt(experiment))
        baseline = grade(starter, output / 'starter')
        assert any(c['status'] == 'failed' for c in baseline['cases'] if c['category'] == 'domain'), 'Unimplemented starter must not pass'
        for variant in ('flat', 'layered'):
            project = prepare(root / variant, variant)
            score = grade(project, output / variant)
            automated = [c for c in score['cases'] if c['category'] != 'browser']
            assert all(c['status'] == 'passed' for c in automated), (variant, [c for c in automated if c['status'] != 'passed'])
            lifecycle = controller(project)
            assert all(c['passed'] for c in lifecycle), (variant, lifecycle)
            save(output / variant / 'reference-controller.json', lifecycle)
            tests = subprocess.run(['node', '--test', *sorted(str(p.relative_to(project)) for p in (project / 'tests').glob('*.test.mjs'))], cwd=project, capture_output=True, text=True, timeout=20)
            (output / variant / 'unit.log').write_text(tests.stdout + tests.stderr)
            assert tests.returncode == 0
            probes = change_probes(project, output / variant)
            summary['references'].append({'variant': variant, 'automatedPassed': len(automated), 'controllerCasesPassed': len(lifecycle), 'changeProbesPassed': len(probes), 'browserNotRun': sum(c['category'] == 'browser' for c in score['cases']), 'qualityScore': None})

        # Each mutation starts from the identical flat reference, never from another mutation.
        mutations = [
            ('shipping-before-discount', [('src/checkout.js', 'net >= 50000', 'subtotal >= 50000')], ['below-discounted-threshold'], None),
            ('shipping-boundary', [('src/checkout.js', 'net >= 50000', 'net > 50000')], ['at-discounted-threshold'], None),
            ('discount-rounding', [('src/checkout.js', 'Math.floor(subtotal / 10)', 'Math.round(subtotal / 10)')], ['rounding'], None),
            ('trust-client-total', [('app/api/orders/route.js', 'return Response.json({ accepted: true, quote });', 'return Response.json({ accepted: true, quote: { ...quote, total: input.total ?? quote.total } });')], ['orders/tampered-money'], None),
            ('divergent-order-policy', [('app/api/orders/route.js', "../../../src/checkout.js", "../../../src/order-pricing.js")], ['orders/discount-free-shipping'], None),
            ('stale-failure', [('src/controller.js', 'if (!disposed && request === revision) update({ quote: null, error: error.message });', 'if (!disposed) update({ quote: null, error: error.message });')], [], 'stale-failure'),
            ('stale-success', [('src/controller.js', 'if (!disposed && request === revision) update({ quote, error:', 'if (!disposed) update({ quote, error:')], [], 'stale-success'),
            ('stale-quote-order', [('src/controller.js', 'update({ quote: null, quoting:', 'update({ quote: state.quote, quoting:'), ('src/controller.js', 'state.ordering || state.quoting || !state.quote', 'state.ordering || !state.quote')], [], 'pending-quote-blocks-order'),
            ('stuck-order-lock', [('src/controller.js', 'finally { update({ ordering: false }); }', 'finally { update({ ordering: true }); }')], [], 'order-duplicate-and-retry'),
            ('weakened-public-test', [('tests/catalog.test.mjs', 'assert.equal((await loadCatalog())[0].price, 12000);', 'assert.ok(true);')], ['tests/catalog.test.mjs'], None),
        ]
        for name, edits, expected, controller_case in mutations:
            project = root / name
            shutil.copytree(root / 'flat', project)
            if name == 'divergent-order-policy':
                (project / 'src/order-pricing.js').write_text((project / 'src/checkout.js').read_text().replace('net >= 50000', 'net >= 60000'))
            for path, before, after in edits:
                replace(project, path, before, after)
            score = grade(project, output / name)
            failures = [c['id'] for c in score['cases'] if c['status'] == 'failed']
            assert set(expected) <= set(failures), (name, expected, failures)
            lifecycle_failures = []
            if controller_case:
                lifecycle = controller(project)
                save(output / name / 'reference-controller.json', lifecycle)
                lifecycle_failures = [c['id'] for c in lifecycle if not c['passed']]
                assert controller_case in lifecycle_failures, (name, lifecycle)
            summary['mutations'].append({'name': name, 'expectedAutomatedFailures': expected, 'observedAutomatedFailures': failures, 'referenceControllerFailures': lifecycle_failures, 'browserDetection': 'not-run'})

        # These are review inputs, not automatically awarded architecture points.
        review_only = {
            'domain-io-import': ('src/checkout.js', "import { readFile } from 'node:fs/promises';\n", ['Q3', 'Q8']),
            'unused-factory': ('src/factory.js', 'export class UnusedPaymentProviderFactory { create(provider) { return provider; } }\n', ['Q8']),
        }
        for name, (path, content, expected_rules) in review_only.items():
            project = root / name
            shutil.copytree(root / 'flat', project)
            target = project / path
            target.write_text(content + (target.read_text() if target.exists() else ''))
            score = grade(project, output / name)
            assert not any(c['status'] == 'failed' for c in score['cases'])
            save(output / name / 'review-seed.json', {'expectedReviewRules': expected_rules, 'reviewStatus': 'not-run', 'note': 'Construction intent only; functional success must not be labeled clean architecture success.', 'changedFile': path, 'source': target.read_text()})
        summary['reviewOnlySeeds'] = list(review_only)
        summary['inputHashes'] = {name: sha(HERE / name) for name in ('prepare.py', 'grade.mjs', 'controller-check.mjs', 'calibrate.py', 'public-assets.json', '../v2-protocol.md', '../v2-oracle.md', '../../../../mandatory-rules/common/review.md', '../../../../references/frontend-quality.md')}
        summary['remaining'] = ['Browser calibration on both references and applicable mutations', 'Independent semantic review calibration including Q7/Q8 and Q10 change probes', 'Verified read isolation from oracle/results', 'Paired model executions A=18 and B=18']
        save(output / 'summary.json', summary)
        print(json.dumps({'output': str(output), 'references': len(summary['references']), 'detectedMutations': len(summary['mutations']), 'readyForModelRuns': False}))
    finally:
        shutil.rmtree(root)


if __name__ == '__main__':
    main()
