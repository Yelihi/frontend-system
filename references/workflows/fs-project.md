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
  an answer is needed. A partial analysis can be saved with pending/blocked coverage;
  it must not be reported as finished or used to invent a user's decision.

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
Use a concise summary and evidence; avoid repeating statements in descriptive arrays.
When typed flows already hold event details, keep main context to a cited baseline
overview and its working-analysis index link; do not duplicate every flow step/finding.
Inspect bound/excluded IDs in the receipt: empty bound is not reusable trigger evidence.

When invoked as `fs-project`, stop after saving the analysis; do not continue into
a new plan, approval, implementation or PR creation. When invoked to initialize
a missing baseline within `fs-plan`, return to that planning procedure. On error,
record the failed refresh and retain the previous document.

Return the clickable `.frontend-system/project.md` path, base branch/commit, coverage
and unresolved areas. The document is a concise index of observed architecture,
flows, rules and findings; detailed records stay linked. Do not duplicate the same
report at repository-root `project.md`. No implementation test is claimed merely
because its source was inspected. Suggest `fs-plan <change>` as the next command.
