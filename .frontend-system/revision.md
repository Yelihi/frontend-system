# FS: trusted implementation workflows

Approved direction: the user requested “Implement the plan.” after reviewing the
four-command, incremental knowledge, executable policy and bounded workflow plan.

## Preserved guarantees
- Preserve existing user edits, source knowledge, project history and legacy readers.
- Four public skills: fs-plan, fs-work, fs-review, fs-knowledge; keep explicit sync.
- The host model reasons; deterministic tools store facts, execute checks and reject
  incomplete/stale evidence. No nested model, scheduler or graph framework.
- Mandatory shared rules need exact-candidate approval. Project policy adoption is
  separate; existing projects pin their adopted content and review updates.
- Revision approval covers text and policy. Missing checks, skipped reviews, changed
  policy/source and exhausted attempts cannot become verified completion.
- Prefer existing checks; custom checks require passing and intentionally failing examples.
- Inspection preserves observed facts separately from intended domain guarantees.
- Preserve test placement. Update facts after implementation, targets only by decision.

## Deliverables and acceptance
1. Consolidate public skills and preserve their relevant procedures.
2. Versioned rules/examples, source-bound proposals and approval.
3. knowledge/sources.json, conditional bounded HTTP reads, cached text differences,
   source status and paged review; no unchanged body in model responses.
4. Revision-bound requirements/checks/reviews/exceptions and nonzero CLI gates.
5. Dependency-aware steps, persisted three-attempt budgets, current review evidence,
   generated refactoring checklist, focused plan/work context and bounded logs.
6. Real React/Next fixtures: hooks, server-only, custom boundary, accessibility and
   order retry behavior; Node unit/integration plus Chromium E2E; Vue regression.
7. CI, distribution smoke checks and documented host-model evaluation scenarios.

Tests must distinguish rule diagnostics from infrastructure failures. Existing
violations are scoped to an explicit migration step, never hidden globally. Source
download/hash/diff costs no model tokens; model review still does. Do not claim
semantic correctness or security against a malicious local file writer.

## Defaults
Three full attempts per step (initial plus two repairs); on-demand research only;
React/Next/TypeScript initial research scope; 12,000-character response windows;
Chromium only; CI/predeployment validation without deployment or remote settings.
