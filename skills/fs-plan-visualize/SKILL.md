---
name: fs-plan-visualize
description: Visualize an existing frontend's actual flows or an explicitly requested implementation plan, with concrete code contracts and cross-page event/state relationships. Proposed design stays separate from observed code.
---

# FS Plan Visualize

Follow [the shared design-flow contract](../../references/workflows/design-flow-contract.md)
for canonical page/scene data, scoped learned judgments, no-image wireframes, actual
captures, iterative feedback and implementation links. The saved graph feeds both
HTML and plan contracts; do not author another semantic graph for the viewer.

For material unanswered choices, follow [ask and pause](../../references/workflows/user-decisions.md).
Use the host's native selection UI (Codex `request_user_input` when permitted),
not a prose questionnaire. After asking, pause this task, including reads and browser
inspection, until the actual answer. See the shared procedure for unavailable UI.

When accompanying fs-plan, follow the visualization stages in
[staged planning](../../references/workflows/staged-planning.md). Use the agreed
domain and test-case IDs, collect feedback on proposed page flows, then refine supplied
design references and detailed contracts. Keep case/issue-to-scenario links explicit.
Standalone visualization does not require a full planning interview.

For existing-code requests, deliver a navigable diagram of the actual implementation.
For a request to visualize a plan, new feature or intended refactor, use the shared
[planned-flow design procedure](../../references/workflows/project-flow-analysis.md#design-a-planned-flow):
domain contracts first, then component/state ownership, then cross-page event effects.
For planned implementation, one issue is one domain flow representable as a sequence
diagram: trigger, participants and ordered calls, state/cache changes, and success/error
outcomes. Keep its technical layers together. Identify the corresponding scenario IDs
for each issue; normal/error variants can share the same issue. A multi-page overview
may contain several issues, and crossing pages does not itself split one flow.
Carry these boundaries into fs-plan; drawing alone does not create/approve issue contracts.
When design references are attached, first follow "Review page mockups before detailed
design" in that procedure: generate a target-page mockup with available host image or
prototype/screenshot tools and embed it with the reference in HTML. Wait for visual
feedback; advance to component/state/event/quality design only on the user's subsequent
request, including an already requested staged refinement, reusing explicit confirmation
and scope rather than asking again.
Discuss only material ambiguity; reuse prior decisions. This is a proposed view, not
evidence of implementation. Do not require an extra permission question when the
user already requested that design view. If the target itself is ambiguous, ask.
The host interprets/designs; FS validates records and renders the same data.
This request authorizes analysis records and diagram output, not product edits,
plan approval or a project.md refresh. Honor an explicit no-write constraint.

Use the user's project path or current project. Never substitute the FS source
repository, a synthetic example or a future refactor for the target implementation.
When scope is broad, identify entry pages and their consumers on other pages. Shared
store/cache/module nodes appear once in each flow, outside individual pages. Split
bounded flows by event without dropping its cross-page consumers;
state coverage and omissions instead of claiming exhaustive whole-project analysis.

## Page and route explorer

For page-based interactive visualization, use the packaged
[page-flow renderer](references/page-flow.md) after tracing and persisting the actual
flows below. Author pages/scenes in the saved canonical flow; its projection supplies the renderer input. include route nodes,
recorded event/lifecycle scenarios and concrete contracts. For a screen-based request,
capture the actual relevant page states before calling the result complete; inspect
the renderer's captureCoverage for missing page:scene pairs. If capture is blocked,
report the concrete blocker and deliver the explicitly labeled component structure
as a partial result, not a finished screen preview. Never capture the explorer itself
as a substitute for the application.
Use the same renderer for a plan addition without overwriting observed facts. Do not
substitute demo HTML for the target or imply automatic complete analysis/capture.
The canonical structured flow export is this page explorer. Retain the legacy logical view only for records without pages.

## Reuse, trace, render

1. Query `get_project_analysis` for relevant flow summaries and dependency freshness.
   For a feature addition, first locate the existing canonical flow version and linked
   index.html. Reuse the current baseline and add proposed flows separately. If absent,
   create an observed baseline for the affected pages and their cross-page consumers;
   do not require an exhaustive whole-project analysis/capture for a bounded feature.
   Expand that baseline when new dependencies are discovered. Link the baseline and
   proposed explorer outputs together; never patch generated index.html as source.
   Reuse current records after checking their scope and limitations. Read selected
   full records only when needed. Analyze missing or stale relationships with the
   shared [project-flow-analysis](../../references/workflows/project-flow-analysis.md)
   sections "Inspect in this order", "Records and freshness" and "Deliver an
   actual-code visualization". Do not run the full planning workflow just to draw.
2. Trace entry/route → event/lifecycle callback → actual arguments/callees →
   validation, state/cache writes, external effects and return/error consumers.
   Follow subscriptions to affected views and cleanup. Every observed node/edge
   needs exact code evidence; preserve defects as current behavior. Mark dynamic
   or unknown edges as limitations, and never invent missing stores or lifecycle
   behavior to fill the diagram. Code questions are investigated before asking
   the user; ask only for material unknown intent or an ambiguous target.
   Use concrete identifiers and types in props/state/events and node contracts,
   following "Code contracts and cross-page scope" in the shared procedure.
3. For new/changed records, read
   `node <plugin-root>/bundle/tool-help.mjs save_project_analysis` for the payload;
   plugin root is two directories above this skill. Write a confined draft and
   call `save_project_analysis` with the current hash (null for a new ID).
   Use `basis: observed` for existing implementation. A matching citation proves
   its presence, not the truth of the interpretation.
4. Call `render_project_flow` with the saved `id` and `expectedHash`, normally
   `format: html`. Set `language: en` for the English logical view (default `ko` uses the page explorer);
   authored labels and code evidence retain their original language. Use `scenarioId`
   for a requested initial event. Do not rewrite exported HTML: change the record or
   renderer options and rerender so the returned artifact hash remains valid. The default
   requires current observed evidence. A stale rejection requires affected-code
   review, not enabling `allowUnverified` to bypass it. Only explicitly requested
   proposal/historical views use that flag, visibly distinguished from actual code.
5. For visual review, check that every attached image decodes in the HTML, matches
   its page and remains readable on the requested viewport. For detailed/observed flows,
   check a meaningful normal/error/cleanup path against source or a suitable
   existing test. If browser access permits, inspect event/step selection and code
   citations in the generated file. Report unrun or blocked checks accurately.

Output is `.frontend-system/diagrams/<id>.html` in the target project. Return its
actual path, a clickable link, the covered pages/events and an appropriate local
open command if useful. Distinguish static interpretation from executed tests and
runtime rendering. Offline HTML captures export-time freshness; it does not watch
later code changes. On refresh, recheck dependencies and reuse unaffected records.

If tools are missing, report which persistence/export capability is unavailable;
do not fabricate a saved record or claim a mock diagram represents the project.
For follow-up design decisions or implementation, carry the cited findings into
`fs-plan`/`fs-work` within the user's requested scope. Visualization alone does not
require either workflow or a separate approval ceremony.
