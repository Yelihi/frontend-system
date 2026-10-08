# Conditional operation boundary investigation

A discriminator-based operation API is a review candidate, not a defect. Passing state as an argument, branching, or lacking a class does not establish a SOLID violation.

## Investigate

- dispatch (code, applicability): Does one input discriminator select different operations? Trace the enclosing parameter binding and branch inputs, writes and return values.

- callers (code, context): Have the supplied callers been traced far enough to distinguish fixed operation arguments from forwarded command values? State scope and unresolved edges.

- contract (intent, context): Has the owner supplied the compatibility scope for this task? Cite the supplied contract; a code search is not an answer about outside consumers.

- preserve-command (intent, exclusion): Does the supplied contract require preserving a common command representation or public dispatcher for replay, transport or other consumers? This excludes replacing that required boundary, not splitting internal helpers.

- invariants (code, context): Have common validation, review-state transition, error results and sequential state ownership been located in the supplied code? Trace what each successful edit returns and what the caller uses next.

## Preserve
- Preserve shared validation and error results across operations.
- Preserve review-state transitions, input ownership and sequential use of the latest successful state.
- Preserve required external command shape and replay semantics.

## Alternatives

- Expose operation-specific APIs where callers already know the operation and no shared command contract is needed. Cost: Caller migration and more API surface; a class is optional and captured state lifetime must remain correct.

- Retain a shared command boundary and optionally split operation implementations or add a caller-facing facade. Cost: Dispatch mapping remains, but replay and compatibility stay explicit. Additional indirection needs a concrete benefit.

- Retain the existing structure when responsibilities and contracts are already clear. Cost: Future operation additions still touch dispatch; compare against actual change pressure rather than branch count.

## Missing context
Inspect untraced available callers first. Ask only for unresolved material intent. Unknown consumers do not justify claiming no replay or compatibility requirement. Do not equate argument-passed state, branching, or lack of a class with a SOLID violation.

These are authored conditional evaluation instructions, not a published claim of better architecture or measured cost reduction.
