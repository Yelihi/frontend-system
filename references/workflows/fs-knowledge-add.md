# Frontend System Knowledge Add

Store source knowledge in the original frontend-system repository, never in a consuming project's copied Skill. Resolve that repository from `FRONTEND_SYSTEM_REPO`, a user-provided path, or the current checkout.

1. For a URL, follow `../../references/linked-knowledge.md`: inspect the actual article, preserve provenance and capture completeness, and distinguish an authorized full-text capture from a summary. Full-text preservation is available for user-authored or otherwise permitted material; a URL alone does not establish permission. For an attachment, retain the original when permitted and create normalized Markdown. User-authored Markdown may remain the canonical source.
2. Call `search_knowledge` using the candidate topic and likely facets. Read only the top matching source files needed to decide placement.
3. For linked articles, also compare sourceUrl in catalog metadata before creating a file; the hash check alone cannot detect a repeat import with changed capture metadata. Keep distinct articles and captured text separate from commentary; merge derived knowledge during sync. For other notes, merge only when they represent the same cohesive concept and new material improves it. Similar facets alone do not justify a merge. If it conflicts, preserve both claims with sources and mark the uncertainty.
4. Otherwise write a new Markdown file under exactly one of:
   - `knowledge/source/manual/`
   - `knowledge/source/imported/`
   - `knowledge/source/attachments/`
5. Accept foundational CS, domain architecture and framework internals without requiring a code prescription. Offer `knowledge/source/template.md` for optional structure; do not catalog the template itself. Keep front matter or metadata with source type, provenance, dates and facets. Distinguish constraints, experiences, guidance, preferences and hypotheses; retain applicability/version limits, tradeoffs, counterexamples and useful code examples. Accept rough notes and ask only for context that changes interpretation. Reuse catalog facets when accurate. Project choices are not universal rules; require confirmation before promoting them to shared knowledge.
6. Call `catalog_knowledge_document` after the file exists. If it reports an exact duplicate, do not create a second entry; remove only the newly created duplicate if safe and clearly owned by this operation.
7. Summarize where the source was stored, whether it merged, and that `fs-knowledge sync` is required before distributed Skills use the new knowledge.

For project debugging records, confirm shared-knowledge promotion unless already requested. Sanitize project-specific and sensitive data, retain reproduction evidence and limitations, and distinguish a verified cause from a candidate hypothesis. Registration does not itself update distributed references.

The catalog is a cheap shortlist index, not a substitute for source evidence.
