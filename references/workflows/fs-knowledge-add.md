# Add shared knowledge through a PR

`fs-knowledge add` contributes supplied knowledge to the official FS GitHub repository.
It is not a write to the consuming project's origin or the installed plugin cache.
The user needs GitHub CLI authentication (`gh auth login`); no FS checkout is required.
No routing JSON, target path or extra submit sentence is required from the user.

1. For links and attachments follow linked-knowledge.md: read the permitted content,
   record provenance/capture scope, and normalize the contribution into Markdown. The
   automated contribution accepts one Markdown document, not arbitrary binary uploads.
   Do not silently omit an attachment that cannot be represented; retain/report its limits.
2. Organize the supplied material using relevant source-template sections: context,
   claims, evidence, applicability, counterexamples and open questions. Preserve the
   author’s claims, distinguish AI interpretation, and leave unknowns unknown. Do not
   invent examples or turn CS background into a mandatory code prescription.
3. Call prepare_knowledge_contribution with title/content. It forces pending metadata,
   fixes the official repository from plugin metadata and returns the exact draft id/hash.
   Inspect the prepared result. Exclude credentials and unrelated/private project data
   from a public contribution. Explicit local-only requests use add_knowledge_note with
   the user-selected checkout instead; no PR is created for those requests.
4. Call submit_knowledge_contribution with that id/hash. This request is authorized by
   the explicit shared add invocation. The tool uses a contributor branch (fork when
   needed) and creates a PR containing only the pending source Markdown. It never
   edits catalog.json, main, learned references, release metadata or another project.
5. Return the actual PR URL and pending/unreviewed status. If authentication/network/fork
   preparation fails, report blocked and the retained draft id/path. Retry the same
   id/hash after the error is resolved; do not prepare duplicate drafts, silently
   switch repositories or claim a local save was uploaded. An existing closed PR is
   reported as closed, not silently replaced.

The maintainer decides whether to merge the PR, then selects state: active in the source.
Active preparation, review, sync and plugin release are separate stages. A contributor's
PR merge does not approve knowledge or update installed plugins. Existing project
policies also remain unchanged.
