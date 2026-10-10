---
name: fs-knowledge
description: Contribute programming knowledge through pending GitHub PRs, or maintain selected sources and sync reviewed references. Supports fs-knowledge add, active, review and sync.
---

# FS Knowledge

For material unanswered choices, follow [ask and pause](../../references/workflows/user-decisions.md).
Stop implementation when asking and wait for the actual answer; do not assume consent.

PR discussions can become source candidates through
[PR feedback review](../../references/workflows/pr-feedback.md). Assess the claim,
original code, owner intent and counterexample before proposing add. A merged PR,
repeated comment or developer preference is not technical proof. Keep project-only
decisions local; shared candidates still follow pending → active → review → sync.

`fs-knowledge add` is a shared contribution request: prepare and submit a pending
Markdown PR to the official FS repository. It includes remote submission, not merge,
activation or release. Explicit local-only requests stay local. Do not infer public
submission from an unrelated request to save private project notes.

- **Add (`fs-knowledge add`, link, note or excerpt):** follow
  `../../references/workflows/fs-knowledge-add.md` and `../../references/linked-knowledge.md`.
  Use prepare_knowledge_contribution, then submit_knowledge_contribution with its exact
  id/hash. The tools manage contributor state outside both the project and plugin cache.
- **Local-only add:** use add_knowledge_note with an explicitly selected source checkout.
  Never use the installed plugin directory as a writable source store.
- **Active (`fs-knowledge active`):** follow
  `../../references/workflows/fs-knowledge-active.md`. This is source maintenance in
  an explicit FS checkout (repositoryRoot / FRONTEND_SYSTEM_REPO), not the user's
  consuming project. Collect only maintainer-selected active notes; do not approve or publish.
- **Research official sources:** follow `../../references/source-updates.md`. Discover
  versions and existing tools for a named project; otherwise start with common web
  constraints, React, Next.js and TypeScript. Read actual official/maintainer sources.
  Preserve applicability, dates, examples and uncertainty. Do not turn recommended
  lint presets into universal mandatory rules. No scheduler or nested model.
- **Check changes:** call `check_knowledge_sources`, then `read_source_change` only for
  relevant pending sources. Unchanged bodies need no model review. HTML/PDF/failed
  sources require host tools and explicit reporting, not a fabricated pass.
- **Review (`fs-knowledge review`):** resolve the explicit source checkout and follow
  `../../references/workflows/fs-knowledge-review.md`. This reviews saved source
  active knowledge without publishing it. No target text is needed: review the active
  queue. Current approved active sources appear as merged. These are skill intents, not shell CLI subcommands.
- **Sync (`fs-knowledge sync`):** resolve the explicit source checkout and follow `../../references/knowledge-indexing.md`,
  `../../references/workflows/fs-knowledge-sync.md` and `../../references/source-updates.md`.
  With no IDs or extra message, use knowledge_status.syncReady intersected with
  unpublished. Only merged sources may sync. Do not activate or review pending/active
  notes during sync; report these queues without loading their bodies. Check remote
  updates only for selected sources; changed evidence returns to review.

During sync, distinguish concepts, conditional decisions and rule candidates. Save
new/changed obligations using `save_rule_proposal`; present grounds, conditions,
counterexamples, verification method and limitations. Approve with
`approve_rule_proposal` only after the user agrees to that exact proposal. Saving
changed candidates clears approval. Concepts may sync independently of deferred rules.

Publish references using v3 routing, retaining approved rules with their definition and proposal
hash. Every entry needs direct/supporting/deferred routing. Only direct entries own
triggers/checks; supporting entries link to a direct judgment. Record representative expected and forbidden retrieval IDs in the index's
retrievalChecks. Publish grounded triggers/checks together and include positive/negative
triggerChecks. Call validate_knowledge_sync before marking sources published;
review warnings and source-to-claim fidelity separately. Run positive/negative examples where feasible; report unexecuted methods as
proposed. `mark_knowledge_synced` verifies hashes/approval, not truth. Then acknowledge
matching remote snapshots. Publication never changes an existing project's pinned
policy; adoption belongs to `fs-plan`. Do not create a skill for every source.

For the final answer, follow the [evidence and limits guidance](../../references/decision-workflow.md#report-evidence-and-limits), distinguishing source claims, reviewed judgments and executed verification.

Structured project flows are observations, not new universal knowledge. When converting
an example, preserve the author's applicability, exclusions, owner intent and unresolved
edges. `investigation` questions can refer to event/caller/state/error relationships;
they must not require every project to use one framework, class pattern or diagram.
The source template is for human authoring; authors do not need to write graph JSON.

Contribution PR merge only admits pending source text. Knowledge review status merged is
separate from Git PR merge. Sync changes learned artifacts in the maintainer checkout;
it never creates a plugin release. Release timing is maintainer-owned; follow
[contribution and release operations](../../references/contribution-release.md) for an
explicit release request. Existing projects retain their decisions; knowledge changes
are checked through existing evidence freshness guards, not silent plan rewrites.
