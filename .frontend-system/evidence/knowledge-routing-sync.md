{
  "planId": "knowledge-routing-sync",
  "checkId": "6d4d1241-a4b1-4c79-a7a6-677455e2c349",
  "reviewId": "d31a0d31-fcde-4e8b-9423-aecbc9abfe23",
  "sourceHash": "42bd6511735506ea6c7816eb6947ae6f9716940ed0bf88773aef14c74e9bbfc5",
  "tests": 56,
  "scoreTest": 1,
  "skillRelativeLinks": 28,
  "sync": {
    "sources": 479,
    "references": 69,
    "direct": 64,
    "supporting": 5,
    "deferred": 0,
    "unmigrated": 0,
    "retrievalPassed": 7,
    "triggerPassed": 135,
    "unpublished": 0
  },
  "pairedRouting": {
    "requiredTopicCases": 12,
    "negativeCases": 4,
    "before": {
      "requiredTopics": 4,
      "negatives": 4
    },
    "after": {
      "requiredTopics": 12,
      "negatives": 4
    }
  },
  "resultsPath": "test/evals/fs-comparison/v3/routing-results.json",
  "usability": {
    "requiredNoteFields": [
      "title",
      "content"
    ],
    "userRoutingJsonRequired": false,
    "registrationMeansPublished": false
  },
  "limits": [
    "Development regression comparison against four-reference pilot, not the v2 model-run snapshot",
    "Semantic signals in paired cases are fixed host interpretations, not model-generated",
    "No new isolated interactive model-quality/token run, browser/profiler run or actual user-time study",
    "Existing 69 reference bodies reviewed for routing; not a new full audit of 479 raw originals or remote freshness",
    "No new per-source Skill or detector; CSS/general Web API context remains host semantic interpretation",
    "Official Python skill validator unavailable (PyYAML missing); frontmatter and 28 relative paths checked separately",
    "Installed plugin cache not updated; no commit or push in this request"
  ]
}