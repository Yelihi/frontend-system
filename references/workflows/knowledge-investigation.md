# Investigate a knowledge candidate

Use when a routed candidate has `investigationStatus: pending`, or a structural
recommendation needs caller/ownership evidence. A trigger is a starting location,
not a defect or authorization. Preserve existing approved decisions; ordinary fixes
within their scope do not require asking again.

## Scope and evidence

Read the selected reference with `read_learned_knowledge`: `entry.investigation`
contains its questions, applicability/exclusion roles, preserved contracts,
alternatives and missing-context instruction. Do not load every knowledge body.
`legacy-checklist` means this specification is absent, not that investigation passed.
Do not invent a machine detector or owner intent to fill missing metadata.

For relationships that affect this decision, call `get_work_context` or
`inspect_code_knowledge` with explicit files and `includeRelations: true`. This
returns at most 200 facts in the selected scope: function/parameter declarations,
calls with argument shapes and resolvable targets, JSX callback bindings, parameter
dispatch, assignments and returns. The ordinary response omits expanded relations. An observed dispatch seed also supplies
a bounded `structure-search` hint for existing semantic-only references. That reason
is lexical retrieval from a code fact, not a registered semantic interpretation.
The `syntax: parameter-dispatch` seed is an equality/inequality comparison against a
literal, or switch on an enclosing parameter/property. It does not prove multiple
responsibilities, a SOLID violation, or a need to replace a command with methods.

For an operation boundary, follow these concrete relationships as needed:

1. Locate the dispatch function and its parameter binding. Read each relevant branch's
   inputs, changed state, returned result and shared validation; facts are pointers,
   not a replacement for the branch body.
2. Find real call sites with symbol references or a scoped search. Trace an event's
   callback to its call, or work backwards from the callee. Separate literal operation
   arguments from forwarded variables and dynamically selected callbacks. If a helper
   forwards an argument, inspect that helper before claiming a fixed operation flow.
3. Trace consumers of the command value: immediate invocation, persistence, transport,
   replay or queue. Record search scope. No match in selected files proves no absence
   elsewhere, and code search cannot establish the absence of a future product need.
4. Compare the proposed change with keeping the current API using actual callers and
   requested variation. Inspect state lifetime and common validation/error contracts.
   A class, fewer branches or more interfaces earns no automatic preference.

Apply other knowledge's own instructions to its relevant ownership, input/return,
external-effect or lifecycle relationships; do not force every review through an event.
A null target, truncated facts, unselected callee, custom JSX prop, higher-order alias,
method override, dynamic import or unsupported language is an unresolved edge. Add
only needed files and reroute. Stop with `needs-context` if the investigation budget
or available code cannot settle it. Never silently turn incomplete scope into certainty.

## Record once in the existing workflow

Plan judgments belong in `save_revision.evidence.routes[].judgments[].investigation`
(or `evidenceRoutes` on a revision update). Execution-only checklist reviews use
`save_knowledge_review.judgments[].investigation`. Do not create both records for the
same planning judgment. A read-only review reports results without writing records.

Each finding addresses one specification question by ID:

- `status`: supported / refuted / unknown, relative to the question's proposition.
- `basis`: code / inference / owner / unknown. Separate observations from conclusions.
- `rationale`, `citations: [{path, line, quote}]`; known findings require exact scoped
  citations. For intent, use owner/established-contract evidence and a `confirmation`
  present in the cited quote. Without it record unknown, not inferred permission.
- Include every question once, even when unknown. Explain bounded search and unresolved
  dependencies in `limitations`; a generic confidence statement is insufficient.

The assessment's `action` is recommend / repair / ask / inspect / keep. `apply` means
knowledge adoption, not completion of a refactor. It requires all applicability
questions supported, all exclusions refuted, and no unanswered investigation question.
`not-applicable` requires an evidenced exclusion or refuted applicability. Unknown
code leads to needs-context/inspect; unknown material owner choice to needs-decision/ask.
A supported exclusion may justify retaining code while other irrelevant questions stay
unknown. Unrelated legacy candidates may use existing grouped dismissal; specified
investigations need individual findings rather than a grouped rationale alone.

Use repair only for a known existing behavior or approved requirement within authorized
work. Supply `authority: {basis: approved-contract | existing-behavior, citation}`.
Quote matching checks provenance, not the truth of an interpretation or permission;
normal plan/approval/verification gates still apply. New API, ownership or product
tradeoffs require a real decision. Reuse a previous decision covering the same scope;
do not ask again merely because another trigger fired.

For plans, all cited code must be in routed `files`, and supplied decisions/contracts
in pinned `requirements`. Checklist review citations must be in inspected `files`.
Caller, implementation, configuration, knowledge metadata and requirement hashes are
bound to the evidence. Changes invalidate reuse through existing context/plan guards.
New files or previously unsearched consumers require scope reevaluation: hashes certify
only declared dependencies. A retained record is not a whole-project correctness proof.

## Sync and authoring

Use `knowledge/source/template.md` in the source repository. Preserve the author's
claim, applicability, exclusions, alternatives, invariants and unknowns. Derive an
`investigation` only when the source supports a concrete conditional judgment. Its
questions must distinguish code evidence from owner intent and have at least one
applicability and one exclusion question. Keep concepts as supporting references when
they do not justify a prescription. Do not fabricate an example's preferred pattern.

New MCP `validate_knowledge_sync` and `mark_knowledge_synced` require this specification
for direct references of selected sources. Unselected legacy entries remain readable
and appear in `knowledge_status.routing.withoutInvestigation`; this is incremental
migration, not automatic certification of the old corpus. The low-level catalog helper
retains its compatibility default for historical harnesses; pass its third argument
`true` for the same strict selected-source publication used by MCP.

Before publishing, test extraction separately from judgment. Use the same syntax with
an applicable contract, an excluded contract, mixed consumers, and missing context.
Synthetic signal matching alone is insufficient. Verify that unsupported syntax IDs,
missing investigation findings, fabricated citations and stale caller/contract hashes
fail. Authored findings test the server gate, not the model's ability to discover intent.
Actual host judgment and token savings require separately recorded model comparisons.
