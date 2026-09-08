---
name: fs-verify
description: Semantically review frontend changes, generate missing tests and stories, then run the project checks. Use for `fs verify`, frontend quality review, regression coverage, or pre-commit verification.
---

# Frontend System Verify

Verification is a model-led review followed by generated coverage and deterministic execution—not merely a script runner.

1. Call `get_change_context`. Inspect relevant `git diff` hunks and their consumers; do not dump the whole repository into context.
2. Review only applicable dimensions from `../../references/frontend-quality.md`: framework boundaries, state and data ownership, component cohesion, design consistency, accessibility, validation/security, errors and logging, cache/race behavior, performance/build, browser behavior, and testability.
3. Report evidence with file and line locations. Separate blockers, warnings, and notes. If a production-code change is advisable, ask the user before editing unless they already authorized fixes.
4. Identify missing coverage caused by the change. Before running broad checks, implement appropriate unit tests, integration tests, E2E tests, Storybook stories/play tests, and security regression tests. Do not create every test type when it adds no value.
5. For several independent test areas, use native parallel subagents when available. Assign disjoint test files or directories; the parent owns shared fixtures, configuration, dependency changes, and final integration. Avoid multiple agents modifying the same file or worktree.
6. Run focused tests while authoring. Once coverage is in place, call `run_project_checks` for discovered non-watch checks.
7. Re-read the final diff and summarize findings, generated coverage, commands, failures, and remaining user decisions. Do not hide pre-existing failures.

Never auto-edit production code merely because a verifier can propose a fix.
