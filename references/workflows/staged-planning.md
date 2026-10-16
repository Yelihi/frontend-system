# Planning feedback, then test-first implementation

For new feature/refactor plans, use these stages in order. Resume at the first
unfinished stage; reuse actual feedback whose scope and artifacts have not changed.
A stage preview is not approval. Ask through user-decisions.md and pause the task
until an actual answer. Do not batch all checkpoints into one final approval or
infer agreement from silence, tool permissions or a generic earlier implementation
request. Explicit feedback already covering the presented version need not be repeated.

## Planning stages

1. **Domain and initial design.** Inspect the relevant project and discuss entities,
   intent, invariants, ownership, state transitions and exclusions. Iterate on material
   questions, then show the initial design as domain-flow issues. Each issue covers
   one initiating event through its observable success/error outcomes. Confirm this
   initial scope before expanding the test contract.
2. **Test-case design.** Show a compact table: case ID, issue, Given, When, Then,
   verification method (unit/integration/E2E/manual), and planned test/fixture paths.
   Include meaningful failures, forbidden side effects and relevant races/ownership;
   do not pad the list with generic tests. Explain limits of mocks and manual cases.
   Receive feedback and confirm the case set. Save it in issues[].testCases; file
   paths are planned artifacts, not a claim that tests exist. Include those paths in
   issue.files. No product or test code is written during planning.
3. **Page/domain-flow visualization.** Use the agreed domain and cases to generate
   proposed HTML via fs-plan-visualize, including navigation, cross-page state/cache
   effects, and scenario-to-case/issue connections. Show the actual HTML and receive
   feedback before finalizing the plan. Do not substitute an observed-code diagram
   or synthetic example. Missing rendering capability leaves this stage unresolved.
4. **Reference-driven design, when supplied.** If the user provides a design image
   or page and direction, inspect it and create/embed a proposed page mockup through
   available image or prototype/screenshot tools. Receive visual feedback before
   committing to finer component/props/interface/store/event/framework-specific
   contracts. Then refine the HTML and receive feedback on that detailed design.
   The overall staged-design request authorizes this refinement after mockup feedback;
   no redundant request to start refinement is needed. Unknown intent still requires
   a question. Without design references, do not require image generation: use the
   agreed project conventions and flow visualization from stage 3.
5. **Finalize and hand off.** Reconcile the agreed domain, cases and visualization.
   A later change reopens only affected earlier decisions/cases; never overwrite their
   expected outcomes merely to match the latest drawing. Save through save_revision:
   human plan.md and generated plan.ai.md refer to the same revision.json contract;
   HTML is linked through pinned analysisRefs. Record stage confirmations as existing
   evidence.decisions with real quoted answers, artifact/version scope and reconsiderWhen.
   Keep unfinished material decisions open. Ask for final plan confirmation if it has
   not already been given for this exact version. This permits test-first work only
   when the user requests implementation; it is not test-code feedback.

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
  completed issues on resume. Briefly state the current phase (tests → feedback →
  implementation → checks/PR). Update the UI when that phase or issue changes, not
  after every tool call. A test-feedback wait is not completion; mark an issue done
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
are already authorized, nor bypass unresolved decisions or test-code feedback.
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
2. **Show test code and wait.** Present case-to-file coverage, meaningful assertions,
   exact commands, actual red/green/setup-blocked results, mocks and manual limits.
   Save an in-progress execution with testReview.status=pending, revisionHash set to
   the current approved revision, and the artifact hashes.
   Ask for feedback using the native selection UI and pause all task work. After the
   actual answer, revise tests as requested, then record testReview.status=approved,
   confirmation quoting the answer, and hashes of all reviewed test/fixture/instruction
   files. Preserve execution/attempt IDs. Changed test artifacts need renewed feedback;
   source hashes are provenance, not proof the human reviewed their semantics.
3. **Implement, verify, deliver.** Only after test-code feedback, implement the domain
   flow within its approved contract. Preserve agreed tests; changing their expectations
   reopens affected case decisions and the test-code checkpoint. Finish required checks,
   semantic reviews and issue-level PR readiness. Expected red tests in stage 1 never
   authorize a PR with failed checks. Follow the normal one-flow/branch/PR procedure.

The host owns stage transitions and actual questions; FS does not intercept shell
edits. For issues with testCases, execution completion rejects missing/unconfirmed or
changed test-review artifacts. Legacy plans without testCases remain readable; bring
an adopted legacy plan through case review before claiming this staged workflow.
