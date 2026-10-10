---
name: fs-plan
description: Create or revise an implementation plan from project analysis and user decisions, or discuss a new product's requirements. Use fs-project for standalone whole-project analysis; planning does not edit product code.
---

# FS Plan

For material unanswered choices, follow [ask and pause](../../references/workflows/user-decisions.md).
Stop implementation when asking and wait for the actual answer; do not assume consent.

The host interprets code and discusses choices; MCP pins evidence and contracts.
Planning alone does not authorize product edits, approval, or a nested model.

For a task explicitly ending in PR submission, include the scoped safety and domain
review obligations from [PR readiness](../../references/workflows/pr-readiness.md)
in the proposed policy. Reuse project decisions under their original conditions;
new knowledge does not override a current scoped owner decision without discussion.

Deliver the requested plan delta. Earlier narrative analysis reports describe their
inspected snapshot; unless the user requests their refresh, retain them and state
changed assumptions in the new plan. Refresh affected typed flow/finding records as
required for current evidence, but do not also rewrite old reports, inventories or
numbering merely to make every document describe the new state. This does not permit
reusing stale evidence or silently refreshing the main project.md baseline.

## Inspect once, preserve usable evidence

Use [project analysis](../../references/workflows/fs-project.md) when the first
baseline is missing. `fs-project` is the explicit whole-project entry point;
`fs-project update` refreshes it on user request. Reuse an existing baseline and
inspect affected working changes instead of silently refreshing main.

Reuse the selected planId. After main analysis, get_work_context with explicit code files and separate
requirements:[document paths]. Describe the observed change in request, not merely a
plan filename. **Omit snapshot for working plan routes**, even when working code equals
main; new answer documents are working requirements, not main inventory.
Start with summary (omit detail). Do not preload full routing/context/source bodies:
summary has the contextId, candidates and prerequisites. Read selected knowledge for
investigation questions; use includeRelations only for missing relationships. Request
full only after identifying a needed field absent from the summary.
For a large main analysis, read save_project_context payloadSchema, write {analysis}
to .frontend-system/drafts/<id>.json and pass draftFile with expectedCommit/expectedHash.
Each user-decision statement needs confirmation quoting the supplied answer. After a
field error, patch only that draft field; preserve the cited scope and hash guards.
After saving project.md, renew get_work_context before binding a plan. Current projectFacts already emit their
triggers; do not routinely rediscover or reinspect them. Read selected bodies in one
read_learned_knowledge(id:[IDs]) call and finish truncated entries before adoption.
Judge every candidate; scope-search is a retrieval hint, not proof of applicability.
Use knownContextId only when the previous metadata is present in this conversation.

## Reuse ordered project analysis

For first analysis, missing/stale flows or feature discovery, follow
[project-flow-analysis](../../references/workflows/project-flow-analysis.md).
Use its grouped bookkeeping procedure: compose related drafts together, sequence
already-decided saves in one host tool call when available, and retain their receipts.
Do not add model turns just to re-read a successful save or transfer its hash.
Inspect environment → dependencies → event/state/error flows → knowledge → findings.
Use get_project_analysis before rereading source; record bounded cited flows independently
of knowledge registration. Pin reused flow/finding hashes through evidence.analysisRefs.
A new feature begins with domain outcomes and proposed flows, then decisions and plan.
project.md remains a manually refreshed main index; never publish working proposals as facts.
For a visualization-only request, use the focused
[fs-plan-visualize](../fs-plan-visualize/SKILL.md) workflow. When visualization accompanies
planning, deliver its cited observed flow through render_project_flow; never substitute a synthetic example or proposed design. Follow
"Deliver an actual-code visualization" in that reference and return the actual HTML path.

## Decide before writing the contract

Ask only material unresolved choices after checking code and prior answers. Present
code evidence, applicable knowledge conditions/exclusions, alternatives and costs,
including keeping the current design when viable. Existing habits do not establish
requirements. Do not reopen approved boundaries or infer consent. If answers will
change the contract, ask before serializing an elaborate revision unless a draft is
requested. Keep analysis records and record the resolved design after answers arrive.

