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

## Reusable feature verification notes

For a changed user flow or reproduced bug, keep the minimum instructions another
agent needs to repeat the relevant verification. Read related evidence listed by
`get_work_context`/`get_workflow_context` with `get_project_record` first. Reuse an
existing guarantee/debug record or test instructions; link to them instead of
duplicating procedures. Cover the affected flow, not a mandatory whole-app inventory.

During authorized implementation/verification, save the notes in the existing
evidence record with `save_project_record` (kind `evidence`). If no suitable record
exists, use an ID such as `feature-profile-save`. Read before updating and pass its
hash as `expectedHash`; use null for a new record. Review-only work proposes missing
instructions without saving them. If recording tools are unavailable, report that
limitation and provide the proposed notes; do not claim persistence.

Keep the procedure separate from its last observed result. Use this compact shape,
omitting inapplicable fields and linking existing instructions/tests where sufficient:

- **Feature and contract:** affected flow, guarantee ID or requirement/decision
  reference, expected and forbidden outcomes. Current behavior alone is not the oracle.
- **Start and prerequisites:** actual project command and working directory, ready
  signal, relevant environment, test data and authentication setup; never credentials.
- **Reach and act:** route/screen entry and ordered user actions, including the
  relevant failure/retry path. Use existing test selectors or accessible names.
- **Observe:** visible state and relevant side effects that distinguish success
  from failure; capture the action and result, not just a final screenshot.
- **Existing checks:** applicable test/script and exact invocation. Exercise the
  claimed behavior; a mocked result or unit test does not prove the real UI flow.
- **Last run:** date, source state, environment, actual outcome, check ID if one was
  produced, and retained log/screenshot/trace locations. Unexecuted steps stay unverified.
- **Limits and cleanup:** blocked steps, required human checks, safe test-data use,
  and cleanup of only resources created for this run; retain non-sensitive evidence.

For example, a profile-save retry flow should name how to open the form, trigger a
failure in the project's existing test setup, retry successfully, and observe both
retained input and cleared error text when the agreed contract requires them.
Do not invent routes, commands, failure controls or results to fill the notes.

Recheck affected instructions when routes, labels, setup, contracts or tests change.
On reuse, compare them with current code and environment; an old successful run is
historical evidence. If behavior regresses, report it rather than changing the
expected result to match. Notes do not replace required checks or semantic review,
add a completion gate, or authorize new tools, broader testing or changed contracts.

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
