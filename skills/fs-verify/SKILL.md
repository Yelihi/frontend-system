---
name: fs-verify
description: Semantically review frontend changes, generate missing tests and stories, then run the project checks. Use for `fs verify`, frontend quality review, regression coverage, or pre-commit verification.
---

# Frontend System Verify

Verification is a model-led review followed by generated coverage and deterministic execution—not merely a script runner.

Read `../../references/decision-workflow.md` and
`../../references/testing-and-transition.md`. Explicit review-only requests do not
authorize edits to product or test code; report missing coverage in that case.

1. Call `get_change_context` and `get_work_context` with mode `verify`. Compare relevant changes and consumers with current facts, approved revision, domain-guarantee mappings and project decisions. Follow dependencies as needed; the diff is not the whole behavioral boundary.
2. Review only applicable dimensions from `../../references/frontend-quality.md`: framework boundaries, state and data ownership, component cohesion, design consistency, accessibility, validation/security, errors and logging, cache/race behavior, performance/build, browser behavior, and testability.
3. Report evidence with file and line locations. Separate blockers, warnings, and notes. If a production-code change is advisable, ask the user before editing unless they already authorized fixes.
4. Identify missing coverage and weak assertions. When coverage edits are authorized, establish missing framework-compatible test infrastructure and write only necessary unit, integration, E2E, UI or security cases. Preserve domain intent across rewritten tests. Whole refactoring does not newly install Storybook by default; new shared UI/design-system development does. Retain existing UI checks.
5. For several independent test areas, use native parallel subagents when available. Assign disjoint test files or directories; the parent owns shared fixtures, configuration, dependency changes, and final integration. Avoid multiple agents modifying the same file or worktree.
6. Run focused tests while authoring. Once coverage is in place, call `run_project_checks` for discovered non-watch checks.
7. Re-read the final diff and summarize findings, coverage, recorded check IDs, outcomes and limitations. Separate existing failures, new regressions, interface transitions and unexecuted checks. Do not declare success because no checks were discovered, or equate code completion with verified completion.

Never auto-edit production code merely because a verifier can propose a fix.

For knowledge-backed judgments, follow `../../references/knowledge-indexing.md` (work-time search): search observed symptoms after inspecting code, then read selected evidence and applicability conditions. Concepts and uncertain claims alone do not authorize code changes.