Explain material knowledge influence as source/condition → code → question or excluded
option → user choice → obligation/check. Reading is not adoption or evidence of benefit.
A condition mismatch can justify no change. More rules or abstractions are not better.
Separate knowledge-backed advice, established requirements and unresolved choices.
Required domain outcomes must link to supplied user or established-contract authority.
Model authority is for implementation choices, not deciding new valid inputs, domain
transitions or business outcomes. Reuse an existing answer when it already specifies
the outcome; otherwise keep the proposed outcome open or outside this delivery. Never
relabel a domain rule as architecture or fabricate confirmation to clear the guard.

Before saving a design that changes behavior, state the user's required outcome apart
from the proposed mechanism. Trace that mechanism through a concrete normal case and
an adversarial case within the inspected scope. For stateful/asynchronous code, trace
events in order through completion, failure and ownership changes; a final-value
comparison alone is not a proof about the intervening history. Check both forbidden
outcomes and allowed behavior that must survive. If a counterexample breaks the
mechanism, revise the mechanism or leave the dependent choice open; do not reinterpret
the user's answer. Put the useful scenario and expected result in the existing plan
verification, not an additional report or a claim that unexecuted tests passed.
For every observable behavior change introduced by the mechanism, identify the
controlling decision and its effect, owner and event scope. A constraint on one effect
or event does not authorize extending it to related effects or other lifecycle events.
Compare each required obligation against the actual supplied outcome, not just a linked
decision ID. Keep an uncovered material change proposed/open and isolate dependent
work; ask for it when needed. Internal mechanism choices remain implementation
discretion only while they preserve the authorized observable outcomes.
Unanswered questions outside this change belong in deferred findings/backlog, not an
open decision attached to an otherwise settled issue. Preserving the existing behavior
does not require an answer about a future behavior change. If recording the excluded
alternative in the plan, use excluded with no rule/issue links; leave a decision open
only when this delivery actually depends on its answer.
Check the entire plan for obligations that silently choose an open alternative.
An open-items paragraph does not authorize assuming its answer elsewhere. Isolate
dependent work and keep the already-resolved outcomes precise.

## Store a concise, enforceable plan

Use the exact expectedHash. Bind adopted knowledge to decisions, each rule/issue to a
resolved decision, and required guarantees to checks or scoped semantic reviews.
Each new decision needs id, question, evidence, knowledgeIds, options (id/description/cost),
status, authority, rationale, reconsiderWhen, ruleIds and issueIds. Resolved decisions
also need a selected option; user and existing authority require confirmation quoting
the supplied answer or established contract. Code citations alone do not fill this field.
Use reconsiderWhen for the actual assumption or condition that would reopen this
choice, not invented future requirements. Omit selected for open/excluded choices.
For a large new contract, write these payload fields once to
`.frontend-system/drafts/<planId>.json`, then call save_revision with draftFile,
planId and expectedHash. The file contains only content/policy/issues/evidence or
their supported patches; projectPath, planId, expectedHash and detail stay in the
tool call. After a validation error, patch only the affected draft fields and retry
under the current guards. The draft is editable input, never an approved record.
Keep prohibitions, implementation discretion and unresolved intent distinct. For a
changed public boundary show an actual caller, signature, state/error owner and
allowed imports. Preserve unchanged input→outcome behavior separately from the approved
delta, including defaults/aliases/fallbacks. Existing tests and tools come first.
A planning-only turn need not execute implementation checks. Inspect package scripts
before binding checks; never assume a test/lint/build script exists. If absent, record
the verification setup as pending work and the prerequisite decision; do not claim
an automated check exists or passed.
Commands run from the target project root, not the plan directory. Resolve existing
helper paths there with a read-only file check. Future check files/scripts must be
explicit implementation prerequisites; a saved command is not an executable check.
For the opt-in CVA checker, read `node <plugin-root>/bundle/style-check.js --schema`.
Choose variants[].defaults from the approved contract: none for no defaultVariants,
per-axis for existing required defaults. Never add defaults just to satisfy a checker.

