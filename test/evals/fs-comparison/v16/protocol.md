# v16 frozen decision replay protocol

Objective: test reuse of already stated intent and recognition of legitimate exceptions,
not implementation from the same finished plan. Never change the rubric to make FS win.

Arms: ordinary AI with the same raw prior decisions and the same 71 published references;
FS receives those same inputs plus the actual PR-feedback procedure and production search.
No-information ordinary AI is omitted from this round: missing private knowledge would
confound the procedure comparison. This is a bounded procedure/search diagnostic, not
execution of the full MCP plan/sync workflow or a claim about all FS routing.

Eight authored synthetic cases cover React state lifetime, request idempotency, nested
object ownership, unresolved Vue draft lifetime, error propagation and scoped styling
preferences. They are not unseen real PRs and were written by the implementing assistant.
Cases and expected dispositions/actions remain outside each model's sandbox. Both arms
receive identical task/source/decision/corpus bytes. Each run uses a fresh process/thread,
immutable input inventory and denies rubric, sibling run and personal configuration reads.
Question output is recorded instead of waiting for a person; do not claim live interaction.

Model: gpt-6-sol, medium; 180 seconds per call; 2 concurrent; one initial repeat (16 calls).
Further independent repeats must preserve failed observations and use the same frozen inputs.
Stop to reassess on a ceiling (both arms solve the cases), ambiguous owner intent/rubric,
or unresolved environment failures. Do not add secret requirements or disadvantage the raw arm.

## Metrics (manual semantic adjudication required)

- Repeated explanation proxy: on the 3 eligible unchanged-decision cases, count questions
  whose answer is already explicit and still applicable. Questions concerning a real gap
  do not count. Report raw/FS counts and difference. No questions does not mean correct.
- Decision reuse accuracy: correctly use the current scoped decision with supporting
  evidence / 3 eligible cases. Listing an ID or matching action enum alone is insufficient.
- Exception discrimination: correctly avoid overapplying the old decision on the 2 changed
  condition cases / 2. Explain the operative condition and preserve the current contract.
- Guardrails: reject the false deep-freeze claim; ask the material unresolved Vue lifetime
  question; qualify the error-flow candidate; keep styling preference project-scoped.
- Cost: total tokens, uncached input+output, completion, missing usage; failed runs remain.

Exact quote checks establish provenance only. Final human/host adjudication must identify
its reviewer and limits; a self-review is not blind independent agreement. Mark ambiguous
cases unverified and never turn excluded/missing outcomes into success. Denominators and
case eligibility are fixed before model calls. Do not combine these into a composite score.

For the next real-project study: freeze earlier PR code/comments/confirmed decisions at
a time cutoff; hide later PR comments/fixes from both arms; obtain owner-reviewed expected
conditions before scoring. Record live repetitions and corrections, not estimated minutes
saved. New requirements are not previous-answer failures. Keep private discussions local.
