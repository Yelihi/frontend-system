# FS patterns and repeated-generation study — 2026-09-23

## Current knowledge boundary

Registry has Patterns.dev Compound Pattern and Dynamic Import; no tsyringe entry. All 69 learned entries are concepts, not approved automatic rules. The discovery technology table does not identify tsyringe. React compound reference includes applicability/exclusions and warns about cloneElement nesting, accessibility and Client Component context. Lexical search for 'tsyringe 의존성 주입' returned unrelated bundling/micro-frontends/compound concepts. Their presence is not evidence of DI coverage. No knowledge sync or production implementation was changed for this study.

## Fresh-context implementation exercise

Same faulty module and agreed behavior contract supplied separately to /root/order_north, /root/order_east and /root/order_west using fork_turns=none. Each received a copied fs-work skill and relative references, no preceding conversation, other answers or common test implementation. Scope limited to its own src/orders.mjs; no class/container or UI changes required. Native inherited model settings; exact model build/temperature were not available. Fresh contexts are not statistically independent models. Skill/reference hashes: [guidance-hashes.json](order-study-2026-09-23/guidance-hashes.json).

Parent fixed nine common assertions before reading generated implementations, then ran the same checks on before and all three outputs. Cases: valid send; invalid quantity; duplicate rejection; independent instances; async retry; sync throw; non-Error fallback; retry clears error at start; new submission clears prior success. This is a synthetic current baseline, not a before/after FS-version comparison or proof of benefit from FS over a bare model. Agents could inspect copied guidance, so this is not a contamination-free benchmark. No FS policy-completion IDs were claimed for these standalone snippets.

| Source | Passing | Failing | Exit |
| --- | ---: | ---: | ---: |
| Before | 2/9 | 7 | 1 |
| North | 9/9 | 0 | 0 |
| East | 9/9 | 0 | 0 |
| West | 9/9 | 0 | 0 |

All three source hashes match: 0d4d6072bfd1af018de507561cc72f4aafd448d74fb5416b27a0644c1fac0ad8. Contract test hash: 66177c1627e1fb3bcc63b6ad6592671f0c9b225fb892b3457cae2b2e7c2c5643.
The implementations move pending into instance ownership, validate inputs, reject duplicates, release pending on both send outcomes and normalize error messages. They preserve the injected send and notification boundary. No changed test expectations were used to get a pass.

Artifacts: [bad code](order-study-2026-09-23/before.mjs), [North code](order-study-2026-09-23/north.mjs), [East code](order-study-2026-09-23/east.mjs), [West code](order-study-2026-09-23/west.mjs), [tests](order-study-2026-09-23/contract.test.mjs), [machine results](order-study-2026-09-23/results.json), [request](order-study-2026-09-23/request.txt). Raw common test logs are alongside these files. Worker response summaries are in responses.md; worker self-reported local checks are not the common nine-check score.

Reproduce from repository root (Node 24):

    FS_ORDER_MODULE="$PWD/.frontend-system/evidence/order-study-2026-09-23/north.mjs" node --test --test-timeout=5000 .frontend-system/evidence/order-study-2026-09-23/contract.test.mjs

Replace north with before/east/west. Before intentionally exits 1. UI rendering, real network, persistence, reentrant/throwing notification callbacks and general design quality are outside this snippet contract.

## Other observed checks this turn

- npm run test:eval: 10/10 passed, including 3 contracts x3 deterministic mutation/workflow cycles and policy migration case. [Log](order-study-2026-09-23/workflow-eval.log).
- npm --prefix test/fixtures/frontend run acceptance: passed baseline, eight deliberately invalid hook/accessibility/boundary/domain/server-only variants, then restored baseline. [Log](order-study-2026-09-23/frontend-acceptance.log). This tests the existing fixture, not React integration of the three standalone outputs.
- No new browser E2E run this turn; previous turn's one Chromium pass is historical evidence.

## Probability study

[Wang et al., Self-Consistency](https://arxiv.org/abs/2203.11171) demonstrated gains from diverse reasoning samples and answer aggregation on arithmetic/commonsense benchmarks, not a proof for arbitrary production code. [Lyu et al., Sample Consistency](https://arxiv.org/html/2402.13904v2) studies calibration against labeled reasoning datasets. It reports improvements with 3–5 generations under tested conditions, no universally best consistency metric, and sampling/model/domain limits.

Illustrative binary model only: if independent answers each have known accuracy p=.8, three-vote majority accuracy is 3p²(1-p)+p³=.896; given unanimous answers, correctness is p³/(p³+(1-p)³)=.984615. If answers are perfectly correlated, unanimity occurs regardless of correctness and remains .8. These are mathematical assumptions, NOT FS accuracy estimates. Actual task difficulty and shared model/document blind spots can correlate failures.

This exercise observes agreement 3/3 and nine passing assertions per output. It cannot estimate P(correct | agreement) across real tasks. Future calibration should freeze distinct real failure cases and holdout cases, compare single-generation vs three-generation decisions under the same permitted settings, and record agreement-but-wrong frequency, defect detection, false-positive changes and test/mutation outcomes separately. Use task-level evidence; repeated runs of the same case are not separate real-project samples.

## Feedback route

Use fs-review to diagnose a concrete expected/actual mismatch with files and reproduction; fs-work to fix the authorized defect and preserve a regression. Update project decisions for project-local constraints. For knowledge omissions, register official sources with fs-knowledge and explicitly sync the relevant scope; confirm source meaning and valid/invalid/excluded examples before shared rule promotion. For FS false verification, add a failing tool regression and strengthen the gate. Run held-out cases after a correction rather than only replaying the case used to develop the fix.
