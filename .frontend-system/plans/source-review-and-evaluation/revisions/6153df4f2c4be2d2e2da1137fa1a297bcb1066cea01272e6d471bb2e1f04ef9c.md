# Source review and maintenance evaluation

User approved knowledge verification before sync and the proposed contract/change/repair evaluation. Keep Markdown free-form; store review in catalog, bound to source and provenance hashes. New or changed knowledge requires current approved review, with quoted claims, evidence, applicability, exclusions and unresolved questions. Provide bounded source reads and a save-review MCP operation. Sync skill routes pending/changed material through host review; review-only does not publish. Preserve historical publication without fabricating reviews for 479 originals; require review on their next sync.

Prepare a frozen equal-information maintenance pilot with initial implementation, policy change, transport change/failure and a keep-as-is case. Reuse existing executor/usage collection where valid, calibrate external criteria with good/bad implementations, and record failed availability probes honestly. Run model pairs only if the controlled executor starts; do not replace unavailable model runs with hand-authored quality claims. Update README with executed results and limits.
<!-- fs-issue-contracts -->

## Issue contracts

Edit these through save_revision.issues; progress is recorded in [progress.md](progress.md).

```json
[
  {
    "id": "review-eval",
    "title": "Source review and maintenance evaluation",
    "contract": "Implement review gating and run the evaluation as far as the available controlled environment supports, recording unexecuted model outcomes explicitly.",
    "files": [
      "src",
      "test",
      "skills",
      "references",
      "scripts",
      "README.md",
      "bundle",
      "docs"
    ],
    "dependsOn": [],
    "requiredCheckIds": [
      "typecheck",
      "lint",
      "test",
      "package"
    ],
    "acceptance": [
      "Unreviewed or stale sources cannot publish",
      "Review citations and provenance bound to current source",
      "Review-only remains unpublished",
      "Legacy sources are not falsely auto-approved",
      "Evaluation reports actual completions/failures/null usage separately from calibration"
    ]
  }
]
```
