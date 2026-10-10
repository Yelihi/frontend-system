---
name: fs-work
description: Implement, refactor, set up or resume frontend work against agreed requirements, including tests, semantic review and recorded verification.
---

# FS Work

For material unanswered choices, follow [ask and pause](../../references/workflows/user-decisions.md).
Stop implementation when asking and wait for the actual answer; do not assume consent.

Implement the approved contract, preserving user decisions and evidence. The current
host writes code; MCP manages versions, attempts, checks and completion. No nested model.

Before the first product or test edit, resolve the selected planId (list_plans only
if unknown) and call get_workflow_context. If its approved revision or execution is
missing, finish the evidence-backed plan/approval and initialize execution first,
then start or resume an attempt. Reuse approval already supplied for that exact scope.
A user plan document and a hand-written completion Markdown do not replace these
MCP records. FS work is incomplete until complete_work or save_execution accepts completion.
If MCP is unavailable, report that limitation; never claim the FS workflow completed.

For uncertain arguments, or after an input-validation error, read the exact input via
`node <plugin-root>/bundle/tool-help.mjs <tool-name>` before retrying. Plugin root is
two directories above this skill. This reads generated schemas only. Do not probe
save_execution/save_semantic_review or other writes with empty/placeholder payloads;
read only the needed schemas, not the full schema file.

1. Reuse planId and the known approved contract. If continuing directly from planning,
   use get_workflow_context for execution state; do not reroute solely because the mode
   changed to implementation. start_work/begin_work_attempt validate bound evidence before editing.
   For a new request, changed scope, uncertain facts or resumed context, use
   get_work_context with explicit files/requirements and inspect its deltas/projectFacts.
   Read unfamiliar contract sections once. Reread relevant code/reference bodies when
   their hashes or assumptions change; current facts validate declared scope, not meaning.
   New material decisions or missing policy route to fs-plan. Do not silently replace
   approved rules with new knowledge or weaken the plan to make verification pass.
2. For a new named plan with approved issues, use start_work with planId, revisionHash,
   a dependency-free stepId and kind. It performs the existing execution/attempt/baseline
   operations together. Inspect status and baseline failures; retain executionHash,
   attempt.id and baseline.id. Do not repeat its baseline or initialize again after a
   partial error; use the returned saved identities to resume.
   For custom baseline selection or legacy plans, initialize save_execution with expectedHash:null, execution.revisionHash from approval,
   and pending steps using approved issue IDs; the server derives their contracts.
   On resume use the existing execution hash. Pass the saved execution hash (not revision
   hash) to begin_work_attempt before editing. For baseline checks use stage:baseline
   (cheap tests/lint/types, no build), OR purpose:baseline with capabilities:[script keys]
   and no stage for explicit scripts. Use the selected planId for baseline and later
   checks; another plan's check ID cannot be linked. Never combine stage and capabilities. Respect dependencies;
   do not implement future steps early and reconstruct their records afterward. A small
   cohesive change should already be one issue, even across layers. Keep the existing
   provider and do not initiate paid generation implicitly.
3. Implement within file/API/domain/state/type/security constraints. Preserve reference
   ownership, error paths and actual caller behavior. User-owned tradeoffs and explicit
   prohibitions remain fixed; discretionary internal helpers remain discretionary.
   Before rewriting behavior that must remain unchanged, reuse adequate regressions or
   add a focused characterization and check it against the pre-change implementation.
   Derive expected outcomes from that implementation or the approved contract, not
   the rewritten code. For a default-only change, preserve explicit input outcomes
   (including aliases/fallbacks) and verify omitted inputs separately against the newly
   selected value. A missing internal case label does not authorize inventing its output.
   Change existing expected outcomes only for the explicitly approved behavior delta.
   Run development tests through run_project_checks with capabilities:[exact script keys],
   planId and attemptId; omit stage/required. Select only the checks needed for the
   current uncertainty. Finish product and test edits before a full build/delivery;
   run a development build earlier only to investigate a concrete bundling uncertainty.
   It retains full logs and returns bounded
   failure excerpts. Read get_check_record by capability/offset only when the excerpt
   is insufficient. Reuse project test scripts/transformers. If a needed command has no
   script, retain its full log in an artifact and inspect a bounded excerpt, not a huge
   trace or data-URL bundle. A failed environment probe is not a product defect. Do not
   retry the same blocked browser without an environment change, or claim SSR/mock
   tests prove real browser behavior. Required browser checks remain blocked.
   If adding an esbuild SSR test, set stdin.loader:'jsx' for JSX input explicitly;
   sourcefile alone does not set its loader. Reuse the installed React/transformer.
