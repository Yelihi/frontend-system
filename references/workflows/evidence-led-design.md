# Evidence-led design: project → knowledge → choice → contract

Use the current host model. No nested model, universal architecture or automatic knowledge adoption.
The first supported design pilot is request/authentication/error boundaries.

## Inspect and explain

1. Read `get_project_snapshot` and page the full baseline inventory. Batch related source with `read_project_source(path:[paths])`: 1–100 requested files; each page reads at most 40 and returns unread nextPaths. At most 24,000 content characters across windows, with unused space from short files redistributed to longer files. Each file retains its full hash, totalCharacters and nextOffset; continue truncated files individually. String path preserves the single-file response. For syntax inspection use `inspect_code_knowledge` with `snapshot: {baseRef, expectedCommit}`; without snapshot it reads working code. Never mix the two as main facts.
2. Inspect bounded batches (up to 40 files, 512 KB per file). Follow imports/callers and existing clients. Unsupported syntax, dynamic imports and unresolved re-exports remain limitations. No AST output is a complete domain model.
3. Prefer a confined JSON draft `{analysis}` for large context saves: call `save_project_context` with draftFile instead of inline analysis. Read its payloadSchema first; on a validation error patch the rejected fields instead of resending every statement. Keep expectedCommit/expectedHash/baseRef in the tool arguments, not the draft. Save `save_project_context` with expectedCommit=snapshot.commit and expectedHash=snapshot.documentHash (null if project.md is missing, never sourceHash or a file hash), analysis.summary and analysis.evidence. Other descriptive arrays default to empty; do not restate the same claims. Evidence version 1 contains coverage `{path,status,reason}` for every baseline file and statements `{id,kind,statement,evidence}`. Kinds: fact/interpretation/user-decision/unknown. Prefer citations `{path,quote}` with a unique exact quote; the server resolves its line and the pinned main commit supplies the hash. For a repeated quote provide an inspected `line` or a longer unique quote. A wrong explicit line, stale hash or missing quote still fails. Unversioned projects require an explicit full-file hash. read_project_source returns that hash; omit its limit or use at most 12000, then nextOffset. User decisions also need confirmation containing the supplied answer. Absence claims explicitly need `absence:true`, inspected `scope:[paths]`, and `limitations:[text]`. Never use a string for a boolean/array. Coverage is host-reported, not proof of understanding. Untracked requirements are not main inventory.
4. project.md is a readable projection linked to immutable structured evidence. Its freshness, accounted coverage and semantic accuracy are different claims. Later feature code is working evidence, not a rewrite of main. Resume unfinished areas; don't reread unchanged areas without a reason.

Every code fact/interpretation in a new save_project_context call must declare reuse or reuseReason. For a traced semantic relationship, add `reuse` to its statement:

```json
{
  "dependencies": ["src/view.tsx", "src/request.ts"],
  "interpretations": [{"path":"src/view.tsx","line":12,"evidence":"request(input)","signal":"network.request-policy-boundary","interpretation":"This caller delegates through the inspected request interface"}]
}
```

This is the value of `statement.reuse`, not a complete statement. Use actual registered semantic signals and exact quotes. Declare all files needed for the claim, including callers, shared interfaces and unusual configuration dependencies. All dependencies require inspected coverage. `scope` also contributes dependencies: use exact file paths, never folder names, globs or semantic labels; omit it when citations and reuse.dependencies already cover the claim. Do not claim untraced dynamic/external dependencies are complete; leave those statements unbound and record limitations. The server pins dependency hashes, detected configuration inventory/content and the referenced semantic trigger definitions in the immutable project record. Absence claims also pin the file inventory to detect additions. No extra model analysis or mutable cache is created by reading context. If reuse is not justified, supply `reuseReason` (for example no registered signal or an unresolved dependency). The save receipt lists bound/excluded IDs; empty bound means no saved trigger reuse. Existing records without reuse bindings remain readable and require scoped review; they are not silently upgraded.

## Route and decide

After project.md is current, call `get_work_context` with request, mode and explicit code `files`. Pass specification documents separately in `requirements:[paths]`; their hashes are pinned without adding code triggers. Summary includes a contextId, all candidate metadata/locations, semantic discovery and mandatory rules. Use detail:full only for missing raw facts. Routing already executed: do not routinely call discover_knowledge_triggers and inspect_code_knowledge again. Read selected reference bodies; request additional discovery only for unresolved meaning. An omitted scope is a shortlist, not complete analysis. `not-run` differs from `no-matches`. Supply evidence-cited interpretations when known; never remove a rejected interpretation to obtain an empty checklist.

