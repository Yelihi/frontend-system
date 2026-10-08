# Analyze once, reuse with evidence

Use for a project's first analysis, an affected flow missing from existing records,
or an explicit project analysis refresh. For ordinary changes first query
`get_project_analysis` with the task's files. Read selected full records only when
their summaries are insufficient (up to three per page, shared character budget).
Use nextOffset or bounded local JSON reads for omitted details. A current hash means declared dependencies match, not
that the interpretation is complete or correct.

## Inspect in this order

1. Inspect manifests, lockfile, framework/router entry points, build/deploy settings,
   TypeScript aliases and existing lint/test/import-boundary checks. Reuse existing
   tools. A package or folder name is not an enforced architecture rule.
2. Follow real imports from entries and routes to components, application/domain
   modules and infrastructure. Record exceptions and unresolved dynamic boundaries.
3. For each in-scope user/background/lifecycle event, trace the callback, actual
   arguments and callees to their state writes, validation, external effects, return
   values and error consumers. Follow subscriptions back to affected views. Distinguish
   local state, external store, server cache and transport; props are not ownership.
   Include success, failure, cancellation, ownership changes and cleanup when present.
   Algorithms/optimizations need evidence of their purpose; do not infer intent from names.
4. Route relevant code observations through `get_work_context` (includeRelations only
   when needed). Read selected knowledge and follow its investigation instructions.
   Reuse the inspected source and relationships; do not start a second full scan.
5. Persist a bounded flow and actionable findings. Record unsupported edges and search
   scope explicitly. Do not manufacture an exhaustive whole-project or runtime graph.

Inspect independent routes separately. Shared modules can be referenced by stable IDs
within a flow; do not duplicate entire source bodies. Split large flows by scenario
or page boundary. When an uncertainty affects a decision, inspect that dependency or
ask about the unresolved domain intent. Do not ask developers to look up code facts.

## Records and freshness

Read `node <plugin-root>/bundle/tool-help.mjs save_project_analysis` for the payload.
Write `{expectedHash:null,record:{kind:"flow",data:...}}` to
`.frontend-system/drafts/<id>.json`, then call `save_project_analysis` with draftFile.
Updates require the current hash. Extend nodes/edges/scenarios by ID, not by blindly
appending copies of existing entries; IDs are unique inside each collection. The flow has scope.files/discoveryRoots, exact code
evidence, nested nodes, edges, scenarios, invariants and limitations. Use broad enough
discoveryRoots to invalidate new consumers; include existing callers/configuration.
Default discoveryMode source tracks code/config/data file contents and inventory without treating Markdown
reports as code. Use all for Markdown-driven content/routes; explicitly listed source
and requirement files are hashed regardless of this mode.
Existing files outside scope.files can become new consumers, so a content change anywhere
in discoveryRoots invalidates the record conservatively. This may include unrelated changes;
review the changed source rather than rereading every file. Legacy records lacking discovery
content hashes are stale until reanalyzed and saved. Query related IDs together: one query
shares inventory and source hashes, while a later query always rechecks current content.
The server detects changes only within declared dependencies/discovery roots. A
separate consumer outside those roots remains an explicit analysis limitation.

Use basis observed for cited implementation relationships, proposed for future design.
For a new project cite supplied requirement files where applicable; unimplemented
nodes are proposals. Main snapshot sources and working sources must not be mixed. Findings may cite the
same main snapshot as their flow. A new working requirement needs a working flow with
that file included; it cannot be quoted from an older main snapshot.
Do not treat event order as actual scheduler timing, a subscription as a DOM commit,
or a nominal HTTP success as an executed verification result.

A finding references a current flow hash and exact code/contract evidence. Record
observation, consequence, alternatives with cost, linked knowledge IDs, and a material
question only if unresolved. Kinds are violation (requires established authority),
choice, or hypothesis. A knowledge trigger alone cannot create a violation.

### Group bookkeeping after the judgment

Review the scoped evidence and decisions first, then compose related flow/finding
drafts together in one file edit. With host tool orchestration, save sequentially in
one host call: flow first, then its findings using the successful flow receipt's hash.
Only fill mechanical references from receipts; do not change judgments in a script.
Require each receipt to match the requested kind/id and contain a hash and status
saved/unchanged; stop dependent writes on errors or an unexpected receipt. Surface the
error and already-saved receipts. Saves are not a transaction: retain successful
records and retry only the failed/dependent work, with its original expectedHash.
Never auto-fetch a newer expectedHash to force a retry through a conflict.

