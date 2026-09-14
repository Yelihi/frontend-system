---
name: fs-review
description: Analyze a specified frontend file, folder or behavior and its dependencies for defects, risk and maintenance cost; explain tradeoffs and fix within scope when requested. Use for focused decisions and partial refactoring, including code with no recent diff.
---

# Frontend System Review

Read `../../references/decision-workflow.md`.

1. Resolve the requested file/folder/behavior and call `get_work_context` with mode
   `review`. If no target can be inferred, ask for the smallest useful scope. Read
   current inspection, target design and relevant project decisions. Missing init
   context requires evidence gathering, not an invented architecture. For snippet-only
   requests use supplied facts; do not substitute the current repository or require
   setup. Read-only work does not write missing inspection records.
2. Trace callers and consumers in both directions, state/data ownership, side effects,
   error paths and existing tests. Check actual framework/version semantics. Follow
   related files beyond the shortlist while preserving the requested edit boundary.
3. Identify concrete failure conditions, domain violations and maintenance costs.
   Distinguish facts, hypotheses and measurements. Compare viable local remedies,
   preservation and broader alternatives. Explain why a choice fits this project;
   do not automatically replace a library or split a component by size/hook count.
4. For review-only requests, return prioritized findings with evidence, costs and
   necessary test cases; do not edit product or test code. If nothing merits a change,
   say so and state verification limits. Record actual user decisions, not invented consent.
5. When fixes are requested/approved, apply the agreed local remedy, consumer updates
   and meaningful tests using `../../references/testing-and-transition.md`. Broader
   migration or changed team/domain rules require discussion before dependent edits.
6. After authorized fixes, verify behavior and report measured outcomes. Save actual
   scoped decisions and refresh affected facts within the permitted write scope.
   A review alone is not a user decision or permission for incidental record writes.
   Propose revision changes only for an actual
   design decision; never normalize a violation by editing documentation.

For knowledge-backed judgments, follow `../../references/knowledge-indexing.md` (work-time search): search observed symptoms after inspecting code, then read selected evidence and applicability conditions. Concepts and uncertain claims alone do not authorize code changes.
