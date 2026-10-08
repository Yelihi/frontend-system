# Frontend System Knowledge Sync

Read `../../references/knowledge-indexing.md` for the review criteria, index fields and evaluation procedure.

1. Resolve the original repository and call knowledge_status. A bare sync automatically
   selects syncReady IDs that are unpublished; no extra user message is needed. Explicit
   IDs must also be merged. If none qualify, report no work and the active/pending counts.
   Do not scan pending bodies, activate notes, or run review as part of sync. Report invalid
   metadata and legacy records separately; do not silently migrate or approve them.
2. For selected merged sources, inspect affected references and recorded provenance.
   Check only their registered remote sources. Changed content, provenance or evidence
   requires recatalog/review and must not be silently reapproved during sync. Preserve
   existing publications; report required correction/retraction explicitly. A local
   pending selection does not remove an already installed reference. Read selected
   reviewed sources and necessary related references; preserve uncertainty and scope.
3. Preserve useful concepts without inventing prescriptions. Create conditional decisions only where the evidence supports them. Prefer supplementing a cohesive reference; preserve conflicting claims and counterexamples. Retain compact source evidence in the distributed reference, since raw originals may be unavailable in installed plugins.
4. Publish v3 routing for every entry: direct (triggers/checks, semantic descriptions, conditions/exclusions), supporting (reason and a related direct judgment), or deferred (unresolved reason, no active triggers). Do not invent prescriptions or a detector per source. Update references/learned/index.json and affected Markdown together, preserving unrelated entries. Record source hashes and related IDs. Record represented/deferred/omitted outcomes with reasons, including claim-level omissions. Recheck every reference affected by source corrections or deletion. Never infer approval to promote a project preference into shared policy.
For selected direct references, derive `investigation` using
[knowledge-investigation](knowledge-investigation.md): explicit code/intent questions,
applicability/exclusion roles, preserved contracts, alternatives and missing-context action.
Strict MCP publication requires it; unrelated legacy entries remain readable. If the
source cannot support a conditional investigation, use supporting/deferred rather than
inventing advice. Validate actual syntax/call extraction separately from host judgment.

5. Record representative symptom queries as index retrievalChecks (query, technologies, expectedIds, forbiddenIds), including an excluded context and an abstention case with expectEmpty: true. Record positive and forbidden triggerChecks for each direct entry; missing coverage blocks publication. Exercise code extraction and contextual exclusions separately. Copy call IDs from real inspect_code_knowledge output (module#export or supported global#fetch), never a bare callee name. Injected/local methods need cited semantic interpretation; do not invent static binding. A synthetic signal repeated in the expected trigger can pass matching while never occurring in code. Call validate_knowledge_sync for read-only validation (omitted IDs select merged sources awaiting publication); passing is not a semantic pass. Exercise representative symptom queries with the search tool (or local exported search function when editing the source checkout), inspect necessary bounded bodies, and run repository checks. Evaluate retrieval separately from whether advice is justified. Do not publish claims of measured real-world accuracy from synthetic tests.
6. Call mark_knowledge_synced only for represented or explicitly omitted merged source IDs after validation. Omitted IDs automatically select merged sources awaiting sync; never use this until all selected artifacts are ready. Use explicit IDs for partial successful batches. Deferred sources and deferred routing remain unpublished. Completion binds derived artifacts as well as source hashes; metadata/example changes require resync. Report created/merged references, reviewed claims, unresolved conflicts, omission reasons, evaluated cases and verification limits.

Local symlink installations see changes immediately. Installed plugins receive them after updating the shared installation. Do not report the installed server as refreshed merely because source files changed.
