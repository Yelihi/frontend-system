# v14: repeated token trajectories (frozen before model calls)

Purpose: locate repeated cost concentration before choosing product optimizations.
No FS runtime/skill changes during this cohort. No retry to select a favorable result.

Two existing v12 projects: request boundary/state/cache and React variants/store.
Two arms: ordinary and fs-K1; three independent repetitions; analysis then changed-input
plan in separate fresh model threads. 24 calls, gpt-6-sol medium, 900s per call, at most
2 concurrent calls. Use v12 prompts/owner answers/changes unchanged. Each repetition and
arm gets a clean source clone and runtime. Prior artifacts transfer only to that cell's
follow-up plan; no conversation resume. Seeded scheduling, both arms under same limit.

Reuse v12 prepare/run_cell, v10 filesystem/MCP isolation, v3 executor. Persist hashes,
raw CLI events, failures, outputs, thread IDs and total usage. Never access another user
session: locate only the exact thread IDs returned by these executions (or explicitly
listed historical v13 comparison sessions).

Extract local rollout token_usage_record per response. Keep usage and tool/action
metadata only; omit private account/rate-limit data, reasoning, other conversation text.
Require unique response IDs, nonnegative counters, input+output consistency and exact
agreement with final CLI totals. Missing/mismatched measurements remain unknown.
Reasoning is part of output, never added again. Total input includes cached input.
Report cached input, uncached input and output separately; no pricing assumptions.

Categorize model responses by requested operations, retaining mixed/uncertain buckets.
A response's tokens include prior context and preceding tool outputs; a category is
where spending occurred, NOT a causal invoice for a tool. Error recovery means a response
following an observed error; it does not isolate the error's incremental token cost.
Keep response index/timestamp, cumulative totals, input-context size, tool-result chars,
failed operations and category evidence. Characters are not tokens. Parallel tool calls
in one response are not arbitrarily apportioned.

Graphs: cumulative per-response curves, per-request input/cache/output, category totals,
per-case/arm/stage median and min/max for 3 repeats, separate ordinary/FS comparisons.
Report completion alongside cost. Analysis artifact existence is not semantic quality;
FS plans additionally need bound evidence, pinned analysis hashes and no contract-link
diagnostics. Do not call an incomplete cheap run an efficiency improvement.

This measures analysis and planning (including repair), not implementation/runtime
verification. n=3 is exploratory, not a stable population estimate or causal proof.
Historical v13 extraction is separate because prompts and runtime differ.
