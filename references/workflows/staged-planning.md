# Design feedback, plan review, then continuous implementation

## Entry paths and prospective knowledge

First follow [project visualization lifecycle](project-visualization-lifecycle.md) for baseline readiness.
Then identify the starting state; do not treat every project as a refactor.

- **New project:** Record the intended users, first valuable domain outcome, core
  entities and invariants, data ownership and sensitivity, permissions, external
  integrations, target runtime/deployment constraints and available verification
  environment. Ask only for material unanswered choices, one native question at a
  time. Propose framework, architecture and infrastructure from these constraints,
  relevant learned knowledge and current authoritative documentation when versions
  matter. Keep UI theme and nonessential future features open. Do not claim an empty
  repository has observed architecture. In an empty repository, save the user's
  confirmed answers as a small root `project-brief.md` planning artifact. Inspect
  that actual file with fs-project and pass it explicitly in get_work_context.files
  (it yields a path fact, not JS/TS syntax) and requirements. Cite its exact text
  for established domain choices; mark implementation paths as planned. This makes
  a bound plan possible before framework installation without inventing code
  citations. If even the brief cannot be saved, report an unbound draft rather than
  claiming an approved FS execution plan.
- **Existing project without an FS refactor:** Inspect the current boundaries and
  conventions, then follow the affected caller/state/error paths. Preserve unrelated
  behavior and avoid a whole-project refactor. An observed convention is evidence,
  not permission to repeat a risky pattern; resolve a conflict within this feature's
  scope through a plan decision.
- **Existing project with an FS refactor:** Reuse current project facts, approved
  decisions and shared boundaries under their recorded conditions. Inspect changed
  dependencies and the new domain flow; do not rescan unchanged code by default.

Before finalizing each domain-flow issue, list only its behavior-bearing planned
boundaries (functions, components, services and state owners). For each, write the
caller/event, inputs and result, state/effect ownership, normal/error/overlap paths
and proposed files. Search learned metadata with those descriptions and concrete
failure symptoms; inspect relevant semantic lenses and exclusions even when no
existing-code trigger fires. Use get_work_context.routing.semanticLenses for existing
code; for an empty project, page discover_knowledge_triggers by relevant domains and
search the planned operation with search_learned_knowledge. Read selected bodies,
compare alternatives and record
apply/keep/not-applicable or missing context. Existing code citations support
observations; proposed names and calls are hypotheses, not static trigger evidence.
Bind the chosen instruction and its verification to issue.implementationTargets and
the resolved decision. If nothing relevant is published, state the searched scope and
reason. Prefer a few precise target contracts over a rule for every statement.
After implementation, route the newly written code once to catch previously unseen
static or semantic candidates; that second pass can reveal a missed plan choice.

For new feature/refactor plans, use these stages in order. Resume at the first
unfinished stage; reuse actual feedback whose scope and artifacts have not changed.
The user reviews the domain/visual design, the final plan including test intent,
and the implemented diff. Ask through user-decisions.md for material choices, not
routine test-code approval in a version 3 execution. Do not infer a decision from
silence or tool permissions. Version 2 plans retain their old test-review checkpoint.

## Shared design and screen states

Use [design-flow-contract](design-flow-contract.md) throughout the stages. A short request
is enough to start an iterative draft. With no image, create structural HTML wireframes
and discuss domain behavior and loading/error/empty states there; do not skip visual
planning. For existing pages use actual captures of the selected baseline. Save scenarios,
contracts, scoped learned judgments and test intent once, then derive HTML and bind the
plan to those IDs. Later user requirements are normal design input, not only explicit
review comments. Reopen only affected choices and retain unchanged answers.

## Planning stages

1. **Domain and initial design.** Inspect the relevant project and discuss entities,
   intent, invariants, ownership, state transitions and exclusions. Iterate on material
   questions, then show the initial design as domain-flow issues. Each issue covers
   one initiating event through its observable success/error outcomes. Generate the
   proposed page/domain-flow HTML, including cross-page state/cache effects, and
   discuss the design using that view. Do not substitute an observed-code diagram
   or synthetic example for the target project.
2. **Test-case design within the plan.** Show a compact table: case ID, issue, Given, When, Then,
   verification method (unit/integration/E2E/manual), and planned test/fixture paths.
   Include meaningful failures, forbidden side effects and relevant races/ownership;
   do not pad the list with generic tests. Explain limits of mocks and manual cases.
   Confirm the case set with the final plan. Save it in issues[].testCases and link
   a pinned flow/scenario where one exists. File paths are planned artifacts, not
   tests claimed to exist; include those paths in issue.files. No product/test code
   is written during planning.
3. **Reference-driven design, when supplied.** If the user provides a design image
   or page and direction, inspect it and create/embed a proposed page mockup through
   available image or prototype/screenshot tools. Receive visual feedback before
   committing to finer component/props/interface/store/event/framework-specific
   contracts. Then refine the HTML and receive feedback on that detailed design.
   The overall staged-design request authorizes this refinement after mockup feedback;
   no redundant request to start refinement is needed. Unknown intent still requires
   a question. Without design references, do not require image generation: use the
   agreed project conventions and flow visualization from stage 1.