Default one jointly delivered change to one issue; describe coding order within it.
Split for independently verifiable deliverables, real decision checkpoints or external
prerequisites, not folder count. Preserve user milestones and existing approvals.
Do not duplicate source bodies or restate identical obligations across plan sections.
The saved `.frontend-system/plans/<planId>/plan.md` is already readable. If the user
also requests a standalone copy, copy that projection after the final save instead
of composing a second plan that can drift. When host orchestration is available,
check the save receipt and copy that projection in the same call; return its path/hash
and all contractDiagnostics. Stop on an error or unexpected receipt. Reuse the authored
draft and receipt instead of routinely reading get_revision(full) after saving.
Never edit the generated projection directly. Check decisions, obligations, citations
and normal/adversarial scenarios in the editable draft before the save. After a
successful save, repair correctable diagnostics such as missing confirmation on a
resolved existing decision or missing obligation links. Intentionally open choices
remain open and block approval; do not fabricate consent to clear their diagnostics.
Then finish the requested delivery and report remaining owner decisions. Reopen only
for an identified defect or new evidence, not a routine second full restatement.

Before composing a new revision, read its full payloadSchema with tool-help; MCP lists
only the compact transport fields, and server validation still uses the full schema.
Follow local $ref entries in that schema's $defs; these share identical definitions.
For other uncertain record inputs, read only the needed schema with
`node <plugin-root>/bundle/tool-help.mjs <tool-name>`; plugin root is two directories
above this skill. After input-validation failure inspect that schema before retrying.
Never probe writes with empty placeholders. For record semantics not resolved by the
schema, consult only the relevant section of
[evidence-led-design](../../references/workflows/evidence-led-design.md):
"Inspect and explain" for main evidence, "Bind the plan" for a new revision or patches.
Do not preload execution or audit procedures during ordinary planning.

Later answers belong in get_work_context.requirements. For existing choices use
save_revision with evidenceRoutes and decisionUpdates together; omit unchanged fields,
update affected obligations in the same save, and retain sources still cited by decisions.
Read get_revision(detail:decisions) only if choices are no longer available. New
questions/options require full evidence replacement. Context refresh alone does not
replace stored routes. Omit policy.rules[].evidence; linked decisions supply provenance.

Check contractDiagnostics before approval: they validate links, not semantic truth or
freshness. Present the concrete target and record actual approval for that scope;
changed targets invalidate prior approval. Open decisions block approval. Use fs-work
for authorized implementation. For an influence audit only, get_revision(detail:influence)
shows recorded knowledge/decision links, not causal improvement or independent approval.


For structural advice or a candidate with `investigationStatus: pending`, follow
[knowledge-investigation](../../references/workflows/knowledge-investigation.md).
Trace its required callers, arguments, ownership and contracts; distinguish code facts,
inferences and unknown intent. Request bounded relations only when needed. Store findings
in the existing route/checklist judgment, not a duplicate report. A trigger alone does
not justify a rewrite. Reuse established decisions for authorized fixes; ask only for
unresolved material choices. Legacy checklists do not certify contextual applicability.

Read additional references only for an unresolved need: [fs-inspect](../../references/workflows/fs-inspect.md)
for unfamiliar analysis, [fs-revise](../../references/workflows/fs-revise.md) for alternatives,
[project-plans](../../references/project-plans.md) for freshness/layout,
[verification-tools](../../references/verification-tools.md) for missing tools,
[workflow-policy](../../references/workflow-policy.md) for policy conflicts.
Missing MCP is a persistence failure, not permission to fabricate records. Read-only
requests prohibit memory writes. No automatic commit, push, deployment or issue creation.
