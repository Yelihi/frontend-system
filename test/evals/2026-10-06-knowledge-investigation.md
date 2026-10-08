# Knowledge investigation implementation — 2026-10-06

This change implements the discussed investigation contract; it is not another v10
model comparison. Existing v10 outcomes and all failures remain unchanged. The user's
edit dispatcher/class example was not added as learned knowledge or an OCP rule.

## Connected implementation

| Responsibility | Implementation |
|---|---|
| Natural-language authoring | `knowledge/source/template.md`, code-investigation section |
| Reviewed derived specification | `src/application/knowledge/investigation.ts`, optional version-1 investigation on direct reference entries |
| Strict selected-source MCP publication | `catalog.ts`, `validate_knowledge_sync` / `mark_knowledge_synced`; legacy source helper compatibility retained |
| Structural discovery | `code-triggers.ts`: enclosing-parameter comparison/switch seed; `routing.ts`: direct matching plus bounded structure-search for legacy semantic metadata |
| On-demand evidence | `code-relations.ts`: up to 200 function, call, argument, callback-binding, dispatch, write and return facts |
| Adoption gates | `design-evidence.ts` route judgments and `trigger-review.ts` checklist judgments both validate investigation findings and scoped quotations |
| Invalidation | Existing route/source/config/reference/requirement hashes include added callers, contracts and investigation metadata |
| Host behavior | `references/workflows/knowledge-investigation.md`, linked conditionally from plan/review/work skills |

No added npm dependency, browser execution or nested model in the runtime. TypeScript
syntax/binding extraction reuses the existing parser. Expanded relations are absent
unless requested; structural signals themselves are still extracted during routing.

## Regression coverage

Five new tests in `test/knowledge-investigation.test.ts` exercise:

1. Real JSX event callback → fixed object argument → imported function → actual parameter
   dispatch; native callback arguments also link. Same-named local shadowing and outer
   closures do not receive false parameter ownership. Method targets stay unresolved;
   230 calls produce 200 facts with explicit omissions. A mixed replay consumer forwards
   a variable instead of being falsely classified as a fixed argument. Existing semantic
   knowledge can be shortlisted from the observed structure without a topic-rich request.
2. The same syntax can support adoption or exclusion under different **authored** findings.
   Unknown intent, inferred owner consent, incomplete findings and uncited direct repair
   cannot silently become adoption. These assertions test validation, not AI reasoning.
3. Strict publication refuses missing investigation metadata; legacy reads/status still
   work. Editing a derived instruction invalidates publication. Invented syntax IDs fail.
4. Review records pin caller and contract files; invented quotations and stale caller
   evidence fail rather than preserving the old investigation as current.
5. Plan binding enforces the same requirements, including grouped-dismissal bypass
   attempts. Changed requirement text invalidates bound plan evidence.

Validation: `npm run check` (typecheck, lint and 103 Node tests), `npm run test:package`,
and the system skill-creator validator for fs-plan/fs-review/fs-work. The validator's
initial system-Python attempt lacked PyYAML; it ran successfully with isolated
`uv run --with pyyaml`, without adding a project dependency.

## Limits and migration

- Existing learned entries are not mechanically given invented investigations. Status
  lists `withoutInvestigation`; candidates say `legacy-checklist`. New MCP publication
  requires migration of selected sources' direct entries, not an unrelated corpus rewrite.
- The library's `validateKnowledgeSync` / `markKnowledgeSynced` compatibility default
  remains available to historical evaluation scripts; pass third argument `true` for
  strict selected-source behavior. MCP always does so.
- Exact quotes establish provenance, not truth or complete scope. A cited contract may
  still be misinterpreted; host semantic review and existing approval gates remain needed.
- No complete call/dataflow/runtime graph: selected files only, bounded output, unresolved
  methods/dynamic edges. Unsupported languages need host inspection. New consumers outside
  the declared dependency scope are not discovered merely by checking old hashes.
- Structural discovery does not establish a SOLID violation or prefer classes/methods.
  Optional alternatives, source-supported exclusions and already-authorized fixes remain
  distinct from material decisions that need owner input.
- No new model comparison was run in this implementation turn. Tests do not establish
  automatic intent discovery, semantic superiority, production performance or token savings.
  Repository source and bundle were updated; installed plugin caches were not refreshed.

## Subsequent actual model test

The user's next test request ran [v11](fs-comparison/v11/README.md): four caller/contract
contexts × ordinary / identical raw knowledge / FS, twelve fresh review turns. All
completed. All four FS cells retrieved the candidate, read the full note and saved
scoped findings. Three MCP input errors were repaired and counted. Core semantic
judgments also appeared in the comparators; no quality or cost superiority was shown.
FS used 1,690,863 total tokens and 209,647 uncached input + output, versus ordinary
415,215 / 76,911 and raw knowledge 394,582 / 100,950. FS also had an extra structured
record obligation. See the [full results and limits](fs-comparison/v11/results/2026-10-06-investigation-1/analysis.md).
This focused review does not replace the earlier implementation checks or measure
full planning/implementation performance. The frozen cohort did not change runtime code.
