# Evidence-led frontend decisions

Read this for revision, review, implementation and verification. FS's goal is to
reduce defects, risk and maintenance cost. Keeping suitable code is a valid result.
The active host model reasons and edits; MCP discovers, stores and runs checks.
Do not start a nested model. There is no background watcher or automatic PR hook.

## Read before deciding

Call `get_work_context` with the current task and appropriate mode. Read the current
`init.md` (legacy `project.md` is a fallback), revision metadata and relevant evidence
and decisions. `workflow.revision.truncated` means read more with `get_revision`.
Select records by ID with `get_project_record`; follow `nextOffset` as needed.
The context shortlist is a starting point, not an analysis boundary.

For snippet/synthetic reviews without a target repository, use the supplied facts;
never substitute the current plugin repository. If MCP context tools are unavailable,
read available project files directly for a bounded review and report missing context
or persistence. Do not invent tool results, approval hashes or saved records. Review
does not require installing the plugin merely to discuss supplied code.

Trace the target's callers/consumers, imports, state owners, data sources, error
paths and tests using repository search and installed language tools. Check aliases,
re-exports, dynamic imports and framework conventions; label unresolved relationships.
Use relevant installed runtime behavior, not another framework's habits. Do not
equate folder names with enforced architecture or hook/mock counts with defects.

Check `inspection.needsRefresh` and changed files. Refresh affected facts before
relying on stale context; a source change is not authorization to rewrite the target
design. Classify differences as approved evolution, pending migration or deviation.
Preserve unrelated user changes. Analysis may expand beyond the target; edits may
not expand without existing authorization or a user decision.

## Evidence and authority

Distinguish explicit requirements/team constraints, observed patterns, experiences,
technical guidance, preferences, hypotheses and measured results. A repeated AI
pattern is not automatically a team rule. Search results are reading priorities,
not mandatory prescriptions; retain contradictory sources and explain applicability.

Use user material first when relevant, retaining its context, version, tradeoffs,
counterexamples, code examples and source. Missing user knowledge does not block
work: use model knowledge and focused official research for uncertain/version-sensitive
claims. Never cite an unread source or report an unmeasured performance improvement.
Honor current task constraints; propose changes to explicit team rules rather than
silently breaking them. Security and accessibility obligations still apply.

For a material finding explain: situation and evidence → failure condition and
impact → viable alternatives (including no change) → recommendation and cost →
verification. Show only alternatives that could actually work. Scale explanation
to the decision; do not manufacture a lengthy report for a small correction.

Ask one unresolved material question at a time. Discover technical facts yourself;
ask about business priorities, unclear domain rules and accepted costs. Review-only
requests produce findings/proposals without code edits. A request to fix authorizes
in-scope implementation and verification, not a new dependency migration or broader
product redesign. Do not repeatedly seek approval for already authorized work.

## Project memory

Use `save_project_record` with kind `decisions` for an actual choice, using the hash
from `get_project_record` when updating (null when new). Record situation, evidence,
alternatives, decision-maker, reason, scope, costs, outcome and reconsideration
conditions. Keep a chosen option distinct from a verified effect. Preserve the
previous reasoning when superseding it. Do not save credentials or unrelated data.

User choices stay project-local. Ask before promoting them to shared knowledge.
Model findings can be candidates, never silently promoted to approved universal
rules. Raw notes or links are sufficient input: normalize them, retain provenance,
and ask only for missing context that changes applicability.

A review alone does not create a user decision or authorize incidental context writes.
Return proposed findings in the response; record a choice when the user actually makes
one under the agreed project-memory policy. An explicit read-only/no-write request
also excludes memory and inspection writes. In that case describe proposed updates.

## Test the contract

Read `testing-and-transition.md` for setup, baseline, migration and completion.
Explain required cases in terms of preconditions, events, expected/forbidden
outcomes, not internal function-call counts. Mock external boundaries when needed;
do not mock away the module behavior you claim to verify. If global mocks conceal
domain behavior, examine coupling and propose the minimum useful boundary change.

For performance concerns, distinguish structural risk from measured cost. Establish
the actual interaction and measurement method before promising improvement.
For technology replacement, compare local fixes, migration cost and actual failure
causes. SOLID, naming and clean-code principles guide responsibility and readability;
they do not mandate extra layers, factories or abstractions.

## Product and UI boundaries

FS covers frontend, API contracts and framework-local server code. Describe separate
backend/database needs as follow-up work; do not silently build/deploy/migrate them.
Domain discussion precedes technology selection; DDD layers are optional.

Inspect the project's design system before translating a screenshot or adding UI.
Record project-wide token, composition, state, accessibility and CSS-tool decisions
in the revision workflow. Use small cohesive primitives and composition (shadcn-style
composition can be a reference), not mandatory atomic folder levels. A screenshot
does not specify behavior, responsive rules or error states: resolve material gaps.

Whole-project refactoring does not install Storybook by default; retain existing
checks. New shared UI/design-system work includes Storybook setup and relevant stories
and interaction checks by default, using versions compatible with the actual project.
Ordinary screens still require relevant browser/behavior verification. Do not claim
visual verification if no browser or preview was available. OpenDesign remains
optional; follow `open-design.md` only when selected.
