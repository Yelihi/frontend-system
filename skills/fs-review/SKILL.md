---
name: fs-review
description: Review frontend code, architecture or a reported failure without editing product code, tests, configuration or project memory; run existing checks when useful.
---

# FS Review

Read `../../references/decision-workflow.md` and, for symptoms,
`../../references/debugging.md`. Use `get_work_context` in `review` mode and
`get_change_context` when relevant. If tools are unavailable or the input is a
snippet, review the supplied facts; do not substitute the FS repository.

Trace callers, imports, domain events, state ownership, error/retry paths and tests.
Use `../../references/frontend-quality.md` for applicable review dimensions. Read
selected knowledge evidence/conditions after inspecting the actual code. Review
the tests' ability to detect incorrect behavior, not merely whether they pass.

Return concrete findings with evidence, failure conditions, impact, viable options
and necessary verification. Distinguish confirmed defects, risks and hypotheses.
Keeping suitable code is a valid result. Run existing checks if useful; their normal
result logs may be written, but an explicit no-write request excludes that too.

Do not edit product/test/configuration or project-memory files. When fixes are
requested, route to `fs-work` with the existing authorization and findings; do not
repeat the approval question. Unavailable runtime evidence is not success.
