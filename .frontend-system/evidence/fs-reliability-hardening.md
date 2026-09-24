# FS reliability hardening — 2026-09-22

## Contract and source

User authorized the recommended repairs and repeated reliability evaluation.
Three FS guarantees: exact Git change paths; durable stale verification across progress saves; protected or reviewed automated test oracles with repairable policy migration.
Revision: 13df684cc66335885c19131626435e1655a9928de70e9c74364eca2a5ea63678
Source snapshot: 5a9fce6ca41ec81e7e0fb23e681bf5c8f059f1f43d42e2acd08afeb66594ccdb
Required check: [3702361e-164f-4954-9517-d84aadb6d934](../checks/3702361e-164f-4954-9517-d84aadb6d934.json)
Semantic review: [23634ea9-b7d5-4ea2-9853-96606d97ab89](../reviews/23634ea9-b7d5-4ea2-9853-96606d97ab89.json)
Attempt: 9560de03-2263-474b-a852-d9c15f5ed486 (1 of 3). Development checks were local targeted runs before this full recorded attempt.

## Observed results

- Required test/typecheck/lint: passed, stable source. Node tests: 38 passed, zero failures/skips.
- Repeat evaluation: three fresh rounds x three order contracts = nine sequences. Each rejects invalid product behavior, stale final checks and weakened test assertions, then accepts repaired source. The actual fixture order module and test are copied unchanged before mutation.
- Exact assertions are required for mutation detection; timeout or infrastructure failure is not a pass. Each order check is bounded at 10 seconds.
- Initial quantity mutation allowed a request to stay pending; this hung evaluation and was not counted as success. The evaluation now mutates the rejection into a resolved false value, preserving the required rejection oracle, and adds the time bound. This does not claim to test every hanging-request behavior.
- Existing attempt-budget, migration-exception, semantic-review freshness and shared-rule approval tests remained green.
- Next.js acceptance: valid fixture plus hooks, accessibility, import/re-export/dynamic boundary, domain mutation and server-only violations checked. Acceptance passed.
- Chromium: one E2E test passed (duplicate submission, error, successful retry). Initial sandbox local-port EPERM was an environment block, then the same E2E passed with approved escalation. API remains mocked.
- Package smoke: four skills, no raw knowledge, standalone bundled MCP passed. Initial npm cache EPERM was a sandbox block, then the same smoke passed with approved escalation.

## Review and correction loop

Host reviewed the implementation and tests. Native separate reviewer /root/git_paths reviewed policy/workflow code it did not implement; it had implemented only Git parsing. First review found false verified reporting for old unprotected/legacy policies, and schema rejection preventing duplicate-guard policy repair. Both were corrected with migration regressions. Read-only follow-up reported no remaining supported blockers; it did not rerun tests. This is separate-context review, not independent-model accuracy evidence.

## Reproduce

From repository root on development/CI Node 24: npm run check; npm run test:eval; npm run test:frontend; npm run test:package.
The eval is also part of npm run check. See test/reliability-eval.test.ts and test/git-state.test.ts. Full required test output is retained in the check record above; ephemeral eval projects/check records are deleted after each case.

## Limits and remaining trial

These are local FS tool and synthetic fixture results, not consumer-project or production outcomes. No consumer project was designated; that trial remains unstarted. No host-model benchmark, production reliability percentage, server persistence/idempotency or GitHub required-merge setting is claimed. Source hashes exclude installed dependency/runtime state. Declared guard completeness and model review remain judgment boundaries.
Knowledge search relevance and package-scoped technology selection are unchanged; improve them from designated-project observations rather than infer gains from these tests.
