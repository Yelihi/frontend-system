---
name: fs-refactor
description: Execute or resume a whole-project frontend refactoring against an approved revision, with baseline tests, domain-guarantee migration and staged verification. Use for an approved full transition; use fs-review for a bounded code review or repair.
---

# Frontend System Refactor

Read `../../references/decision-workflow.md` and
`../../references/testing-and-transition.md`.

1. Call `get_work_context` with mode `refactor`. Read the target revision and relevant
   linked records fully. If absent/unapproved/drifted, use `fs-revise` to resolve it
   before product edits. A request to execute an already approved target authorizes
   its stages, not new product decisions or unrelated migrations.
2. Inspect the working tree and workflow checkpoint. Reconcile changes and pending
   work before resume; preserve unrelated edits. Establish the baseline, test layout
   migration, missing environment and domain-guarantee map before structural changes.
3. Save the stage plan with `save_execution`, bound to the approved revision hash.
   Use cohesive dependency-aware stages that include their actual consumers.
   Follow the test transition reference when old/new interfaces differ.
4. Execute the agreed stages continuously. For each stage trace, edit, test, review
   the diff and checkpoint. Do not ask for approval again inside the approved scope.
   Stop dependent work for an unresolved new regression or a required new domain,
   team-rule, technology or scope decision; continue safe independent work.
5. Run full integrated checks after all stages. Mark complete only with current
   recorded verification and no pending guarantees. If code is migrated but checks
   are blocked, record that distinction and remaining work instead of claiming success.
6. Refresh current facts through `fs-inspect`, preserving the approved target and
   decision history. Report the achieved changes, domain guarantees, measured results,
   existing failures, limitations and how to resume any incomplete work.

Do not install Storybook by default for a full refactor; retain existing UI checks.
Do not auto-commit, reset user changes or silently replace the selected architecture.