Keep draft bodies and successful receipts available for subsequent analysisRefs and
context saves. Do not query full records merely to confirm your own successful save
or rediscover a hash just returned. Query selected records when entering a new session,
dependencies changed, the body is unavailable, a guard rejects it, or an audit needs it.
Freshness checks at plan binding/approval remain mandatory. A receipt is not semantic
verification or proof that sources have stayed current. Group only already-decided
work; unresolved choices still need investigation or the developer's answer.

Resolved/dismissed findings require evidence and a reconsideration condition. Their
old versions remain in history. `executed-check` is a cited host report, not a server
test result; only use it with a real check record. If implementation changed sources,
refresh the affected flow before updating its findings. Do not silently refresh main.

## From analysis to a plan

Start with relevant open/deferred findings and existing decisions. Ask the smallest
material unresolved question with evidence, viable alternatives and costs. Existing
approval covering the scope is reusable; it is not a reason to ask again. Confirmed
violations can become required repairs within already-authorized work. Keep choices
and unknown intent separate from requirements.

New requests need not have a pre-existing finding. Analyze the affected delta and
record it before binding a plan; an old project description must not forbid new work.
For a feature, establish domain actors/outcomes, normal and exceptional events,
state/error ownership, page behavior, constraints and non-goals. Propose a flow, check
it against current architecture and applicable knowledge, resolve material choices,
then use the ordinary plan contract. When binding the plan, judge every current routed
candidate once. Unrelated legacy search hints may use the existing grouped dismissal
with their explicit IDs and scope rationale; candidates with investigation specifications
need their own question findings. Never silently omit candidates or claim they were
investigated merely because a flow record names the knowledge. No separate approval ritual is needed when the
user has already authorized the concrete scope.

Bind reused records with `save_revision.evidence.analysisRefs` entries:
`{kind:"flow"|"finding",id,hash,issueIds:[...]}`. Each issue must belong to a recorded
decision. The plan contains only the selected change, obligations, discretion, open
questions and verification. Do not restate project analysis or copy all graph data.
Use independent verifiable issues, not one issue per file. Citations and hashes are
mechanical checks; the host must still verify that obligations express the decision.

Version/source freshness is checked before approval and starting work. Normal edits
during authorized implementation preserve the pinned historical analysis. Completion
still needs implementation checks; an old analysis is not proof of the new code.

## Manual baseline and visualization

`project.md` stays the concise main baseline; detailed evidence, file inventory and
flow records are read on demand. Working/proposed analysis is separate. Updating the
baseline is an explicit user operation after satisfaction with implementation. Keep
first-time baseline initialization as part of a requested saved FS plan unless the
user restricts that write; a visualization-only request does not initialize it. Check
this prerequisite before composing a bound revision. Keep
resolved findings out of active planning and retain their history instead of deleting
the reasons. Additional change requests go through plan revisions first.

`render_project_flow` uses id/expectedHash and html or mermaid. Both use the same
record. HTML supports nested page/component cards, props/state/events/lifecycle,
external store/cache/module nodes, event selection and step impact. This is a
C4-inspired frontend notation, not strict C4 or a runtime tracing tool. Show limitations
and stale/proposed status alongside the diagram. No generated image is needed.


## Deliver an actual-code visualization

A request to visualize an existing project requires its own observed code analysis.
Never substitute docs/examples/frontend-flow.json, another project, or a proposed
refactor for the current implementation. Trace actual callers/arguments, state writes,
error consumers and subscriptions; preserve defects as current behavior. Record absent
bootstrap/routes and unproven scheduling explicitly. Do not invent cache or component
nodes to fill a template. Split oversized scopes by page/event with explicit omissions.

Use the saved observed record's hash with render_project_flow. Default export rejects
stale/proposed records. Select language ko (default) or en for HTML controls; source quotes
remain unchanged. Never translate or patch the exported HTML manually: rerender with the
right options or corrected analysis to preserve the returned content hash. Reanalyze
stale scope; allowUnverified is only for an explicitly
intended proposal/historical preview, never a repair for failed evidence. Report the
returned artifact path and observed scope, not just tool success. Check a meaningful
success/failure or cleanup scenario against code or an existing executable test and
state which verification actually ran. The HTML shows node/edge citations and export
provenance; it does not monitor later filesystem changes. A current dependency hash
cannot prove semantic accuracy, runtime timing or full-project coverage.

For UI verification, select an event and step, inspect affected endpoints and code
citations, and check a narrow viewport when browser access permits. If unavailable,
report that limitation; do not claim a rendering check passed. Keep generated artifacts
out of experiment source inputs. The CLI equivalents are flow-list, flow-save and flow-render; consult fs --help.
These deterministic helpers consume host-authored analysis, not arbitrary source code.
