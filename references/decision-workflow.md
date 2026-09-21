# Evidence-led frontend decisions

Read this for revision, review, implementation and verification. FS's goal is to
reduce defects, risk and maintenance cost. Keeping suitable code is a valid result.
The current version centers on project understanding, evidence-led decisions/debugging,
and accumulated knowledge. Make layer responsibilities, state ownership, dependency
direction and failure handling explainable; avoid generating uncontrolled abstractions.
Broad browser matrices, sophisticated visual regression and performance dashboards
are outside the current core. Do not build an external verification service or MCP
integration speculatively. Existing project tools and focused checks remain useful.
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

## Report evidence and limits

In the final answer, connect each material conclusion to its evidence and the
limits of that evidence. Scale the report to the task; a few sentences can suffice.

- **Conclusion:** state the finding or achieved change. Distinguish a confirmed
  defect, a conditional risk, a hypothesis and a proposal where that affects the decision.
- **Evidence:** cite the relevant inspected file/location, source or observed result.
  For checks, name what ran, its actual result and the behavior it covers; link a
  check ID or artifact when one exists. Attribute supplied logs or prior results
  to their source rather than claiming to have executed them yourself.
- **Limits:** identify relevant unexecuted, failed or stale checks and what they
  leave unresolved. Separate code completion from verified behavior; unit results
  alone do not establish UI or persistence behavior. Mention a next check only when
  needed to resolve the conclusion, not as a generic list of possible risks.

Use these as content guidance, not mandatory headings or a report for every minor
observation. Do not invent confidence percentages, measurements, check IDs or saved
records. This reporting guidance does not add checks, approvals or completion gates,
and does not authorize writes during review-only work.

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

## Learn from real-project outcomes

When the user chooses to evaluate FS on a real project, start with one authorized
feature or fix in the designated repository. Establish the expected behavior and
relevant baseline using existing checks and [feature verification notes](testing-and-transition.md#reusable-feature-verification-notes).
If no target is designated or inferable from the task, report that the trial has
not started; plugin fixtures and synthetic evaluations are not consumer-project outcomes.

During authorized work, extend the relevant `evidence` record with `save_project_record`
and its current hash (null for a new record). Link existing artifacts rather than
creating a second report. Keep only what helps assess this task:

- Task/contract, source revision or hashes, environment and observed checks/results.
- Confirmed defects, rejected suggestions and unresolved findings, distinguished by
  evidence; record user corrections or rework with their reasons. A changed requirement
  is not automatically an AI error, and an unchallenged suggestion is not proven correct.
- Actual follow-up runs or observation period and any recurrence. Without follow-up,
  recurrence is unknown. Attribute user-reported outcomes; do not invent elapsed time,
  saved effort, success rates or a reliability score from sparse or unlike tasks.

Use comparable outcomes to recommend keeping, narrowing or expanding the scope of
similar future tasks, stating the evidence's limits. Record an actual scope choice
in `decisions` only when made by the user; preserve its reason and reconsideration
conditions. Successful trials do not change existing authorization, approvals,
required checks or completion criteria. Review-only work proposes record updates.
This is an optional project-local learning procedure, not a new gate for every task
or an automatic promotion to shared rules.

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

Retain existing project checks. Storybook is optional even for new shared UI work;
add it only when requested or justified by an agreed verification need. Select the
smallest sufficient setup rather than installing a full UI test platform. Inspect
relevant rendered behavior when available, and identify required human checks when
it is not. Missing browser evidence is not a pass. OpenDesign remains optional;
follow `open-design.md` only when selected.

For symptoms and root-cause work, follow `debugging.md`. Reuse evidence records for
project-local investigations and confirm promotion before enriching shared knowledge.
