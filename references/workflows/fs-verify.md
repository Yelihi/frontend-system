# Frontend System Verify

Verification is a model-led review followed by generated coverage and deterministic execution—not merely a script runner.

Read `../../references/decision-workflow.md` and
`../../references/testing-and-transition.md`. Explicit review-only requests do not
authorize edits to product or test code; report missing coverage in that case.

1. Call `get_change_context` and `get_work_context` with mode `verify`. Compare relevant changes and consumers with current facts, approved revision, domain-guarantee mappings and project decisions. Follow dependencies as needed; the diff is not the whole behavioral boundary.
2. Review only applicable dimensions from `../../references/frontend-quality.md`: framework boundaries, state and data ownership, component cohesion, design consistency, accessibility, validation/security, errors and logging, cache/race behavior, performance/build, browser behavior, and testability.
3. Report evidence with file and line locations. Separate blockers, warnings, and notes. If a production-code change is advisable, ask the user before editing unless they already authorized fixes.
4. Identify missing coverage and weak assertions. When coverage edits are authorized, establish missing framework-compatible test infrastructure and write only necessary unit, integration, E2E, UI or security cases. Preserve domain intent across rewritten tests. Retain existing UI checks. Storybook is optional; add only the minimum setup justified by the agreed verification need. Full browser matrices, sophisticated visual regression and performance dashboards are outside the current core.
5. For several independent test areas, use native parallel subagents when available. Assign disjoint test files or directories; the parent owns shared fixtures, configuration, dependency changes, and final integration. Avoid multiple agents modifying the same file or worktree.
6. For a failing check that needs root-cause analysis, follow `../../references/debugging.md` within current authorization; verification alone does not authorize production fixes. Run focused tests while authoring. Once coverage is in place, call `run_project_checks` for discovered non-watch checks.
7. Re-read the final diff and summarize findings, coverage, recorded check IDs, outcomes and limitations. Separate existing failures, new regressions, interface transitions and unexecuted checks. Do not declare success because no checks were discovered, or equate code completion with verified completion.

Never auto-edit production code merely because a verifier can propose a fix.

## Selective independent review

Consider one separate reviewer when a change can materially affect authorization,
lose user data, or introduce difficult race/retry behavior. Use the actual failure
conditions and impact, not a keyword or diff-size threshold. Routine low-impact
changes use the existing review and checks; do not create a standing review panel.

When justified within the authorized work, use an available, permitted native
reviewer that did not implement the change, or an existing human review process.
Keep the host responsible for integration. Do not start a nested CLI/model service,
select a paid provider implicitly, or claim that a fresh context means a different
model. If separate review is unavailable, report it and follow the existing policy;
an already agreed review requirement remains outstanding, never silently waived.

Give the reviewer the agreed contract, scope, exact source state/diff, relevant
callers and tests, environment limits, and access to needed repository evidence.
Keep the implementation discussion and author's verdict out of the initial handoff;
do not withhold requirements, known failures or material constraints to make it blind.
Use read-only review scope. The reviewer must not edit code, weaken tests/guards,
approve policies, write project records or launch further reviewers. Existing checks
may run within the task's permissions; explicit no-write requests still take precedence.

Ask for concrete failure conditions, affected paths and counterexamples supported
by source or execution evidence, including what the tests fail to detect. An empty
finding list is valid. Agreement between models and a green test suite are not proof.
The host examines disputed findings using code or a focused reproduction, not a vote;
preserve unresolved material findings and their verification needs.

The authorized host incorporates the findings into existing evidence/review records.
In the existing evidence text, identify the review as self-review or separate review,
the actual reviewer/session when known, the source state reviewed, evidence and limits.
Do not invent provenance. `save_semantic_review` still records `host-model-review`;
it does not authenticate reviewer independence or turn judgment into machine proof.
Check for source drift before saving: after affected edits, repeat the relevant
review and checks. Existing approvals, attempt budgets and completion gates apply;
this procedure adds no universal gate and never authorizes automatic merge/deployment.

For knowledge-backed judgments, follow `../../references/knowledge-indexing.md` (work-time search): search observed symptoms after inspecting code, then read selected evidence and applicability conditions. Concepts and uncertain claims alone do not authorize code changes.
