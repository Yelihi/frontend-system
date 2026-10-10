# Create or refresh the project baseline

Use from `fs-project`, `fs-project update`, or first-time initialization for a saved
FS plan. This procedure writes analysis records only, never product code or a plan.
Use the target project, not the installed plugin/source repository.

## Select the snapshot and account for the whole project

- `fs-project [path] [--base <branch>]` creates `.frontend-system/project.md`.
  If it already exists, return its path, baseline and freshness; do not overwrite it
  unless the request also explicitly asks for refresh/reanalysis.
- `fs-project update [path] [--base <branch>]` explicitly authorizes a refresh;
  initialize if missing. Preserve previous context and confirmed decisions/history.
- Reuse the document's established baseRef; on first use default to local `main`,
  or the explicitly named integration branch. Pass baseRef consistently to snapshot,
  source, refresh and save tools. Do not fetch, switch branches, commit, or substitute
  feature-branch code. Report missing branches and working/untracked differences.
- Read [project-plans](../project-plans.md#current-project-context) for refresh records
  and failure preservation. Mark an authorized refresh pending before analysis.
- Page the pinned `get_project_snapshot` inventory to completion. It is the canonical
  baseline coverage list. Working-tree inventory is separate, not evidence that a
  main file was read. Account for every file as inspected, excluded with reason,
  pending or blocked; retain generated/vendor/asset exclusions explicitly.
- Follow [project-flow-analysis](project-flow-analysis.md#inspect-in-this-order):
  environment → imports/layers → route/event/state/error flows → knowledge → findings.
  Read first-party areas in bounded batches; reuse current facts on update and revisit
  affected dependencies. Do not claim a complete scan from a shortlist or file names.
- Preserve unknown intent as unknown. Follow [user decisions](user-decisions.md) if
  an answer is needed. A partial analysis is a checkpoint, not the requested finished result. Continue
  remaining inspectable areas after saving; stop only for a real blocker, user pause
  or explicitly reduced scope. Preserve the next areas and reason if interrupted.
  Unverified runtime behavior can remain a limitation of a completed static analysis.

## Analysis contract and two audiences

Build `analysis.report.areas` from the full inventory before tracing: environment,
architecture, every page/route or bounded scenario group, shared services/state,
and delivery/tests. Give each area a stable ID and reviewed/pending/blocked/excluded
status. Exclusions need concrete reasons in the summary; configuration/static pages
can use flowReason when an event flow genuinely does not apply. Do not mark an area
reviewed merely because its files were listed or its entry point was read.

For each page, trace composition/props, local/store/cache ownership, event arguments,
validation, calls and effects through their consumers, then view updates. Include
failure, loading, cancellation, races and cleanup where implemented. Record domain
invariants, uncertain dynamic edges and evidence. Save bounded **observed** flow
records with scope.snapshot pinned to this baseline; save actionable findings after
their flow receipt. Reuse shared records across areas instead of copying source.

Connect area.statementIds to evidence statements and area.flows/findings to exact
saved {id,hash} receipts. knowledgeReview records observed triggers, consulted IDs,
applicability/exclusions and the resulting finding or reason to retain existing code.
Unknown intent stays a question; do not manufacture a violation or require a finding
quota. Record a reviewed area without flows only with a concrete flowReason.

`save_project_context` with `analysis.report` automatically produces both views:
- Human: `.frontend-system/project.md` explains areas, state ownership, ordered
  scenarios, findings and limits, and links interactive HTML for every included flow.
- AI: a compact immutable `evidence/context-<hash>.json` area/reference index, linked
  from project.md. Exact statements remain in evidence JSON; nodes, state, props,
  edges, scenarios and citations remain in immutable flow/finding JSON. Do not author
  another copy of the graph or make the model consume HTML.

The HTML uses the same renderer as fs-plan-visualize, automatically during context
save; no separate user command or second code analysis is needed. It validates the
same baseline commit even when the worktree differs. Do not substitute working or
proposed flows. Return the saved HTML links. Check a meaningful event/error path
against code; check interactive controls when browser tools are available and report
unrun UI checks. A static diagram is not proof of runtime timing.

Set report.status=complete only when all included first-party scope is inspected,
areas are reviewed or justifiably excluded, required traces and knowledge judgments
are recorded, and no pending/blocked coverage remains. The server checks references,
coverage and projection generation, **not semantic completeness**; the host must
review the result. A failed flow save is a blocker, not permission to replace detailed
analysis with a terse summary. Save a partial checkpoint with blocked area and exact
failure if possible; retain drafts. Do not retry a failing save indefinitely.

## Bind facts and save

Check whether the required main baseline exists.
A request to create a saved FS plan includes first-time baseline initialization;
visualization alone does not. Creating the first baseline is distinct from refreshing
an existing project.md, which remains an explicit user operation. An explicit no-write
or no-baseline constraint takes precedence: report the prerequisite and deliver only
the requested unbound draft, without attempting save_revision or claiming enforcement.

For missing or explicitly refreshed main context, get_project_snapshot then batch
read_project_source(path:[related paths]). Account for every baseline file; follow
callers, state owners and failure paths. Continue nextPaths and truncated nextOffset
with the same expectedCommit. Do not print the same main code through shell first.
Saved projectFacts can replace re-reading only while their dependencies are current;
inspect changed scope, omissions, dynamic edges and uncertain interpretations.

Before saving main facts, discover_knowledge_triggers for observed technology/domain
unless the definitions are already known. Query shortlists are not exhaustive: follow
up an observed relationship missing from the first result. Never invent signal IDs or domain filters; omit domains until discovery supplies valid IDs.
For each recorded code statement supply reuse with all inspected dependencies and registered,
exactly cited semantic interpretations, or reuseReason when binding is not justified.
Reuse needs at least one registered interpretation; otherwise use reuseReason.
Account for every file without turning every line into a separate statement. Group
related facts with their actual dependencies. An observed defect is not endorsed behavior. Use unique exact
{path,quote} citations; repeated quotes and semantic interpretations require inspected
line numbers. Do not guess lines. A rejected location does not justify dropping a fact.

Read `node <plugin-root>/bundle/tool-help.mjs save_project_context` for the payload
schema; plugin root is two directories above skills/fs-project. For large analyses,
write {analysis} to `.frontend-system/drafts/<id>.json` and use draftFile.
User-decision statements require confirmation quoting the actual answer.

Save_project_context uses expectedCommit=snapshot.commit and
expectedHash=snapshot.documentHash (null for a new document), never sourceHash.
Keep authored summary/overview arrays concise and understandable without looking up
opaque IDs. Supply detailed evidence and report references once; the tool expands
human-readable details and HTML deterministically. Never manually duplicate them.
Inspect bound/excluded IDs in the receipt: empty bound is not reusable trigger evidence.

When invoked as `fs-project`, stop after completing the analysis and projections (or
reporting an actual blocker); do not continue into
a new plan, approval, implementation or PR creation. When invoked to initialize
a missing baseline within `fs-plan`, return to that planning procedure. On error,
record the failed refresh and retain the previous document.

Return the clickable `.frontend-system/project.md` path, base branch/commit, coverage
and unresolved areas, analysis status, AI context and diagram links. Fresh/current
commit is not complete coverage. On later tasks use get_project_document (default AI
view), then selected evidence/flow IDs; view:human is for reading the user report. Do not duplicate the same
report at repository-root `project.md`. No implementation test is claimed merely
because its source was inspected. Suggest `fs-plan <change>` as the next command.
