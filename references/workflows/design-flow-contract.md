# One design record, multiple views

Use during fs-project, fs-plan and fs-plan-visualize. The host interprets and discusses;
FS validates identities, versions and links and deterministically renders the saved data.
HTML is a human view. Implement from the approved revision and pinned flow JSON.
The page explorer uses Korean controls; `language: en` retains the English logical-flow view.

## Start from a short request

A user need not supply a complete specification or image. Read the relevant baseline,
then develop domain outcomes, ownership, UI states and risks together. Inspect code facts
before asking. Ask native questions only when an unanswered choice changes the outcome,
architecture, contract or verification; pause dependent work until the actual answer.
Routine details within delegated discretion need no separate question.

For a new project, begin with the confirmed brief; for a feature, retain the existing
architecture and inspect its affected callers and shared consumers. Show an early draft
and update it as requirements change. Reuse unchanged decisions and records. A changed
requirement reopens affected scenarios, interfaces and tests, not the whole interview.

## Author the canonical flow

Use save_project_analysis, never a second manually maintained page-flow graph. Inspect
its payloadSchema as needed. Existing flows without these fields remain readable.

- `designState: draft|ready` applies only to proposed designs. A draft with pages can
  have no scenarios while the layout/domain discussion is beginning. `ready` is design
  completeness for plan binding, not implementation permission.
- `pages`: page node, route, optional domain, and `scenes` with stable IDs, title, kind,
  description. Choose actual/relevant states, not a mandatory cross-product. Consider
  initial loading, submitting/loading more, stale visible data, success, empty, error,
  retry, cancellation and navigation where the domain needs them.
- `scenes[].blocks`: proposed wireframe regions in reading order, referencing the page
  or its components; role heading/input/action/list/content/feedback/navigation, label,
  optional content and full/half span. These are a rough layout, not product code or
  a runtime screenshot. Existing observed pages use actual captures instead.
- Nodes retain contracts `{kind,name,path,signature,evidence}` and concrete props,
  state/events/lifecycle. Add `architecture: {layer,runtime,responsibility}` with the
  project's actual or explicitly proposed layer and browser/server/shared/external
  runtime. Do not impose a framework or infer a layer from a folder name alone.
- Edges retain call/read/write/return/etc. Every structured step has explicit
  `views:[{page,scene}]`; views describe resulting visible page states, not concurrent
  React commits. `changes` records ownerNode, field, before/after values or expressions,
  and basis source/measured/proposed. Never label static interpretation as measurement.
- Scenarios retain the domain event, ordered steps and outcome, with event/lifecycle
  category and idle/loading/success/empty/error/cancelled/retry/custom variant. Trace
  relevant failure and ownership-change paths through cleanup, rollback and consumers.
- `testCases` holds id, scenarioId, Given/When/Then and method. `checks` links a concrete
  risk/requirement to nodes/scenarios and these case IDs. A proposed case is not a pass.
- `navigation` records actual/proposed route transitions separately from shared-state
  propagation. Do not invent navigation edges just because two pages read one cache.

Only behavior-bearing boundaries need contracts, not every local variable/helper.
Before setting ready, each scenario needs test intent and pending knowledge decisions
must be resolved. Rendering does not prove semantic correctness or exhaustive coverage.

## Knowledge as a scoped reason

Inspect event → caller → argument/return → state/effect owner → consumers using the
same code and flow record. Describe that relationship and its possible failure when
querying get_work_context/search_learned_knowledge; names alone are insufficient.
Inspect conditions, exclusions and investigation questions. A candidate is not a defect.

Record `knowledge` judgments with an ID, referenceId, **referenceHash** returned by
read_learned_knowledge/get_work_context (metadata plus body identity), judgment
apply/keep/not-applicable/needs-context/needs-decision, rationale, evidence IDs and
scoped node/edge/scenario IDs. For application, include its owning decisionId.
State the observed/proposed condition, applicable principle, chosen mechanism and
preserved behavior. Keep the causal explanation; do not attach a source after deciding
merely to make the change appear supported. Unknown matching knowledge remains explicit.