When the request only says to follow a document, routing also searches bounded names
from the inspected file scope. `scope-search` reasons are retrieval hints, never a
semantic trigger, reusable fact, or proof that a rule applies. They may be false
positives. Inspect conditions/exclusions and dismiss irrelevant candidates explicitly.
Semantic discovery is still a query shortlist: missing entries do not establish that
no registered signal fits an observed relationship. Its domains/conditions/exclusions
support targeted follow-up discovery. `planPrerequisites` and `next` identify missing
main evidence before plan storage; after saving project.md obtain a fresh contextId before binding a plan.

Read candidate conditions/exclusions and selected bodies. Batch selected bodies with `read_learned_knowledge(id:[ids])` (1–10 entries, at most 24,000 content characters); finish truncated entries at nextOffset before adoption. Inspect what code can answer first. Ask only unresolved product choices that affect scope, contracts or policy. Include keeping current code and reusing existing tools among plausible options. Reuse prior answers. An automatic recommendation is not a user answer.

Search `matchedFields` explains vocabulary overlap, including applicability and exclusion text;
it is not a confidence score or proof that a condition holds. For each consequential
recommendation, connect the specific knowledge claim to an observed code/contract fact,
then check the strongest relevant exception. An exact quotation validates its location,
not whether it supports the conclusion. Separate source claims from your interpretation;
keep unsupported intent unknown and ask only the missing decision. A current explicit
owner decision supersedes an older conflicting decision within its scope; reference age
alone does not establish authority. Preserve the superseded reason as history, not an
active instruction. If sources conflict or installation versions are unconfirmed, name
that limitation before recommending a change. Record this in the existing rationale and
citations; do not add another report or repeat the full knowledge body.

`get_work_context.projectFacts` retrieves saved statements whose citations/scope/dependencies intersect the selected files. Fresh bound interpretations feed routing automatically. `current` means the declared dependencies and configuration still match; it does not prove domain interpretation. `needs-review` explains changed/missing dependencies, knowledge updates, conflicting interpretations or missing legacy bindings. Reinspect that scope and supply fresh working interpretations; do not refresh main using branch edits. Explicit interpretations take precedence at the same path/line/signal. At most 20 matching statements and 40 combined interpretations are used; omitted counts/limit reasons require narrower batches. Changed or removed semantic trigger definitions invalidate the corresponding interpretations. Unrelated knowledge updates keep fact reuse available; routing still queries the current index and returns current candidates for review. Approved plans retain their existing linked-knowledge freshness checks. Facts persist across server restarts; contextId receipts still require renewal.

When rechecking an already-read context, pass `knownContextId` to get_work_context. The server still computes current routing and compares the project-bound receipt. Only matching candidate/discovery metadata is omitted (`reused:true`); policy, warnings and project status are always current. Changed source, configuration, requirements, query, knowledge or project document returns full metadata. This reduces repeated response text, not analysis CPU cost. Omit the parameter after context loss or when handing off to a new conversation.

## Check the decision before binding

A code citation validates where text came from, not whether a proposed design satisfies
an answer. Separate the required observable outcome from its implementation mechanism.
For material behavior changes, trace one ordinary case and a plausible counterexample
through the actual state owners and event order. Include outcomes that must remain
allowed, not only effects to suppress. Repair the mechanism when the trace contradicts
the decision; do not change the decision to fit it. Record the useful example and
expected outcome in the existing verification scope. Compare every observable change
to the controlling decision's effect, owner and event scope. A related lifecycle or
side effect is not automatically authorized; keep material uncovered changes open. No additional artifact, model,
universal pattern or unexecuted test result is required.

## Bind the plan

`save_revision` advertises compact transport fields. Read its full `payloadSchema`
with `node <plugin-root>/bundle/tool-help.mjs save_revision` before composing a new
contract. Both inline and draft-file payloads pass the same full server schema and
freshness/approval checks. No nested field becomes optional merely because tool-list
discovery omits its schema.

New named plans use contract version 2. `save_revision.evidence` contains:

