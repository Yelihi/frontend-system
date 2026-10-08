# Development 3: measurement audit outside generation

Three fresh editor journeys completed. Source/runtime/answers/questions unchanged; FS native hash and projection match; no approval. One question-phase input error (summary supplied outside analysis) was rejected and repaired.

| Arm | Total tokens | Uncached input + output | Tool errors |
|---|---:|---:|---:|
|raw-K1|129645|30957|0|
|fs-K1|1207888|99664|1|
|ordinary|124556|21644|0|

Forced influence auditing was removed and no influence tool call occurred. This did NOT produce an observed total-cost improvement: FS used 1,207,888 tokens versus 733,296 in development-2. Model choices and cache differ, so this is not an isolated effect estimate. Plan phase requested full save and contract views and then made two additional summary saves after substantive self-review. See next-fix.md for the diagnosed missing diagnostics in full/contract responses and a separate owner-answer wording confound.

Qualitative coordinator observations, not an independent score:

- All conditions propose instance-local per-document drafts, immutable dispatched inputs, generation guards, injected repository and a narrow view boundary. Ordinary also explains why the controller rather than DOM adapter owns save coordination. Structural reasoning is not unique to FS.
- Ordinary gives implementation discretion over “whether a retained draft is rescheduled for autosave on return or on its next edit”. Raw says a retained record “can resume autosave when reopened”. Navigation answers require retention and cancellation on departure, but do not explicitly settle auto-dispatch on return. Treat these as scope questions, not demonstrated violations of an explicit return-saving prohibition.
- Raw again requires load/save rejection to expose an error state, without having asked that question. This repeats a concern from development-1 but not development-2. Ordinary and FS asked and received unknown about rejection, then leave that recovery choice open. Different actually asked questions matter; no average quality superiority follows.
- FS says “Only q4 remains open” and fixes conflict-selection effects (“Selection must not itself dispatch a save”). Its own commentary misread the generic unknown response as the owner declaring no other choice could be open. The response did not specify every post-comparison action. This is a scoped intent concern, not a reason to pretend contract link diagnostics validate natural-language semantics.

No general FS quality or token advantage established. Full response diagnostic repair passes deterministic regressions and will receive a separately frozen actual-model regression. The diagnostic failure remains in this cohort's original runtime and logs.
