# v10: multiple-project planning evaluation

Frozen before the first model call. Six separate authored TypeScript frontends exercise
native control semantics/themes, document autosave/conflicts, exact pricing, SSR cart
scope/hydration, mutation queues and reentrant extension lifecycles. Each has five source
modules and manifests. This is domain/architecture diversity, not framework coverage or
a claim to simulate a large production repository. No generated application is executed.

Development cases: design-system, draft-editor, pricing-console. Holdout cases:
ssr-storefront, offline-uploader, plugin-shell. Do not inspect holdout model outputs until
candidate changes based on development outputs are frozen. These fixtures are authored
by the coordinator, not externally blind benchmarks. Reused cases become regressions.

Three conditions: ordinary AI, same corpus as raw notes, FS with reviewed/synced notes.
All use the same code/request, gpt-6-sol medium, 600 seconds per turn, at most two
concurrent calls. All six conditional notes are available to raw and FS; unrelated
knowledge must not turn into mandatory changes. Notes are synthetic and authored;
this does not test automatic free-text metadata generation or all existing FS knowledge.

Each journey starts in a fresh isolated code copy/thread. Questions first; the
coordinator maps only actually asked questions to frozen atomic answer-bank entries.
Explain the mapping. A compound question may receive several exact entries, but a
generic unknown must identify the specific unanswered subquestion, never revoke known
answers. No hidden rubric, other arms, owner bank or previous results in the workspace.
Second turn resumes only that thread and writes an unapproved plan. Do not approve,
implement, install, run product code or nested models. Preserve all failures and costs.

Primary outcomes, reported separately: (1) material choice discovery, (2) contradictions
with actually supplied answers, (3) unapproved observable changes, (4) actionable
counterexamples and acceptance outcomes, (5) irrelevant knowledge overapplication,
(6) stored FS obligations matching the readable plan. Counts require exact artifact
citations and adjudication; no points for length, abstraction count or question count.
A missing answer is not permission to choose. Code defects may be corrected but product
semantics need support. Multiple correct architectures remain acceptable.

Record total/uncached/output tokens, elapsed time, input errors, source/runtime hashes,
thread IDs, knowledge lookup/body/adoption trace, and unapproved status. Cost includes
failed/recovered calls; missing usage is unknown, never zero. Provider cache is not
resettable; token differences are observations, not dollar prices or pure causal effects.

A candidate must repair an observed failure without weakening freshness, approval,
source review or validation. Re-run affected fresh pairs, then the frozen holdout cohort.
A narrow observed advantage needs confirmation on another fresh run of the relevant
pair; do not retry unchanged candidates until a favorable sample appears. Report
quality/cost tradeoffs and cases where raw AI matches/exceeds FS. Do not redefine the
rubric or make the baseline deliberately weak to obtain superiority. If no repeatable
advantage appears, retain the measured limitation rather than claim a win. Each next
loop needs a concrete new failure hypothesis, a change and a separately frozen runtime.

## Disclosed supplements after the initial cohorts

The user's structural-intent request is recorded in results/intent-review-supplement.md;
it adds qualitative observations, not retrospective points. A class or pattern is not
a preferred answer. Judge responsibilities against callers and actual change pressure.

The original shared prompt is a **guided** comparator. `--prompt-mode natural` keeps
the same source access, owner-answer process and permission boundaries but supplies a
short task instead of the detailed design checklist to every arm. Questions may omit
evidence/options arrays; supplied citations are still audited. This measures bundled
plugin guidance under a short request, not a pure routing effect. Keep guided results.
The first natural comparison's cases and hypothesis were selected before its calls in
results/natural-request-hypothesis.md. They are reused regressions, not new holdouts.

Future answer banks separate previously bundled lifecycle clauses and explicitly state
that an unanswered question does not settle other unasked choices. Earlier cohorts keep
their actual bank and any documented pre-delivery amendment. Never retroactively replace
an answer in a completed journey. These oracle corrections limit causal comparisons.