- `routes`: one or more `{contextId,judgments,dismissed?}`. Each candidate needs an explicit `{referenceId,decision,rationale}` or belongs to one dismissal `{referenceIds:[ids],rationale}`. Group only genuinely shared exclusion reasons; this expands to individually checked not-applicable decisions. No candidate silently disappears. Decisions: apply/keep/not-applicable/needs-context/needs-decision. Batch larger scopes. Plan routes use working code; main analysis stays separate.
- `decisions`: `{id,question,evidence,knowledgeIds,options,selected,status,authority,confirmation,rationale,reconsiderWhen,ruleIds,issueIds}`. Evidence uses `{path,quote,line?}` referring to routed code or pinned requirements; omit line for a unique exact quote; the server supplies and checks the observed hash. IDs are lowercase (for example `request-owner`, not `D1`). Options are `{id,description,cost}`; status resolved/open/excluded; authority user/existing/model. Use model only for ordinary implementation choices, never invent a product answer. A resolved choice must exist in options. Excluded choices have no selected option or work links.

For `status:"open"` or `"excluded"`, omit `selected` (or use null). For `"resolved"`, supply a nonempty option ID. An open draft can be stored but cannot be approved. Neither omission nor empty text is a user answer.

For a changed public boundary, include a concrete caller example, the public signature, state/error ownership and allowed imports in the issue contract. Explain observed behavior with code citations; label inferred intent separately. Do not turn the sketch's internal names into requirements unless the user made them part of the contract.

Do not copy project/route/source hashes in this path. A contextId binds the document version and routing inputs; saving rechecks actual files, configs and knowledge. Receipts are process-local and bounded to 32; after server restart/eviction call get_work_context again. Saved plans persist complete evidence and survive restarts. Legacy `{input,hash,judgments}` plus projectHash remains supported. Refresh the context after saving project.md.

Policy rules require `id,title,statement,layer,obligation,verification`. Allowed layers are domain/architecture/framework/accessibility/security/testing. Omit rule `evidence`: provenance is derived from linked decisions, including their status. Open choices can be saved as drafts but still block approval. Legacy policy evidence, if provided, is strings, never citation objects. Version=1, empty conditions/exclusions/examples/limitations and validation=proposed are mechanical defaults. Required verification and user authority have no automatic defaults.

`verification` is exactly one of `existing-tool`, `custom-check`, `behavior-test`, `review`. For tests plus semantic review use `behavior-test` and link the same rule IDs in both `checks` and `reviews`; do not concatenate names into a new enum value.

Minimal policy fragment for an existing `test` script and newly planned tests (substitute actual IDs/contracts):

```json
{
  "rules": [{"id":"input-owner","title":"Preserve caller input","statement":"The request client must not mutate caller options or headers","layer":"architecture","obligation":"required","verification":"behavior-test"}],
  "checks": [{"id":"unit","script":"test","ruleIds":["input-owner"]}],
  "guards": [],
  "reviews": [{"id":"test-integrity","ruleIds":["input-owner"],"description":"Review the real test assertions and product code for frozen input coverage, and reject zero-test or weakened assertions"}]
}
```

Link input-owner and the issue to the actual decision. Each check belongs to an issue's requiredCheckIds. For existing protected tests use guardPaths plus guards instead where appropriate; never supply an empty guardPaths. Omit command/hash to pin existing values. New tests cannot be hashed before they exist; the example therefore requires a current semantic integrity review as well as an automated check. It is not a default policy or an automatic pass. `run_project_checks` takes either stage or capabilities, not both. Baseline stage excludes build; use purpose:baseline with capabilities:[exact script keys] and omit stage when an explicit baseline selection is needed.

Every policy rule and issue links to a resolved decision. Adopted knowledge links to a decision. Required rules already need automated checks or scoped semantic review. Recommendations remain scoped review guidance, not forced patterns. Open decisions and pending knowledge judgments block approval; split independent work into another plan instead of fabricating answers.

Execution issues are verification/approval checkpoints, not folders or a coding todo list. Default one jointly delivered approved change to one issue, with its internal order in the plan text. Split only for independently verifiable deliverables, a real decision checkpoint or an external prerequisite, and record why. Respect user milestones and existing approved boundaries. A larger file count alone does not justify repeated whole-project check/review/checkpoint cycles. Every required obligation and final verification remains in force.

Natural language explains intent and tradeoffs; structured policy/issues/decisions bind scope and checks. Generated plan sections are edited via save_revision, not by hand. Revision approval may reuse authorization already supplied for that concrete scope. Changing an approved contract requires an explicit revision.

