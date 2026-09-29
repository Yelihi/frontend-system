# Main context and request plans

Use this procedure from fs-plan/work. The host supplies semantic analysis; the tools
collect facts, bind contracts and enforce evidence. No additional model is launched.

## Current project context

`get_project_snapshot` reads the local `main` commit's tracked tree and manifests,
without checkout or fetching remotes. Pass the established main branch as `baseRef`
when it has another name; never substitute the working branch. Page all relevant
files using `expectedCommit`, then read their contents with `read_project_source`.
Working changes are returned separately. A manifest is not an installed environment,
a file name is not a domain interpretation, and a test file is not a passing result.

Before an authorized refresh, call `record_project_refresh(status: pending)` with
the inspected commit. Read existing context through `get_project_document`, selected
area evidence and actual runner/CI reports. Record domain and event IDs, callers,
layers, state/fetching/errors, style rules and test summaries with code/evidence paths.
Keep facts, interpretations and unresolved questions distinct. Link full test titles,
environment, source revision, skipped/retried cases and original reports when available;
otherwise mark them unverified. Do not infer test results from source strings.

Save with `save_project_context`, passing `expectedCommit` and `documentHash` from
`get_project_snapshot` as `expectedHash` (null for a new project.md). The tool writes
`.frontend-system/project.md`; prior versions go to `project-history/` and existing
`init.md` stays intact. Project.md takes precedence, init.md is a fallback. A missing
main or changed commit is an error, not permission to save feature-branch facts.
An uncommitted repository can record initial constraints with a null commit, clearly
marked unversioned. If generation fails, record `failed` and the reason; retain the
last document. A successful save clears refresh state.

Read status at the start of plan/work: `missing`, `unversioned`, `current`, `pending`,
`stale` or `failed`. Current means the analyzed main tree matches, not that tests
passed or the remote is up to date. Generated `.frontend-system` documents/evidence
are excluded from tree comparison; its config.json is included. Product/test/config
changes make it stale. Working-branch changes belong in plan/evidence until merged.
After an authorized merge, run the same host procedure for the exact new main. Reuse
matching CI evidence rather than repeating tests. Unavailable CI is unverified.
Continuous AI invocation and document PR/bot permissions require project-specific setup;
this procedure does not create a background process or push documents automatically.

## Request plan and issue execution

Call `list_plans`. The host chooses the named/requested plan or the only relevant
candidate, and asks only when selection is materially ambiguous. Execute one plan
at a time. Pass the same `planId` to every revision, execution, attempt, check and
semantic-review call. IDs use lowercase letters, digits and hyphens. Omitted planId
addresses legacy root records; those records are preserved, never silently migrated.

Save new work with `save_revision(planId, content, policy, issues, expectedHash)`.
The readable design lives at `.frontend-system/plans/<id>/plan.md`. Its generated
issue section is edited via the `issues` input. Each issue has `id`, `title`, `contract`,
`files`, `dependsOn`, `requiredCheckIds` and `acceptance`. Put scope/exclusions,
interfaces, failure cases, test commands and important unanswered questions in the
contract/design; resolve material questions before approval. One issue is enough
for a small change. Every policy check must map to an issue; unknown dependencies,
cycles and unknown checks are rejected. No remote issue is created.

`approve_revision` binds the plan ID, revision version, design, policy and issues.
Use existing user approval for the concrete scope. Changes and manual plan edits
invalidate approval. All plan records are isolated; identical text in another plan
cannot reuse approval/checks/attempts. The legacy approval model remains readable.

`save_execution` uses the issue IDs as step IDs and preserves their titles, file
scope, dependencies and required checks. Status/check IDs/remaining work are progress,
not design changes; `progress.md` renders them separately. Changed contracts go through
save_revision, not a rewritten execution. Prerequisites must finish before dependent
steps run; attempt budgets and stale-source checks apply within each plan.

## When to run scripts

- Initial main analysis: use existing lint and unit/integration results for that
  exact main checkout, or matching CI reports. Do not run feature code and call it
  main verification. Missing tools stay unverified; record gaps in the plan.
- Plan finish: save validates issue dependency/check mappings. Review domain choices
  semantically. Do not run a whole product suite merely to approve Markdown.
- Work baseline: `run_project_checks(stage: baseline)` selects existing lightweight
  lint/typecheck and unit/integration scripts (falling back to test when neither
  exists in that package); inspect actual script definitions first. Use explicit `capabilities` with
  `purpose: baseline` when aggregate scripts would duplicate work or require a narrower
  scope. Passing a script name does not prove every case ran.
- Issue: `stage: issue` with `planId` and `stepId` (or its `attemptId`) selects the
  approved issue's checks. Save the host's semantic review against that attempt.
- Delivery: `stage: delivery` (equivalent scope to `required: true`) runs every
  approved policy script, including required browser/build checks. Issue-only results
  cannot complete a plan with missing final checks. Include required build/E2E in the
  policy when applicable, rather than silently expanding it at execution time.
- Measurement review: run only the scenario/tools needed for the requested contract;
  see verification-tools.md. Approval of an improvement routes back through plan/work.

Checks run technical scripts first, then boundary/custom checks, behavior tests,
browser/Storybook checks and build. Within a category, names sort deterministically.
For an aggregate command, select that command or its children in policy/capabilities,
not both; FS does not parse arbitrary shell scripts to guess coverage. A full check
attempt and semantic evidence still need current source and approval at completion.
