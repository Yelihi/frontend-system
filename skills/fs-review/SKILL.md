---
name: fs-review
description: Review frontend code, architecture, reported failures or measured runtime behavior without editing product code; route authorized improvements through plan/work.
---

# FS Review

Read `../../references/decision-workflow.md` and, for symptoms,
`../../references/debugging.md`. Use `get_work_context` in `review` mode and
`get_change_context` when relevant. If tools are unavailable or the input is a
snippet, review the supplied facts; do not substitute the FS repository.

Trace callers, imports, domain events, state ownership, error/retry paths and tests.
Use `../../references/frontend-quality.md` for applicable review dimensions. Read
selected knowledge evidence/conditions after inspecting the actual code, using
`../../references/knowledge-indexing.md#작업-중-검색`. Use `discover_knowledge_triggers` for scoped semantic descriptions, then
   `inspect_code_knowledge`
for scoped files and cite evidence for applicable, excluded or unresolved checks.
Do not persist judgments during read-only review. Review
the tests' ability to detect incorrect behavior, not merely whether they pass.

For runtime measurements, read `../../references/verification-tools.md`. Identify the
source/build, scenario, data, browser/device, network/CPU, cache state and repetitions.
Compare before/after under the same conditions; link raw network/performance/heap,
render or bundle evidence only when actually collected. No threshold means no pass
verdict. Ask before installing dependency-cruiser or connecting a new browser MCP;
reuse working tools. A heap increase or render count alone does not prove a defect.

Return concrete findings with evidence, failure conditions, impact, viable options
and necessary verification. Distinguish confirmed defects, risks and hypotheses.
Keeping suitable code is a valid result. Run existing checks if useful; their normal
result logs may be written, but an explicit no-write request excludes that too.

When assigned as a separate reviewer, follow [selective independent review](../../references/workflows/fs-verify.md#selective-independent-review)
for the handoff, evidence and role boundaries. Do not delegate another review yourself.

Do not edit product/test/configuration or project-memory files. When fixes are
requested, carry findings and the selected improvement into a small fs-plan contract,
then `fs-work` and the same-condition remeasurement with existing authorization; do not
repeat the approval question. Unavailable runtime evidence is not success.


For structural advice or a candidate with `investigationStatus: pending`, follow
[knowledge-investigation](../../references/workflows/knowledge-investigation.md).
Trace its required callers, arguments, ownership and contracts; distinguish code facts,
inferences and unknown intent. Request bounded relations only when needed. Store findings
in the existing route/checklist judgment, not a duplicate report. A trigger alone does
not justify a rewrite. Reuse established decisions for authorized fixes; ask only for
unresolved material choices. Legacy checklists do not certify contextual applicability.

For persisted event/state analysis, use
[project-flow-analysis](../../references/workflows/project-flow-analysis.md).
Read relevant summaries before rescanning. Stale records require scoped reinspection;
new facts do not authorize new requirements. Preserve pinned plan references during
implementation. Update main project.md only on explicit request. Read-only review
may report findings but must not persist records without authorization.
