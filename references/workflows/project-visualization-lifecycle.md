# Project baseline and issue visualization

At the start of fs-plan or fs-plan-visualize, call get_project_analysis with
projectView:true (and baseRef only when the user overrides it). This request authorizes
analysis records and generated views, including automatic baseline refresh; never
product edits, a plan approval, remote fetch or branch switching. Do not invoke this
refresh in the middle of fs-work: retain its approved version and handle conflicts.

## Entry and return

- analyze-all: run the entire fs-project procedure, then return to the original request.
- resume: continue every pending inspectable area of the saved whole-project analysis.
- refresh: compare changedPaths and affectedFlows, examine callers, shared consumers,
  route discovery and configuration. If changesTruncated, page get_project_snapshot for
  the full inventory and inspect the complete commit diff; the first 200 paths are not coverage. Reuse reusableFlows without rereading their bodies.
  An unchanged saved flow can remain pinned to its original commit: context save
  validates its dependencies against the new baseline and records that validation
  through the new context's baseline. Never rewrite its old evidence/history.
- reuse: use the compact context and relevant records. Do not reread the whole project.
- new-project: discuss the brief and use proposed flows; no observed application exists.

Follow environment → architecture/dependencies → all routes and domain event/state/
error/cleanup flows → learned applicability → findings. Whole-project completion needs
accounted inventory and reviewed areas, not simply a file list. A missing screenshot
is a separate capture limitation, not missing static coverage. Continue reachable
captures. With a real static-analysis blocker preserve the partial checkpoint and ask
through native selection only if the user must choose a reduced scope. Never quietly
substitute a feature-only baseline. Explicit no-write constraints take precedence.

The baseline is the established local integration branch (main initially). Report
remoteChecked:false; do not imply that GitHub's latest merge has been fetched.
Preserve working/untracked changes separately. Unknown dependency impact expands the
inspection scope rather than allowing a guessed reuse decision.

## One entry, immutable records

Context save creates .frontend-system/diagrams/index.html and an immutable baseline
manifest, aggregate viewer and the existing per-flow exports. The HTML is a projection,
not source data. Never hand-edit it or copy it back into observed facts. The project.md
marker binds the manifest; AI reads its references, never HTML or screenshot data.

Set node.entityId only for a verified shared identity across flows. A matching name is
not enough. Reuse the same ID as designs evolve; all affected consumers must agree on
its architecture and contract. Component instances with different owners remain local.
Flow-local nodes, edges, scenes and scenarios stay namespaced. Shared pages collect
scenarios from their related flows; shared stores/services appear once. Route navigation
is separate from shared-state propagation. Legacy records remain available through
existing flow links; populate concrete pages during migration instead of inventing UI.

## Issue design

Save proposed canonical flows first, using issue-specific flow IDs distinct from observed
flow IDs. Keep entityId stable where the underlying page/service identity is unchanged. Then use save_project_analysis with a JSON draft
whose record.kind is change. Read its exported payloadSchema before composing it:

- version:1, issueId, title, baseHash from projectView readiness;
- operations: add {flow:{id,hash}}, replace {before:{id,hash},flow:{id,hash}}, or
  remove {before:{id,hash}}. Replace/remove require the exact previous version.
- expectedHash:null for a new issue, otherwise the previous change hash.

Each operation targets a whole bounded domain flow, retaining its layers and error
variants. Canonical records hold interfaces, learned judgments and test intent; do not
copy them into the change set. Updating a shared contract requires updating all affected
flow definitions together. Composition rejects incompatible shared definitions.

Render with render_project_flow(projectView:true, issueId:<id>); omit per-flow id/hash.
The same index.html selects current implementation or an issue preview. Feedback creates
a new immutable proposal version. It never repins an approved plan automatically. Keep
plan analysisRefs and implementationTargets tied to the exact reviewed canonical flows.
A changed baseline disables obsolete previews until the host reviews/rebases them. For
independent changes reuse the proposal after checking the targeted receipts; conflicts
in shared contracts require interpretation and possibly a native user decision.

## Reconcile implementation on the next task

After updating the observed baseline, read pending issue changes from the returned
issue list and their .frontend-system/changes/<issueId>.json. Compare each operation to
the actual implementation: contracts, callers, ownership, success/error/cleanup and
relevant tests. Do not mark a proposal observed or infer success from passing schemas.

Update only reconciliation on that saved issue:
- baselineHash: current viewHash;
- implementationCommits: exact locally verified commits included in the baseline;
- comparisons: one targetId per operation, matches/differs/unverified, explanation,
  current observed {id,hash} (required for matching additions/replacements), and exact
  code citations. For removals cite the remaining callers/routes demonstrating removal.

The server verifies ancestry, current observed references and citations. It cannot prove
semantic equivalence; the host supplies the comparison. Record partial implementation as
differs/unverified, not applied. If squash/rebase makes the association uncertain, do not
invent a commit link: leave the issue needing reconciliation and ask only if inspection
cannot establish the connection. The original approved design remains unchanged.

No background watcher or CI model runs. Explicit fs-project update refreshes immediately;
otherwise the next fs-plan/visualize does it. Distinguish merged code from deployed code.
CLI report: baseline commit and remote status, inspected/reused areas, design differences,
pending issues, capture coverage/blockers and the stable index.html path. Do not call
schema validation, citations or screenshot hashes proof of correctness.
