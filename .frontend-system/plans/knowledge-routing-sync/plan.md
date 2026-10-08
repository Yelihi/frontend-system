# Knowledge routing and sync implementation

Authorized by the user's 2026-10-02 request. Extends the completed four-reference
pilot; existing unrelated working changes remain intact.

1. Version 3 index assigns every reference direct, supporting or deferred usage.
   Direct entries carry contextual triggers, checks, conditions/exclusions and
   positive/negative routing cases. Supporting concepts link to direct judgments.
   Legacy indexes remain readable but cannot publish a new sync unchanged.
2. Publication hashes include derived reference metadata and cases, not just raw
   source hashes. Changed bodies and related evidence invalidate affected sources.
3. Reuse TypeScript syntax/bindings for intrinsic JSX facts. Provide bounded,
   paginated semantic discovery; the host cites actual code before interpreting it.
   Preserve project policy validation and explicit user tradeoff decisions.
4. Accept short unstructured notes without asking the user to author index JSON.
   URL capture remains a host task: registration does not imply content was read.
5. Review all 69 existing reference summaries/bodies, preserving their original
   evidence limitations. Do not claim to re-audit all 479 original sources.
6. Check capture → sync → discovery → code evidence → judgments → invalidation;
   compare fixed cross-domain cases with the saved pilot index. Report routing
   improvement separately from model token usage and generated-product quality.

Acceptance: no unclassified references; no publication with missing direct cases;
derived edits become unpublished; unrelated source stays current; bounded semantic
discovery; JSX false positives avoided for wrapper components; existing lexical
retrieval and policy checks preserved; standalone package tools work. Validation:
typecheck, lint, repository tests, standalone package, full sync audit and a
reproducible paired routing report. Actual model-quality improvement requires a
separate isolated interactive evaluation and must not be inferred from this audit.
<!-- fs-issue-contracts -->

## Issue contracts

Edit these through save_revision.issues; progress is recorded in [progress.md](progress.md).

```json
[
  {
    "id": "routing",
    "title": "Code-triggered knowledge review",
    "contract": "Implement the scoped flow and preserve existing retrieval/policy behavior.",
    "files": [
      "src",
      "skills",
      "references",
      "test",
      "docs",
      "package.json",
      "package-lock.json",
      "bundle",
      "scripts/check-package.mjs",
      ".github/workflows/ci.yml",
      "README.md"
    ],
    "dependsOn": [],
    "requiredCheckIds": [
      "typecheck",
      "lint",
      "test",
      "package"
    ],
    "acceptance": [
      "Bindings distinguish aliases and shadowing",
      "Stale/missing judgments rejected",
      "Unsupported cases explicit",
      "Existing tests and standalone package pass"
    ]
  }
]
```