4. Review changed product AND test code. For each guarantee identify its trigger,
   forbidden outcome and an assertion or concrete counterexample that would expose it.
   Directory names, test count and model confidence are not semantic proof. Check real
   callers, ownership and dependency edges. save_semantic_review must address every
   ruleId in its selected policy review; scope reviews during planning, not by dropping
   findings afterward. Record actual limitations and current file evidence. Independent
   review is selective, not an automatic extra pass for ordinary changes.
   Supply the required findings through complete_work, or save the required reviews
   before checkpointing a step as complete; a passing
   automated check alone cannot satisfy that checkpoint. Reuse an already passing
   check on identical source/revision/attempt when it covers the required scripts.
5. Correct failures within three recorded attempts per step (initial plus two repairs).
   Individual development checks are not full attempts. Pass attemptId to recorded checks
   and reviews. Never reset counters, weaken guards, or claim unrun tests passed. On an
   environment limit, record blocked/remaining work and continue independent authorized
   work. On a new unresolved user decision, record the blocker, ask and pause implementation
   until the answer arrives. For repeated defects prefer a scoped executable check
   over another generic reminder.
6. For one jointly delivered issue, once code review findings are ready and no work remains,
   use complete_work with the current execution hash, attemptId, baselineCheckId and every
   explicit approved review. Each reviewId selects policy.reviews[].id, not a new record
   name; the server generates record IDs. This runs delivery checks and then the existing
   review/completion guards. Only status:complete is completion. Partial errors preserve
   accepted records for repair through the individual tools; do not repeat passing checks
   just to repair a review record. Do not infer findings from passing tests.
   For multiple issues, or to reuse an already passing final check, use the individual
   tools. After the chosen tests and product/test review are ready, run
   run_project_checks(stage:delivery) on final source rather than running the same final
   commands in the shell first. One delivery record can supply step and final check IDs
   for that attempt. Complete only with current required checks and semantic reviews;
   refresh evidence invalidated by edits, and save complete execution
   only when the tool accepts it. A successful complete_work needs no extra status call;
   otherwise get_workflow_context suffices for final status; do not
   rerun knowledge routing to confirm completion. Give a concise final response after
   successful completion with guarantees, checks and material limitations.


For structural advice or a candidate with `investigationStatus: pending`, follow
[knowledge-investigation](../../references/workflows/knowledge-investigation.md).
Trace its required callers, arguments, ownership and contracts; distinguish code facts,
inferences and unknown intent. Request bounded relations only when needed. Store findings
in the existing route/checklist judgment, not a duplicate report. A trigger alone does
not justify a rewrite. Reuse established decisions for authorized fixes; ask only for
unresolved material choices. Legacy checklists do not certify contextual applicability.

Read only the procedure needed for the actual change:
- [PR readiness](../../references/workflows/pr-readiness.md): before an authorized PR
  creation, reuse final reviews/checks and require `check_pr_readiness` to return ready.
  Completion alone is not PR permission; ordinary work without PR submission adds no gate.
- [fs-init](../../references/workflows/fs-init.md): new setup/provider configuration.
- [fs-implement](../../references/workflows/fs-implement.md): feature/UI design questions
  not already settled by the approved contract. Preserve design systems and accessibility.
- [fs-refactor](../../references/workflows/fs-refactor.md): whole-project transition.
- [fs-verify](../../references/workflows/fs-verify.md): verification-only or independent review.
- [testing-and-transition](../../references/testing-and-transition.md): baseline failures,
  missing recipes or test migration; preserve existing test locations.
- [verification-tools](../../references/verification-tools.md): new tool/CI readiness.
- [project-plans](../../references/project-plans.md): plan selection/main freshness ambiguity.

Do not load all procedures for a bounded approved change. Main project.md is refreshed
from main after merge, not from working edits. Ordinary fixes inside the approved
contract need no repeated approval. Verification-only requests do not authorize new
product edits. No automatic commit, push, deployment or external issue creation.

For persisted event/state analysis, use
[project-flow-analysis](../../references/workflows/project-flow-analysis.md).
Read relevant summaries before rescanning. Stale records require scoped reinspection;
new facts do not authorize new requirements. Preserve pinned plan references during
implementation. Update main project.md only on explicit request. Read-only review
may report findings but must not persist records without authorization.
