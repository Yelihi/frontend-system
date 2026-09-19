# Tests and refactoring transitions

Execution/setup/checkpoint instructions apply to authorized implementation or
verification work. In review-only work, inspect evidence and propose missing cases
without installing or writing tests/project memory. Existing checks may run when
useful (and their normal result logs may be stored); explicit no-write requests
exclude them. Report only checks actually executed.

## Current verification boundary

Verify the changed guarantee with the smallest meaningful reproduction and relevant
existing checks. Retain security, safety and accessibility responsibilities. Broad
browser combinations, elaborate visual baselines and performance dashboards are
not prerequisites for FS. Do not install them to complete a bounded fix. Storybook
is optional in all workflows. Record human/environment checks that remain instead
of treating unavailable verification as passed. Use `debugging.md` when a failure
requires investigation; do not rewrite an assertion merely to clear the failure.

## Establish the baseline

1. Inspect manifests, scripts, test config, environment requirements and existing
   cases. Call `run_project_checks` with `purpose: baseline` before changing them.
   Save its returned ID in execution records. No checks means `not-run`, not success.
2. Diagnose existing failures. Fix those blocking verification of the affected
   behavior within the agreed scope; record unrelated failures and proceed with
   independent work. A previous failure status does not establish the same cause.
3. Reuse installed test tools. If absent/inadequate, choose the minimum framework-
   compatible environment for the required behavior, explain it in the revision,
   and install/configure within the approved scope. Confirm unknown compatibility
   in official docs. Create discoverable non-watch scripts and run them. Do not
   replace working tools or install every kind of testing framework.

Preserve the project's existing test placement. Move tests only for an explicit
transition need; include fixtures/snapshots and verify discovery and behavior before
and after. Do not enforce a root __test__ directory. Preserve per-app runtime boundaries
and existing UI checks; Storybook remains optional. Later tests follow project convention.

## Map domain guarantees before rewriting

Save an evidence record containing: guarantee ID; source requirement/decision;
preconditions and event; expected/forbidden outcomes; existing test; new test;
status (baseline verified, target pending, verified, blocked); evidence/check ID.
Inventory each source area for gaps; avoid meaningless one-test-per-file quotas.

Protect preserved behavior before refactoring. Separate an observed behavior from
an intended domain rule so existing bugs do not become requirements. Intentional
behavior changes require explicit before/after contracts in the approved revision.

For tightly coupled code, first extract what existing tests prove and obtain
whatever external behavior protection is possible. An approved minimal boundary
separation may precede deeper unit coverage. Preserve original test intent/results;
rewrite tests against the new API after code transitions and prove the same domain
guarantees. Retire superseded tests only after their guarantees are mapped and verified.

An old test failing because an API moved differs from a domain assertion failing.
Classify infrastructure failure, interface transition, actual regression and intentional
contract change. Do not modify expectations just to match current implementation.
Keep new-contract tests separately identifiable while implementation is pending;
configure targeted suites so the baseline remains runnable. Do not hide them with
blanket skips and claim full success. Final verification must include all target cases.

Prefer unit tests for independent rules, integration tests for state/API/module
boundaries, browser tests for critical user behavior and stories for reusable UI
states. For important assertions, demonstrate detection with a known bad input or
failure reproduction. Mocks must not substitute for the behavior being tested.

## Execute and record

For policy-enabled projects, read `workflow-policy.md` for attempts, required script
bindings, protected assets, migration exceptions and semantic review evidence.

`run_project_checks` accepts optional `capabilities` (exact IDs from `profile.scripts`,
e.g. `test:unit` or `apps/web:test`), `purpose`, and `baselineCheckId`. Existing full
invocation remains supported. It returns a record ID, source hash, stability flag,
passed/failed/not-run results and comparison hints. Read earlier results with
`get_check_record`. Results are evidence, not a semantic verdict.

Before edits, read `get_workflow_context`. Execution records require the current
approved revision hash. Save an initial stage list with `save_execution`, passing
the returned `executionHash` as `expectedHash` on subsequent writes. Each stage
contains ID, title, status, files, check IDs and remaining work. The note records
failure causes, accepted constraints and any guarantee-map reference.

For each stage: trace boundaries → edit code and consumers → run targeted checks →
inspect behavior/diff → checkpoint. New complete stages require current passing
checks and empty remaining work. Do not widen scope to eliminate an unrelated failure.
Keep older complete stages as historical results; recheck affected guarantees when
later stages change their code. A final full run validates the integrated result.

On resume, reconcile `changedSinceCheckpoint`, revision drift, source changes and
pending guarantees. Do not trust stored completion or overwrite user edits. If the
target changed, review/approve it and reconcile the remaining stage plan before
resuming. Never auto-reset, auto-commit or restart the entire migration to recover.

The store rejects stale record hashes, unapproved revisions, and completion without
current check evidence. After a busy write lock, retry after rereading. After a crash,
inspect whether a writer still exists before removing the abandoned project lock.

For final `status: complete`, all stages must be complete and `finalCheckId` must
refer to a full, stable, passing run against the current source and target. Code
transition can finish while verification remains blocked; record that distinction,
remaining environment needs and unrelated baseline failures honestly. Never count
missing tests, unavailable browsers or skipped target contracts as verification.