4. **Finalize and hand off.** Reconcile the agreed domain, cases and visualization.
   A later change reopens only affected earlier decisions/cases; never overwrite their
   expected outcomes merely to match the latest drawing. Save through save_revision:
   human plan.md and generated plan.ai.md refer to the same revision.json contract;
   HTML is linked through pinned analysisRefs. Record stage confirmations as existing
   evidence.decisions with real quoted answers, artifact/version scope and reconsiderWhen.
   Keep unfinished material decisions open. Ask for final plan confirmation if it has
   not already been given for this exact version. This approves test intent and the
   implementation contract, not an unseen test result or later PR diff.

A later “implement this plan” request invokes fs-work even without the command name.
Resolve the current plan ID/revision; ask only if more than one plan could be meant.
An explicit fs-work request also resumes the current saved phase, not an assumed fresh
plan. Planning-only requests stop at the requested planning stage.

## Native plan presentation

At planning handoff and before fs-work starts or resumes (including a plain-language
implementation request), present the selected plan in the conversation, not only a
file link. Reuse the current contract and execution context; fetch only missing or
changed sections. Identify planId/revision, intended outcome, ordered domain-flow
issues, exclusions, required checks and the next feedback checkpoint. Link the human
plan and HTML for detail; do not load HTML or regenerate the design for this preview.

- In Codex Default mode, when `update_plan` is exposed and permitted, call it before
  test/product edits with issue IDs and domain-outcome titles in dependency order.
  Use the actual tool schema. Keep at most one issue in progress; preserve known
  completed issues on resume. Briefly state the current phase (tests → implementation
  → checks → implementation feedback/PR). Update the UI when that phase or issue changes, not
  after every tool call. A feedback wait is not completion; mark an issue done
  only after its required verification and authorized delivery. This checklist is
  a view of the saved contract, not a new plan or an approval record.
- In Codex Plan mode, follow the host's final-plan protocol: a decision-complete
  plan uses one `<proposed_plan>` block with tags on their own lines, without a code
  fence. Include the substantive plan, not just a path. Do not call `update_plan`,
  start work, or persist changes forbidden by the host's read-only mode. If the
  requested draft is not saved yet, say so; persist it only in a permitted mode.
- If the native plan tool is unavailable, show the same concise preview in Markdown
  and disclose that it is not the native plan UI. Never simulate a successful tool
  call or emit host events through MCP. If the user specifically requires the Plan
  mode review/implementation chooser, direct them to `/plan` and end before edits;
  FS cannot switch the host mode itself. Do not use proposed-plan tags as a Default
  mode workaround. Other hosts use their available native plan mechanism.

Showing the plan does not add another approval when the exact plan and execution
are already authorized, nor bypass unresolved decisions or the final user review.
If scope changes, revise the canonical plan through fs-plan before updating its UI.

## Work stages (per domain-flow issue)

1. **Write the tests first.** Begin the approved issue/attempt and record baseline
   checks. Implement ALL agreed automated cases for this issue, retaining adequate
   existing tests; add fixtures and reproducible instructions for manual cases.
   Do not implement future issues' tests or product behavior yet. Missing imports or
   test infrastructure are setup blockers, not proof of the intended failing assertion.
   New behavior tests may fail before implementation; regression/characterization
   tests for unchanged behavior must pass against the old implementation. Do not
   create fake passing product stubs, skip cases or weaken assertions to make this
   checkpoint green. If a real product seam/API must change to make tests executable,
   explain the dependency and obtain a scoped decision before changing product code.
2. **Implement and verify continuously.** Implement the domain flow within its approved
   contract, retaining agreed test outcomes. Changing an expected outcome reopens the
   affected plan decision. Run required checks and semantic reviews. For version 3,
   supply caseEvidence for every planned case: a current passing Node test name in a
   check log, or a current semantic review with an explicit testCaseId. Unsupported
   runner output stays unverified until reviewed; a green command alone does not prove
   each case. The completion gate accepts the verified issue without a test-code pause.
3. **Show the completed change and receive feedback.** Run `fs work-review <project>
   --base <target> --plan <id> --issue <id>` to show files, planned knowledge applications,
   recorded review findings, cases and evidence in the CLI. Add `--diff` when the patch
   is needed. Present the meaningful assertions, actual test/browser results
   and untested limits. Apply feedback within scope and rerun invalidated checks.
   Record the user's actual answer using record_implementation_feedback on the current
   source/execution hash. PR readiness rejects a missing or stale answer. User feedback
   on the implementation does not replace automated checks or semantic reviews.
   Follow the normal one-flow/branch/PR procedure after the review.

The host owns stage transitions and actual questions; FS does not intercept shell
edits. Version 2 plans with testCases still require unchanged test-review artifacts;
migration to version 3 creates a new revision and requires a new approval. Legacy
plans without testCases remain readable; add agreed cases before claiming this workflow.
