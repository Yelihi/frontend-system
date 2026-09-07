---
name: fs-knowledge-add
description: Convert user-authored Markdown, attached files, or linked frontend material into normalized source knowledge with classification and duplicate-aware cataloging. Use when the user asks to add or import frontend knowledge.
---

# Frontend System Knowledge Add

Store source knowledge in the original frontend-system repository, never in a consuming project's copied Skill. Resolve that repository from `FRONTEND_SYSTEM_REPO`, a user-provided path, or the current checkout.

1. For a URL, retrieve the source and record title, canonical URL, author/publisher when known, access date, a concise paraphrased summary, and only short necessary excerpts. Do not archive full copyrighted articles. For an attachment, retain the original when permitted and create normalized Markdown. User-authored Markdown may remain the canonical source.
2. Call `search_knowledge` using the candidate topic and likely facets. Read only the top matching source files needed to decide placement.
3. Merge into an existing document only when it represents the same cohesive concept and the new material improves it. Similar facets alone do not justify a merge. If it conflicts, preserve both claims with sources and mark the uncertainty.
4. Otherwise write a new Markdown file under exactly one of:
   - `knowledge/source/manual/`
   - `knowledge/source/imported/`
   - `knowledge/source/attachments/`
5. Keep front matter or a metadata section with source type, URL/file provenance, dates, and facets. Reuse catalog facet values when accurate; introduce a new value only when existing values would be misleading.
6. Call `catalog_knowledge_document` after the file exists. If it reports an exact duplicate, do not create a second entry; remove only the newly created duplicate if safe and clearly owned by this operation.
7. Summarize where the source was stored, whether it merged, and that `fs-knowledge-sync` is required before distributed Skills use the new knowledge.

The catalog is a cheap shortlist index, not a substitute for source evidence.
