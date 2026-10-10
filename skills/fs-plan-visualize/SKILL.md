---
name: fs-plan-visualize
description: Analyze or refresh an existing frontend's actual page, component, event and state flows and generate a cited interactive HTML diagram. Use for project-flow visualization; proposed design views require an explicit request.
---

# FS Plan Visualize

For material unanswered choices, follow [ask and pause](../../references/workflows/user-decisions.md).
Use the host's native selection UI (Codex `request_user_input` when permitted),
not a prose questionnaire. After asking, pause this task, including reads and browser
inspection, until the actual answer. See the shared procedure for unavailable UI.

Deliver a navigable diagram of the requested project's actual implementation. The
host traces code; FS validates and stores evidence and renders the same record.
This request authorizes analysis records and diagram output, not product edits,
plan approval or a project.md refresh. Honor an explicit no-write constraint.

Use the user's project path or current project. Never substitute the FS source
repository, a synthetic example or a future refactor for the target implementation.
When scope is broad, identify the entry pages and split bounded flows by page/event;
state coverage and omissions instead of claiming exhaustive whole-project analysis.

## Reuse, trace, render

1. Query `get_project_analysis` for relevant flow summaries and dependency freshness.
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
3. For new/changed records, read
   `node <plugin-root>/bundle/tool-help.mjs save_project_analysis` for the payload;
   plugin root is two directories above this skill. Write a confined draft and
   call `save_project_analysis` with the current hash (null for a new ID).
   Use `basis: observed` for existing implementation. A matching citation proves
   its presence, not the truth of the interpretation.
4. Call `render_project_flow` with the saved `id` and `expectedHash`, normally
   `format: html`. Set `language: en` for English controls (default `ko`);
   authored labels and code evidence retain their original language. Use `scenarioId`
   for a requested initial event. Do not rewrite exported HTML: change the record or
   renderer options and rerender so the returned artifact hash remains valid. The default
   requires current observed evidence. A stale rejection requires affected-code
   review, not enabling `allowUnverified` to bypass it. Only explicitly requested
   proposal/historical views use that flag, visibly distinguished from actual code.
5. Check a meaningful normal/error/cleanup path against source or a suitable
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
