# Development 4: diagnostics repair and explicit unknown scope

All three fresh editor journeys completed (six turns), with zero MCP input errors. Source/runtime, delivered questions/answers and resumed threads pass the integrity audit. The FS standalone plan matches its native projection and last saved hash; it remains unapproved. See [integrity audit](integrity-routing-audit.json).

| Arm | Total tokens | Uncached input + output |
|---|---:|---:|
|ordinary|157103|41007|
|raw-K1|198853|25157|
|fs-K1|1022028|76108|

The shared unknown answer was clarified before generation: it settles neither other unasked choices nor earlier contracts. Runtime includes the full/contract diagnostic-response repair. A parser-only amendment after question generation accepts optional prose evidence for the separate natural cohort; these guided outputs already used structured citations. Original parser and manifests are preserved under `harness-before-prose-repair/`; no questions were rerun.

Coordinator review (not an independent grade):

- All three plans use instance-local per-document records, immutable dispatched snapshots, acknowledged revisions, injected repository and UI boundaries. The structural choices follow asynchronous ownership rather than demanding classes or a named pattern.
- All leave conflict-resolution actions and failure presentation unresolved. FS now retains both open decisions with `Confirmation: not supplied` and blocking diagnostics; the development-3 interpretation that one unknown answer closed every other choice did not recur. This single regression is not a repeatability claim.
- Ordinary explicitly asks whether returning to a dirty document restarts autosave. FS says later dirty text waits until the document is active, but does not fully specify the resumption trigger. This remains a scope ambiguity, not proof of superior FS coverage or an explicit-answer violation.
- The prior raw-plan concern about mandatory failure UI did not recur. Do not select only the earlier unfavorable raw run.
- FS read the complete `draft-ownership` body and adopted it with cited semantic evidence. No static call trigger is fabricated for injected `repo.saveDraft`.

The FS plan used two **summary** saves, whose diagnostic coverage already existed. Therefore this actual run does not isolate or exercise the newly repaired full-save path. Deterministic MCP regressions cover that path, including nonempty diagnostics and unchanged approval gates. Lower FS total tokens than development-3 (1,207,888) are an observation, not a causal savings estimate; FS remains more expensive than both comparators.

[Ordinary plan](draft-editor-ordinary/plan/project/plan.md) · [Raw plan](draft-editor-raw-K1/plan/project/plan.md) · [FS plan](draft-editor-fs-K1/plan/project/plan.md)

## Cost trace

FS question/plan totals were 280,055 / 741,973 tokens. Of the combined 1,022,028 tokens, 945,920 were cached input; uncached input plus output was 76,108. Total includes the growing context processed across tool steps, not 1,022,028 newly written tokens or a dollar bill. Relative to this ordinary run, total was 6.51× and uncached input plus output 1.86×; relative to raw, 5.14× and 3.03×. Cache and different trajectories prevent treating these ratios as stable effect estimates.

The trace contains eight question-phase and four plan-phase MCP calls. `get_work_context` responses serialize to roughly 32,498 and 17,565 characters; a full revision read is 21,579 characters. Summary save receipts are about 1,465 characters each. These are response-character observations, not token attribution. Removing the forced influence audit did not remove the cost of project context, decision evidence, structured persistence, and the model's own reread/revision steps. Linkage validation is useful but does not itself prove better design decisions.
