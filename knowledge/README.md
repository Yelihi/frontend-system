# Source knowledge

This directory is the original, reviewable knowledge archive.

- `source/manual/`: user-authored Markdown
- `source/imported/`: normalized notes from websites and external documents
- `source/attachments/`: attached originals when permitted plus normalized Markdown
- `catalog.json`: compact facets, summaries, hashes, and publication state

Run the `fs-knowledge-add` Skill to classify and deduplicate new material. Run `fs-knowledge-sync` to publish actionable summaries to `references/learned/`. Raw sources are excluded from the npm/plugin package.
