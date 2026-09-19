# Frontend System Revise

Read `../../references/decision-workflow.md`.

1. Call `get_work_context` with mode `prepare`. For existing projects, establish or
   refresh missing/stale inspection through `fs-plan`. For new projects, inventory
   what exists but do not install a framework before discussing the domain.
2. Explain confirmed problems and evidence; separate a risk from an unverified
   hypothesis. Discuss the key user/domain flows sequentially using existing code
   and docs as evidence. Ask only unresolved material questions, one at a time.
3. Establish goals and preserved behavior; domain events/invariants including
   failure, cancellation, retries, permissions and concurrent change; then state
   ownership, data representation, server synchronization, caching and error binding.
   Compare viable options and costs. Choose layers/dependency directions, principal
   contracts, framework/CSS/dependency choices and design-system rules from those needs.
   DDD is optional. Separate backend/DB implementation is outside FS scope.
4. Write `.frontend-system/revision.md` using `save_revision`: include problems and
   scope, domain guarantees, explicit before/after behavior changes, architecture and
   dependency rules, important contracts, design-system decisions, tradeoffs,
   transition stages and acceptance checks. Keep general coding guidance in skills.
   Store detailed evidence via `save_project_record` and link it. An implementer
   should not need to invent unresolved important domain/architecture decisions.
5. Pass the current revision hash (null for new) to save. Every save is a draft and
   invalidates approval. Present the concrete target and material changes for user
   review. Only after explicit approval call `approve_revision` with that exact hash
   and the user's approval. Approval alone does not request execution.
6. Record material user decisions locally. Direct the next requested action to
   `fs-work` for existing projects or `fs-work` for new-project setup. Never
   rewrite the target merely to legitimize code drift.

For knowledge-backed judgments, follow `../../references/knowledge-indexing.md` (work-time search): search observed symptoms after inspecting code, then read selected evidence and applicability conditions. Concepts and uncertain claims alone do not authorize code changes.