The inspector displays the judgment and its version. “Plan approved” appears only when
rendering with a matching approved plan. Before that it is a recorded design judgment.

## No supplied image

Existing project: identify routes from the analysis, run the actual selected code version
with the project's existing commands and available browser tools, and capture relevant
page states. For whole-project analysis account for all discovered routes, use representative
valid parameters, and record inaccessible states. For feature work capture affected pages
and shared consumers, not the whole app again. Do not reset a user's worktree to match
main; use a matching running version or isolated checkout. Do not manufacture auth/data.

New project/feature: use structured HTML wireframes first. Express filters, pagination or
infinite-scroll choices, loading areas, preserved inputs, errors and retry in scenes and
scenarios. Show them during domain discussion; refine after feedback. No generated bitmap,
product code or additional image-confirmation ceremony is required. A material design
choice still requires an answer. If the user supplies a visual reference, retain the
existing image review workflow and map confirmed mockup assets to explicit scenes.

## Captures and output

render_project_flow uses the page explorer automatically when pages exist; fs-project's
human report uses the same projection. It emits HTML, a compact `.model.json`, and a
`.capture.json` list. The canonical flow remains the source of truth; do not edit outputs.

Save actual PNGs outside `.frontend-system`, for example `design/fs/captures/`. The
optional manifest is `design/fs/<flow-id>.captures.json`:
These manifest files and PNGs under `design/fs/captures/` are generated artifacts excluded
from automatic source discovery; explicit analysis dependencies are still hashed.

```json
{
  "flowHash": "saved flow receipt hash",
  "sourceCommit": "observed baseline commit when pinned",
  "screens": [{
    "page": "page-node-id", "scene": "loading", "kind": "capture",
    "path": "design/fs/captures/loading.png", "hash": "PNG SHA-256",
    "url": "http://localhost:3000/resources", "capturedAt": "2026-10-21T00:00:00.000Z",
    "width": 1440, "height": 900,
    "regions": [{"node": "results", "x": 0.1, "y": 0.2, "width": 0.8, "height": 0.5}]
  }],
  "blocked": [{"page": "page-node-id", "scene": "error", "reason": "State cannot be reproduced with available test data"}]
}
```

Use kind mockup for a proposed visual asset. Observe the real DOM for normalized regions;
metadata and hashes cannot prove which UI an image depicts. Validate image/viewport/state
visually and report any injected fault or test data. No secrets or session tokens in URLs.
Rerender after capturing. Missing captures are a partial screen deliverable, not a blank
page presented as completion; keep usable structure and explain the concrete blocker.
Never screenshot the explorer and label it an application's screen.

## Plan and implementation handoff

Set ready after design discussion. Pin the exact flow version in analysisRefs. For every
adopted proposed node contract, set issue.implementationTargets[].flowTarget to
`{flowId,nodeId,contractName}`; files include the contract path. Link adopted learned IDs
and the resolved decision. Copy flow test intent exactly into issue.testCases with
flowId/scenarioId and planned files; plan adds implementation instructions, exclusions,
checks and verification details. One issue remains one end-to-end domain flow.

Plan save/approval checks the links, knowledge version and expected test outcomes.
Revising an approved flow requires a new plan revision; do not silently repin approvals.
After approval, fs-work implements continuously and checks the actual contracts, callers,
state ownership and success/failure paths. Only new material conflicts return to planning.
Evidence-backed post-implementation review remains necessary beyond schema checks.

## Feedback and knowledge candidates

Discussion answers and changing requirements are ordinary design input. Record only the
relevant answer, affected IDs/version, decision and rationale in existing requirement and
project-decision records. Update the flow, tests and plan together when they change.
No special learning command is required for ordinary planning feedback.

The user or host may nominate a reusable candidate. Keep it in project-local evidence
with the condition → consequence → choice, exceptions, code/source grounds and proposed
retrieval/application cases. Apply the disposition criteria in pr-feedback.md to design
feedback too: project-only, reusable, needs-context or rejected. Repetition is not proof.
Publishing shared knowledge still uses an explicitly authorized pending contribution and
the existing active/review/sync process. A local design decision can apply immediately
without publishing it, and a newly synced reference never silently rewrites an approved plan.
