# Collection-to-sync integrity

Keep host HTML/PDF collection and bounded text fetching. Correct stale source acknowledgement to reuse v3 sync validation and derived publication hashes. Preserve snapshots on HTTP partial responses. Verify current file contents and source URL before deduplication; retain distinct source provenance and missing/changed notes. Cover collection, publication, acknowledgement, correction and retries in integration tests. Existing user changes remain intact. No crawler, dependency, model or remote-site sweep.
<!-- fs-issue-contracts -->

## Issue contracts

Edit these through save_revision.issues; progress is recorded in [progress.md](progress.md).

```json
[
  {
    "id": "capture",
    "title": "Collection-to-sync corrections",
    "contract": "Prevent lost captured evidence and false completed review; preserve current usable collection paths.",
    "files": [
      "src/application/knowledge",
      "test",
      "references/source-updates.md",
      "references/linked-knowledge.md",
      "README.md",
      "bundle"
    ],
    "dependsOn": [],
    "requiredCheckIds": [
      "typecheck",
      "lint",
      "test",
      "package"
    ],
    "acceptance": [
      "Stale v3 publication cannot acknowledge remote review",
      "Partial response preserves cached body and pending diff",
      "Changed/deleted note is not a duplicate; distinct URLs retain provenance",
      "Existing tests and standalone package pass"
    ]
  }
]
```
