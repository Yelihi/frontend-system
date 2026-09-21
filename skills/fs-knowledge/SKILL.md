---
name: fs-knowledge
description: Register frontend learning material, research official sources, check document changes or sync reviewed references and rule candidates. Supports explicit fs-knowledge sync.
---

# FS Knowledge

Use the original FS repository (explicit path, FRONTEND_SYSTEM_REPO, or this checkout),
never a consuming project's copied skills. Read only the procedure for this request.

- **Add a link, note or book excerpt:** follow
  `../../references/workflows/fs-knowledge-add.md` and `../../references/linked-knowledge.md`.
  Register URLs via `get_knowledge_sources` / `register_knowledge_source` when ongoing
  checks are requested; user-maintained `knowledge/sources.json` is ID → URL.
- **Research official sources:** follow `../../references/source-updates.md`. Discover
  versions and existing tools for a named project; otherwise start with common web
  constraints, React, Next.js and TypeScript. Read actual official/maintainer sources.
  Preserve applicability, dates, examples and uncertainty. Do not turn recommended
  lint presets into universal mandatory rules. No scheduler or nested model.
- **Check changes:** call `check_knowledge_sources`, then `read_source_change` only for
  relevant pending sources. Unchanged bodies need no model review. HTML/PDF/failed
  sources require host tools and explicit reporting, not a fabricated pass.
- **Sync (`fs-knowledge sync`):** follow `../../references/knowledge-indexing.md`,
  `../../references/workflows/fs-knowledge-sync.md` and `../../references/source-updates.md`.
  Check registered remote sources and local knowledge status first. Review bounded
  diffs plus necessary context and impacted references; retain unreviewed work.

During sync, distinguish concepts, conditional decisions and rule candidates. Save
new/changed obligations using `save_rule_proposal`; present grounds, conditions,
counterexamples, verification method and limitations. Approve with
`approve_rule_proposal` only after the user agrees to that exact proposal. Saving
changed candidates clears approval. Concepts may sync independently of deferred rules.

Publish approved rules as v2 indexed references with their definition and proposal
hash. Run positive/negative examples where feasible; report unexecuted methods as
proposed. `mark_knowledge_synced` verifies hashes/approval, not truth. Then acknowledge
matching remote snapshots. Publication never changes an existing project's pinned
policy; adoption belongs to `fs-plan`. Do not create a skill for every source.

For the final answer, follow the [evidence and limits guidance](../../references/decision-workflow.md#report-evidence-and-limits), distinguishing source claims, reviewed judgments and executed verification.
