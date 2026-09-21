# Approved rules and verification

Rule definitions carry an ID/version, statement, layer, obligation, applicability,
exclusions, provenance, verification method, pass/fail/excluded examples and limits.
`verified` means the cited examples were exercised, not that all code is correct.

`save_revision` accepts `policy` (version 1): rules are full pinned definitions;
checks map IDs to exact package script IDs/commands and rule IDs; reviews map IDs
to rule IDs and descriptions; guards pin hashes of checker/config/test assets;
exceptions record rule, exact files, reason/risk, verification, resolution step and
reconsideration condition. Omitting policy preserves it. An explicit replacement,
including removal of requirements, invalidates approval. Legacy text-only revisions
remain readable but are labeled legacy and cannot use `fs checks --required`.

Use scripts actually declared by the project. Existing check/test/lint/build names
are discovered; policy may explicitly name another non-watch verification script.
Preserve compatible tools; don't build a parser where the installed framework,
ESLint or TypeScript already provides the check. Test aliases, re-exports and actual
dynamic import forms where relevant. Unsupported cases stay documented, not passed.

Initial enforcement setup is a preparation step: establish tools/checkers, validate
normal/invalid examples, calculate guard hashes, then approve the concrete policy.
Do not pin mutable product source as a verification guard. A guard asset change
requires reviewing and updating the policy; ordinary product edits do not.

Migration exceptions do not suppress runner failures. Configure a narrowly scoped
baseline in the checker (with regression coverage), pin that configuration, and
retain the exception's resolution step. No new violations may enter the baseline.
Resolution needs current review evidence and the corresponding checks; final work
cannot complete with unresolved exceptions. An exception requiring semantic review
must have a review requirement in the policy.

Execution steps support `dependsOn`, `requiredCheckIds`, `attemptId`, and `reviewIds`.
Missing step check selection defaults to all policy checks; final completion always
requires the entire policy and at least one real test/e2e result. Steps use immutable
attempt and review records. Three attempts are persisted per revision/step. Source
and revision hashes bind checks and reviews. Follow-up edits require revalidation.

`run_project_checks(required: true)` and `fs checks --required` run automated policy
checks; success alone is not full semantic completion. `save_execution` verifies
all required evidence. Logs are stored with check records; default responses omit
passing output and return at most the last 2000 characters of a failure. Use
`get_check_record` with capability/offset to page through the stored log.

These are mistake-prevention and audit tools, not a security boundary against a
writer who can edit local records. Host-model review evidence is labeled as such.

## Connect recurring failures to checks

Start with the project's existing debug/evidence records. Confirm whether repeated
failures violate the same agreed guarantee; similar symptoms or repeated AI advice
alone do not establish a rule. Record the cases, cause, applicability, counterexample
and cost of prevention. If no real recurrence is available, label the example synthetic.

Reuse a check that already covers the guarantee. Otherwise prefer the existing
type system, framework, lint rule or behavior test before a custom checker. Keep
judgment-dependent guidance as a scoped review with a failure example; do not force
an unreliable mechanical rule. Leave one-off or unconfirmed findings as evidence.

Within authorized work, prove the normal example passes and a deliberately invalid
variant fails for the intended diagnostic or assertion. Run mutations in an isolated
fixture and restore it; an unrelated setup failure is not detection. Keep those
examples runnable and connect their paths/results to the existing rule and evidence.

For project adoption, link the rule ID to the exact existing script/command in the
revision policy and protect the relevant test/config assets. Review new obligations
or changed guards under the existing approval workflow; honor approval already given
for the concrete change. A regression test inside an already approved contract does
not itself require a new rule or policy. Shared publication still requires the
separate knowledge proposal/approval flow and never silently updates project policy.

Verify the connection through `run_project_checks` and `save_execution`: the invalid
variant must fail its check and cannot complete; restored code needs current passing
checks and any required review. Record what was linked or deferred and why. Local
completion enforcement is distinct from required CI/merge settings; do not claim
remote enforcement without checking it. No new command, automatic promotion or
universal ban follows from this procedure.
