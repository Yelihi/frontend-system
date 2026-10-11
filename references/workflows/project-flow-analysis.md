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
or page boundary while retaining the event's cross-page consumers and shared state.
When an uncertainty affects a decision, inspect that dependency or
ask about the unresolved domain intent. Do not ask developers to look up code facts.

## Code contracts and cross-page scope

Keep explanations in the user's language, but preserve actual code identifiers:
`OrderFormProps`, `onSubmit(input: OrderDraft): Promise<SaveResult>`,
`draftStore.quantity: number`, `orderCache.byId: Record<OrderId, Order>`.
Do not replace them with only "submit", "draft state" or translated descriptions.
For scoped interface/type/function/store boundaries, use node `contracts` entries
with `kind`, `name`, `path`, `signature`, `evidence`. Record only relevant members,
not implementation bodies. Observed contracts cite declarations in their own path;
unknown inferred types stay explicit limitations, not invented interfaces.
Proposed paths may not exist yet; never add nonexistent files to `scope.files`.
Use the existing props/state/events/lifecycle fields for concrete members, callbacks,
subscription setup/cleanup and ownership. Contracts do not imply compiler validation.

Follow each event beyond its entry page: shared store/cache writes or invalidation,
other page/component readers, selectors, subscriptions and route re-entry. Keep shared
resources outside individual page containers and represent each consumer under its
own page. Retain relevant consumers even when their implementation will not change.
Record the exact modified field/query key and the consuming callback/view. Distinguish
immediate mounted subscriptions from later navigation/refetch; put these conditions
on edges/steps. Do not imply two alternative routes are mounted simultaneously.
Include failure/rollback consumers where applicable. HTML page links are derived from
scenario edges and containment, not a second manually maintained page list. This is
the recorded scenario's scope, not an automatically exhaustive impact analysis.

## Design a planned flow

Use when the user requests the intended plan/feature/refactor view. Reuse the selected
plan, relevant observed analysis and existing decisions. Do not rescan the project or
require a full planning ceremony just to visualize an already settled plan.
With attached design references, complete the visual review below before this detailed
procedure, unless the user already confirmed the exact mockup and requested detail.

### Review page mockups before detailed design

1. Inspect the attachment and the target page's requirements/conventions. Generate or
   adapt a page mockup for this feature, preserving relevant design decisions. Use host
   image-generation/editing capabilities with the attachment when available, following
   that tool's skill; alternatively use an isolated disposable HTML prototype and a
   real browser screenshot when those capabilities exist. Do not edit product code
   to obtain a preview. A supplied complete target-page mockup can be reused as-is.
   Keep an inspiration/reference image distinct from the proposed page result. If tools
   cannot create or retrieve an image, explain the limitation; do not label the original
   reference or a fabricated path as a newly generated target-page mockup.
2. Save local PNG/JPEG/WebP assets under a project folder such as `design/fs/`, outside
   `.frontend-system`, using new filenames per revision. Copy transient host attachments
   there before saving; no remote URLs or SVG/HTML as images. Each file is limited to
   8 MiB and the gallery to 24 MiB total. Record the SHA-256 of its bytes, alt text and
   page ID in `design.screens`; include all image paths and textual requirements/answers
   in `scope.files`. `reference` is the supplied inspiration; `image` is the target-page
   mockup. The server embeds validated raster bytes into the HTML, not AI record JSON.
3. Save `basis: proposed`, `design.stage: visual-review`, page nodes, empty edges and
   scenarios. No invented technical event just to satisfy a schema. Render HTML with
   `allowUnverified: true`. Show the result and gather feedback with native questions;
   pause pending answers. Record relevant feedback, revise the actual image and rerender.
   A generated picture cannot establish business rules or approval. Do not expand into
   component/props/store/interface design merely because the preview looks complete.
