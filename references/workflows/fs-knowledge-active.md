# Prepare selected knowledge

A bare `fs-knowledge active` means collect and structure notes whose Markdown
frontmatter already says `state: active`. The source maintainer owns this selection; run in an explicitly selected FS source checkout. Never pick
pending notes based on perceived quality. If the user explicitly supplies attachments
with this active request, that is selection of those specific attachments: preserve
and register them, then mark only those selected documents active.

1. Resolve the original repository and call `prepare_active_knowledge` without IDs.
   It preserves subpaths under `knowledge/source/active/`, stable catalog IDs and source
   bytes. Existing targets are never overwritten. Report per-file errors and partial
   progress; do not delete conflicting originals or claim a transaction.
2. Read only returned prepared documents. Use `knowledge/source/template.md` selectively:
   preserve claims and provenance; distinguish facts, experience, hypotheses, conditions,
   exclusions, examples, alternatives, preserved behavior and unanswered questions.
   For direct advice, describe where to start investigating code and what caller/state/
   ownership evidence would justify it. For CS/background knowledge, do not invent a
   code prescription. Cross-language analogies require explicit differences and evidence.
3. Keep original excerpts separate from organization/interpretation. Do not rewrite
   already adequate sections or fill every template heading. For moved notes use
   previousPath to check relative links to attachments/other notes and repair their
   destinations while preserving targets; do not move or discard attachment assets.
4. Recatalog changed documents under the existing IDs. This preparation is not review.
   Leave state: active. Report prepared paths and remaining questions; do not invoke
   review/sync unless those actions were also requested.

The metadata field accepts pending/active. `merged` is computed from active selection
plus a current approved review, never a manually trusted label. Notes remain in the
active folder after review and sync. Changed content/provenance invalidates merged;
changing to pending excludes the note even if it was previously approved. Existing
published copies are not retracted by a local selection edit. Notes without state are
legacy and excluded from automatic queues until the author selects them.
