---
name: fs-plan
description: Analyze an existing frontend or discuss a new product's domain and architecture; produce or revise an implementation plan without editing product code.
---

# FS Plan

Read `../../references/decision-workflow.md`, `../../references/workflow-policy.md`
and `../../references/project-plans.md` for main context and named issue contracts.
The current host model analyzes; MCP supplies facts and stores records. No nested model.

1. Read `list_plans`, select the relevant plan, then `get_work_context` in `prepare` mode
   with its planId. New requests get a new planId; preserve legacy records. Missing MCP is not permission to invent
   records: inspect local files and state the persistence limitation.
2. For existing projects, follow `../../references/workflows/fs-inspect.md`: inventory
   all first-party areas, trace calls/state/events/failures and persist scoped evidence.
   Use get_project_snapshot/read_project_source for official main facts, and refresh
   missing/stale project.md separately from working-branch evidence. Reuse matching
   main CI results; report absent lint/test evidence without inventing a pass.
   A function's observed behavior is not automatically a domain requirement.
3. Discuss material unknowns one at a time. Follow
   `../../references/workflows/fs-revise.md` for domain guarantees, ownership,
   architecture, dependencies, exceptions, alternatives and acceptance tests.
   For new projects discuss these before framework installation.
4. Build a concrete verification policy with pinned rule definitions, script IDs and
   exact commands, review requirements and scoped migration exceptions. Reuse existing
   tools; identify custom checks and valid/invalid examples where needed. Never label
   proposed checks verified. Existing projects review the impact of shared updates.
   For missing tools or CI setup, use `../../references/verification-tools.md` to
   specify project-owned dependencies, readiness and reproducible execution.
5. Save plan text, policy and dependency-aware issues together through save_revision
   with planId; include issue contracts, file scope, required checks and acceptance.
   Present the exact target for approval.
   Honor approval already given for this concrete plan; do not ask again merely to
   record it. Saving changed targets invalidates previous approval.
6. Plan cohesive, dependency-aware work with observable outcomes. Save an initial
   execution only for an approved target, using its exact issue IDs/contracts.
   Plan structure validation is not product-code verification; avoid full test reruns
   merely to finish a plan. Architecture diagrams can link to code/event/evidence paths;
   reuse an available selected tool, and ask before installing Archify.
   User approval of a target is distinct from a request to execute it.

`fs-plan ... 분석만` may save observed facts when allowed, but does not create a new
target or product changes. Explicit read-only requests also prohibit memory writes.
Use `fs-work` for authorized implementation and `fs-review` for read-only code review.