4. On explicit visual confirmation, link `confirmation.evidence` to an exact quoted
   user answer in a project-relative requirements/feedback file and set `imageHash` to
   the confirmed bytes. Keep the stage visual-review until detail is requested
   (including an existing staged-design request after mockup confirmation);
   confirmation alone is not that request. On the subsequent request, cite it through
   `design.detailRequest` and switch to detailed-design. Reuse an explicit combined
   confirmation/request. A changed image requires confirmation for its new hash;
   invalidate earlier confirmation instead of silently carrying it over. Store only
   task-relevant answers, not an entire conversation transcript.
5. Perform the domain-first procedure below. Map useful image areas to component nodes
   using percentage `regions` (x/y/width/height); clicking a region opens that component's
   contract in the same HTML. Include state/props/interfaces, handler→function→store/cache
   effects, external functions and relevant non-functional requirements in `design.quality`
   with scoped node IDs and a concrete verification method. Discuss unknown accessibility,
   responsive, loading/error, security and performance tradeoffs; do not invent numeric
   budgets or requirements. Carry adopted items to the plan's obligations/checks, alongside
   the pinned flow and image hashes. fs-work requires the implementation plan's approval,
   independently of visual confirmation. Visual-review records cannot bind implementation
   analysisRefs. Tool checks verify recorded links/bytes, not who actually spoke or whether
   the image and domain interpretation are semantically correct.

### Elaborate the implementation design

1. Establish the changed domain boundary first: entity identity, meaningful fields,
   invariants, allowed transitions, validation and error outcomes. Reuse actual domain
   contracts. Ask only for unknown intent that changes behavior; do not assume business
   rules from UI labels or force entity classes onto a project that does not use them.
2. Then define the affected component boundaries and props/callback contracts, local
   state vs store/cache ownership, and application/service function signatures. Reuse
   conventions and prior answers. Discuss genuine ownership/lifecycle tradeoffs; routine
   names within delegated implementation discretion need no question. An unresolved
   material choice remains in the plan's open decisions and flow limitations; do not
   depict a preferred option as a settled contract or start dependent implementation.
3. Trace the proposed event through all relevant pages using the cross-page procedure
   above. Save as `basis: proposed` under a distinct ID from the observed baseline,
   citing existing code/requirements where applicable. Proposed contracts need not have
   source evidence; the entire view remains explicitly proposed, including reused nodes.
   A requested design view authorizes `allowUnverified: true` for its export, not bypassing
   stale observed evidence. Reconcile stale plan inputs before adopting the design.
4. For a saved plan, pin the adopted flow hash through `evidence.analysisRefs` to the
   affected issues. Link approved decisions to required obligations identifying the
   node and contract name/path/signature, ownership and cross-page effects. State which
   details remain implementation discretion. Reuse the structured record rather than
   copying its whole contents into plan.md. Check types/callers plus normal, failure and
   conditional-consumer scenarios with existing tooling or scoped semantic review.
   Drawing/recording is not approval. Implementation uses the plan and pinned JSON,
   not the HTML. Later material design changes revise the plan before implementation.

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
Use one domain flow per implementation issue: a user/system trigger, ordered
interactions across participants, state/cache changes, and observable success/error
outcomes expressible in a single sequence diagram. Name the corresponding scenario
IDs in issue.contract; the existing analysisRefs pins their parent flow record/hash.
Normal/error/rollback scenarios for the same intent belong to the same issue. A shared
overview can contain multiple issues; neither a page boundary nor a technical layer
is an issue boundary. Separate independently initiated domain outcomes even when they
share files. Citations and hashes are mechanical checks; the host must still verify
that both the domain-flow boundary and obligations express the developer's intent.

Version/source freshness is checked before approval and starting work. Normal edits
during authorized implementation preserve the pinned historical analysis. Completion
still needs implementation checks; an old analysis is not proof of the new code.

## Manual baseline and visualization

`project.md` is the human baseline report with automatic observed-flow diagrams.
AI reads the compact context index and selected evidence/flow records on demand.
Both views reference the same analysis; never run a second scan just for visualization. Working/proposed analysis is separate. Updating the
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
