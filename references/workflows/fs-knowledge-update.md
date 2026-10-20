# Update selected knowledge after source PRs merge

`fs-knowledge update` is a maintainer command in an explicit FS source checkout. A
GitHub PR merge accepts source material; it does not select a pending note, approve
its claims, sync a reference or release a plugin. Reuse the existing review and sync
tools rather than running a second publication path.

1. Call `list_knowledge_updates` first and show its candidates in the CLI with ID,
   title, state, review status, already-linked reference IDs and shared source IDs. Show
   the pending count separately. Process every listed candidate unless the user
   named a subset; never activate pending notes or silently review all stored notes.
   `needsRecatalog` blocks that candidate until the changed source is recataloged.
   Refresh the list after edits; do not act on an old source hash.
2. For active candidates, follow `fs-knowledge-review.md` one source at a time. A
   current approved review makes the source merged. Record changes-requested or
   inaccessible evidence and continue with unrelated candidates. Do not treat
   automatic capture checks as semantic approval. Reuse a current review for an
   unchanged merged source.
3. Before writing learned artifacts, inspect `references/learned/index.json`, the
   likely existing reference bodies and their source links. Search by the source's
   actual claim and symptom, not title alone. An empty `existingReferences` means
   only that this source has not yet been linked; it is not a new-reference decision.
   Decide whether to extend a cohesive
   existing reference, add a distinct reference, retain a supporting concept, defer
   or omit. For an existing reference, preserve its prior claims, source IDs,
   conditions, exclusions, routing and checks unless evidence justifies a change.
   Record which old claims the new source supports, qualifies or conflicts with.
   Do not create a near-duplicate reference just to avoid testing the old one.
4. Group sources that change the same reference or its dependent references. Include
   all source IDs whose publication binding changes, even if they were synced
   before. Show the expanded group before testing. Work in an isolated checkout/draft so a failed group cannot leave a
   half-updated published reference in the maintainer's working tree. Complete
   independent groups sequentially; a blocked group does not certify or prevent
   unrelated groups.
5. Prepare applicable, excluded and missing-context code cases with expected and
   forbidden decisions before judging the draft. Reuse reviewed source examples,
   but include new code contexts and the existing reference's prior cases. Run
   executable behavior checks for factual claims where possible. Derive the learned
   body, index, routing, investigation and outcomes following
   `fs-knowledge-sync.md`; run `validate_knowledge_sync` for the complete group.
   Exercise actual extraction/retrieval and the host's contextual judgment against
   the cases, including preservation of old advice. A synthetic trigger match alone
   is not an application test. Keep subjective or disputed expectations explicit;
   ask the owner only when that choice is material. Do not claim an independent
   model test when the same context saw the expected decisions; use a fresh context
   when available and otherwise report a non-blind dry run.
6. On success, call `mark_knowledge_synced` with the group's complete source ID list.
   On a source-review failure, keep it active/changes-requested. On a retrieval,
   trigger, application or regression failure, keep the group unpublished with the
   failing case and draft. On tool error or timeout, record unverified and resume
   from current hashes. Never turn a failed or unrun case into success to finish a
   batch. A deferred source is not marked synced; an explicitly omitted source
   records its reason under the existing sync contract.
7. Report each source/group as synced, deferred, changes-requested, failed or
   unverified, with reference IDs, checks actually run, first failure, remaining
   owner decision and the next resumable step. Sync still does not publish a plugin
   release or update installed clients.

The ordinary `fs-knowledge review` and `fs-knowledge sync` intents remain usable
separately. This update intent only composes them with a visible queue and
case-by-case evaluation; `mark_knowledge_synced` still validates hashes and routing,
not the truth of a model's judgment.
