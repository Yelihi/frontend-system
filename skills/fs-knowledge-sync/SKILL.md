---
name: fs-knowledge-sync
description: Publish changed source knowledge into compact learned references used by frontend-system Skills. Use when the user asks to sync, summarize, or distribute newly added frontend knowledge.
---

# Frontend System Knowledge Sync

1. Call `knowledge_status` in the original frontend-system repository. Catalog changed or uncataloged Markdown first; do not silently skip it.
2. For unpublished document IDs, use `search_knowledge` and catalog metadata to group related material. Open only the necessary sources.
3. Update compact files under `references/learned/`. Preserve actionable rules, applicability, version limits, tradeoffs, and source links; omit article-like prose and raw attachments.
4. Prefer updating a cohesive existing reference over creating tiny fragments. Keep framework/version-specific guidance explicitly scoped.
5. Review the resulting diff for contradictions and accidental loss. Then call `mark_knowledge_synced` only for source IDs actually represented in the learned references.
6. Run repository checks. Report the synced IDs and changed learned-reference files.

Local symlink installations see reference changes immediately. npm or plugin installations receive them only after the shared package/plugin is updated; consuming projects do not run their own knowledge sync.
