{
  "planId": "source-review-and-evaluation",
  "checkId": "374f8707-a537-4c86-912f-266b97403f5a",
  "reviewId": "9e07298b-5c09-4d21-b87e-62f0dfcd1dc8",
  "sourceHash": "b60cbfc5bf905b7e43b18cc967da56937c1ee5e577860ddcf1e6d30452ba40ab",
  "tests": 60,
  "verified": [
    "typecheck/lint/60 tests/standalone package",
    "Evidence-bound source review blocks unreviewed and stale source sync",
    "Review-only does not publish and mandatory rule approval stays separate",
    "479 historical sources remain legacy-unreviewed",
    "Hand-authored grader calibration: 3 accepted, 21 rejected"
  ],
  "modelComparison": {
    "status": "blocked-before-comparison",
    "completedJourneys": 0,
    "usage": null,
    "modelProbe": "test/evals/fs-comparison/v3/results/connection-2026-10-02T120053/result.json",
    "restrictedAttempt": "test/evals/fs-comparison/v3/maintenance/results/2026-10-02-controlled-attempt/summary.json",
    "reason": "app-server initialization and sandbox_apply both report Operation not permitted"
  },
  "limits": [
    "Host/user assesses source truth, applicability, complete claim coverage and evidence",
    "Previously distributed references are not automatically revoked",
    "Maintenance pilot uses no DOM and fresh context per stage; not the continuous interactive track",
    "Actual model end-to-end runner, full architecture review and model efficacy remain unverified",
    "Installed plugin cache was not refreshed; no commit/push requested"
  ],
  "repeat": "npm run check; npm run test:package; see maintenance/README.md for controlled model runner"
}