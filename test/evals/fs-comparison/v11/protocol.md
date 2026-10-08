# v11 preregistered investigation behavior test

One fresh review turn per cell, gpt-6-sol medium, 600 seconds, at most two concurrent
model calls. Four cases × ordinary / same raw knowledge / FS = twelve calls. Cases,
corpus, prompts, runtime and this protocol are frozen before model generation. No
rerunning the same candidate until it wins; corrections get separate labeled runs.

All cases share the same applyEdit core. Caller wiring and explicit owner contracts
vary: direct only; recorded commands/replay; mixed consumers; incomplete context.
The ordinary comparator gets identical code and owner contracts. Raw and FS get the
same authored conditional note including every investigation question/alternative;
FS additionally uses actual skills/MCP and derived metadata. This is a focused authored
regression, not a full real-corpus, big-project or general model benchmark.

The task is review, not implementation or full plan persistence. All arms write
review.md. FS is additionally explicitly authorized to record scoped investigation
judgments using save_knowledge_review (no plan approval/product edits). A pending
record is a valid outcome when context/intent is missing. This extra persistence cost
is reported; review completion cannot be compared as full plan generation performance.

Primary observations (separate, no weighted quality score):
- Trace actual caller argument flow and explain changed state ownership.
- Distinguish API alternatives from mandatory classes/SOLID claims based on syntax alone.
- Preserve explicit validation/review/error/latest-state contracts in proposed refactors.
- Direct: discuss a concrete alternative with its cost; retaining a justified structure
  is allowed, so a class or split is not a predetermined correct answer.
- Replay: preserve required command shapes/entry; internal helpers remain optional.
- Mixed: distinguish browser facade from replay boundary; leave new action recording
  policy open rather than extending/changing it silently.
- Unknown: do not infer absence of outside consumers; ask the material compatibility
  question or defer that dependent choice.
- Do not ask again for an explicitly answered compatibility choice. New action semantics
  can legitimately require a question. No quantity-of-questions score.

FS mechanism checks: actual static seed/candidate, full relevant note delivery,
relation request/use if needed, findings with caller/contract citations, consistency
between review and record, correct pending/excluded status, no invented evidence or
false verification. A tool gate pass proves structural validation, not interpretation.
Raw/ordinary semantic quality is assessed from the same observable constraints; they
are not penalized for lacking FS records.

Read artifacts and adjudicate with exact quotes/locations. The coordinator authored
fixtures and reviews outcomes; no claim of blinded judging/statistical superiority.
Never execute generated application files. Include all usage/time/error/failure data;
unknown usage is not zero. Provider cache cannot be reset and total tokens include
cached input. Input and runtime hashes, thread IDs and actual invocations are retained.
Source/runtime modification or isolation failure makes the cell unverified.

Knowledge conversion uses an explicitly authored fixture specification and real
review/sync with strict investigation publication. It does not measure automatic
free-text extraction. The user's illustrative edit/class snippet is not published to
the real learned corpus. No external source content is required for these fixtures.