Large new contracts may use `save_revision.draftFile` instead of retransmitting an
entire payload after each validation error. Write a JSON object under
`.frontend-system/drafts/<name>.json` containing only content, policy, issues, evidence,
decisionUpdates and/or evidenceRoutes. Keep projectPath, planId, expectedHash and detail
in the tool call; do not mix a file with inline payload fields. The server confines and
bounds the file, parses the same schemas and runs the same save/freshness/approval
invalidation path. It returns the consumed draft hash. Invalid input does not create a
revision. No code is executed and a draft cannot contain approval or select another
project. Patch the rejected fields locally, refresh expired contextIds when required,
and resubmit with the current revision guard. Existing small decision patches can stay
inline. The generated plan projection is the readable result; use a file copy when a
standalone copy is requested rather than writing a second interpretation.

For subsequent edits, `save_revision` may omit unchanged `content`, `policy` and `issues`; the server preserves the exact stored fields under `expectedHash` and regenerates the derived sections. New plans require content. For existing decisions with unchanged questions/options, use `decisionUpdates:[{id,changes:{status:"resolved",selected:"existing-option",confirmation:"actual supplied answer",rationale:"why this choice"}}]`. Changes may also update evidence citations, knowledgeIds, ruleIds and issueIds. For a new answer document, first include it in get_work_context.requirements. Supply `evidenceRoutes:[{contextId,judgments}]` alongside decisionUpdates to atomically replace the stored routes and patch decisions. Include all code/documents still cited by retained decisions and judge every new candidate. Context refresh by itself does not alter the plan. Omitted decision fields and all other decisions are preserved. New user selections require a new confirmation; no answer is inferred. This path revalidates stored routes/citations/knowledge and rejects stale evidence. Do not send evidence replacement together with decisionUpdates. Update affected content/policy/issues in the same save when a choice changes the contract; generated decision text alone does not revise its obligations. Use evidenceRoutes for route-only changes too. Replace full evidence for new decisions or changed questions/options. Neither partial field can accompany a full evidence replacement. Omitting evidence, decisionUpdates and evidenceRoutes preserves evidence without refreshing it. Every save invalidates approval.

`get_revision(detail:decisions)` returns choices/citations/judgments without raw inspection snapshots or duplicate plan/policy text. The work context's `candidateChanges` compares current candidates with all prior revision routes: a missing ID can mean different scope, not removed knowledge, and cannot be copied into this context's judgments. No adoption is automatic.

Save receipts include `contractDiagnostics` for missing choice/rule/knowledge links and required check protection. Correct these before attempting approval. This is not a freshness check or permission to implement; approval still rechecks actual files, documents, scripts and guards. `get_workflow_context` is sufficient for a completion-status check; do not rerun knowledge routing solely to confirm completion.

## Implement and verify

Save execution against the approved revision. Initial execution checks the analyzed working source; normal implementation edits do not invalidate approval. Begin an attempt, implement the scoped contract, run its checks and required semantic reviews, then save completion. Changed project explanation or linked knowledge needs decision review; unrelated knowledge updates do not invalidate the plan. New product source after a successful run makes that run stale.

These gates validate record links and exercised contracts. They cannot prove the model's judgment true or prevent edits outside FS. MCP unavailable or a skipped evidence path is a workflow failure, not a successful FS run. Existing legacy plans are readable and keep their previous behavior; explicit evidence upgrades them. Do not create a legacy root revision to bypass a new named plan's evidence requirements.


For a new named approved execution, `start_work` combines initialization, attempt reservation and baseline checks. It uses the existing guards and returns each saved identity. For a single issue with no remaining work, `complete_work` accepts explicit host reviews, runs final delivery checks, then records reviews and completion through those same guards. Review IDs select existing policy requirements; saved record IDs are generated by the server. Only status `complete` means completion. Neither helper supplies approval or semantic findings. Partial failures retain accepted records and explain how to resume with individual tools; multi-issue work and reuse of an already passing final check use those individual tools.

## Audit knowledge influence

For an explanation of a stored plan, `get_revision(detail:influence)` pages recorded
knowledge IDs and connects source hashes, applicability/exclusions and checks to
route judgments and linked decisions (including rule/issue IDs). Excluded candidates
remain visible; retrieval without a decision is not silently counted as adoption.
Host interpretations are labeled as such, not reconstructed AST matches. This is an
optional read view, not another mandatory record or model call.

A matching metadata hash permits showing the current metadata as the recorded
version. Changed, missing or unbound metadata is withheld rather than substituted
for historical evidence. Metadata matching alone does not validate source bodies,
code freshness or semantic truth. Consult evidenceStatus and recheck affected scope.
Pagination expectedHash pins the revision, not an independently changing knowledge
index. This audit explains recorded reasoning; only a controlled comparison can
investigate whether that knowledge changed a judgment relative to another model run.
