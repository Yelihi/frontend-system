---
name: fs-work
description: Implement, refactor, set up or resume frontend work against agreed requirements, including tests, semantic review and recorded verification.
---

# FS Work

Read `../../references/decision-workflow.md`, `../../references/workflow-policy.md`
and `../../references/testing-and-transition.md`; use `../../references/project-plans.md`
for plan selection, main freshness and stage-specific checks. The host implements; deterministic
tools manage attempts, checks and completion. Do not launch a nested model.

1. Read list_plans and select the requested/relevant plan and issue. Ask only if
   selection is ambiguous. Pass its planId on every workflow/evidence call. Read
   `get_work_context` in the appropriate `implement`, `refactor` or `verify` mode.
   Reconcile source changes, current facts, pinned policy and execution checkpoint.
   Missing target/policy or a new material domain decision routes to `fs-plan`.
   Small tasks use a small contract within the approved policy, not a whole-project redesign.
2. Use only the relevant procedure:
   - New setup/provider configuration: `../../references/workflows/fs-init.md`.
   - Feature/UI work: `../../references/workflows/fs-implement.md`.
   - Whole-project transition: `../../references/workflows/fs-refactor.md`.
   - Coverage and verification: `../../references/workflows/fs-verify.md`.
   Keep the established provider; never initiate paid generation implicitly.
3. Preserve baseline behavior before refactoring. Establish missing checks within the
   authorized scope and prove valid/invalid examples before relying on them. Preserve
   existing test locations. Exceptions need exact scope and a resolution step.
   When installing verification tools or connecting CI, follow
   `../../references/verification-tools.md`; reuse the project's versions and scripts.
4. Save steps matching the approved issue contracts; check prerequisites. Run the
   baseline stage or a nonduplicating selection of existing baseline scripts. Implement and run local
   targeted checks while developing. For a full attempt call `begin_work_attempt` once;
   pass its ID and planId to `run_project_checks(stage: issue)` and all
   `save_semantic_review` records. Preserve domain/state/interface contracts; choose
   internal helpers freely inside those contracts.
5. Review product AND test code against applicable rules, domain expectations and
   negative examples. Findings cite existing files and explain evidence/conclusions.
   A model review is not deterministic proof. Do not weaken expectations or guards
   merely to pass; guard changes require a reviewed policy update.
   For materially risky changes, consider the [selective independent review](../../references/workflows/fs-verify.md#selective-independent-review)
   procedure; it is not a second-review requirement for every task.
6. Correct failures and retry within three recorded attempts per step (initial plus
   two repairs). Local individual test runs are not full attempts. On exhaustion,
   missing environment or new product decisions record blocked/remaining work.
   Never reset counters by recreating a step. Continue independent authorized work.
7. Complete steps only with current checks and reviews. Use stage: delivery for all required automated
   checks plus relevant integration/full tests on the final source. Refresh semantic
   evidence invalidated by subsequent edits. Save complete execution only when the
   tool accepts it. No checks, missing browser or stale evidence are not passes.
8. Record branch changes in plan/evidence. Refresh official project.md only from
   main after merge, using the same main-context procedure. Report plan/version/issue,
   achieved guarantees, check IDs, failures and limitations.

No new rule approval for ordinary edits inside the agreed contract. No automatic
commit, push, deployment or external issue creation. Verification-only requests
run checks; writing coverage or production fixes requires existing authorization.
