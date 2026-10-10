# v15: knowledge-to-decision diagnostic

Freeze this protocol and cases before changing retrieval or invoking models.
This is a component diagnostic, not an end-to-end FS or architectural superiority benchmark.

## Research and scope

- [Contextual Retrieval](https://www.anthropic.com/engineering/contextual-retrieval): preserve applicability context in retrieval; measure retrieval separately from answers. No claim to reproduce its embedding/BM25 results.
- [ALCE](https://arxiv.org/abs/2305.14627): distinguish exact citation existence, supporting meaning, and decision correctness.
- [LongMemEval](https://github.com/xiaowu0162/LongMemEval): use evidence-only oracle diagnostics, changed decisions and unknown answers.

Use the existing 71 published references unchanged. No new knowledge, external model judge, vector database, or synthetic corpus expansion. Corpus/source hashes are frozen. Queries are authored from actual notes, not independent user logs; retrieval gains on this set are diagnostic only.

## Stages and arms

1. Before/after lexical retrieval on 16 queries: eight development, eight held-out. Report expected evidence recall@5, number of returned candidates and unknown-query/technology-boundary failures. Exclusion matches are candidates to inspect, never negative filters or permission to apply.
2. Eight independent decision cases, four arms, one fresh session each: ordinary (no extra knowledge), raw (same complete published references/index, normal file search), fs-search (same files plus actual FS search helper), oracle (only the relevant complete existing references; no correct decision supplied). This isolates retrieval from expensive project/plan persistence. It does not exercise the full plugin workflow or sync conversion.
3. Same model, medium effort, timeout 180 seconds, max two concurrent calls; no product execution, network, personal skills, prior conversations or access to evaluator/rubric/sibling cells. Freeze inputs; never replace failed attempts or count unknown usage as zero.

## Outcomes and stopping

Record action (change/keep/ask), reason, alternatives, decisive code/owner evidence, knowledge citations and any unanswered question. Exact quotes/hash checks are mechanical; manually inspect whether the cited text actually supports the decision. Do not count citation presence as quality. Report harmful over-application, unsupported certainty, meaningful unresolved intent, current vs superseded contracts, resolved decisions, tokens (total and uncached input + output), latency and tool calls separately. No blended design score.

Ordinary lacking a private team policy may correctly ask: report this as unresolved information, not unsafe judgment. The fair system comparison is raw vs fs-search on the same knowledge; oracle diagnoses access failures. Do not claim a win merely because FS must cite knowledge.

If FS shows better supported decisions without new harmful changes against raw, repeat all four arms once on new sessions before interpreting a provisional advantage. If raw and FS both reach the same correct decisions, or the task/rubric has a ceiling or ambiguity, stop: do not increase difficulty or tune cases until FS wins. Fix an observed product or evaluation defect once and rerun affected checks; preserve initial results. Two model rounds maximum in this diagnostic. General superiority requires independent real project decisions and blind human assessment beyond this authored pilot.
