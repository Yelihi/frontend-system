{
  "planId": "knowledge-capture-integrity",
  "checkId": "0d5ccd69-4711-459b-a16d-d476ed9e0853",
  "reviewId": "751b4b7a-9f12-4c5e-ac02-52b643c49135",
  "sourceHash": "78793fef8644f0b7e44251f62fe28193f9ec0a716c07715e12ffa831cd30e66b",
  "tests": 57,
  "verified": [
    "Current v3 derived publication required before remote ACK",
    "Partial HTTP response cannot replace cached body/diff",
    "Dedup checks existing file and URL/remote hash",
    "Changed provenance clears publication even with unchanged local content",
    "Source path confinement"
  ],
  "repeat": "npm run check && npm run test:package; targeted node --test dist/test/source-updates.test.js after build",
  "limits": [
    "Controlled HTTP responses; no live remote-site sweep",
    "HTTP 200 semantic truncation still needs host review",
    "No general crawler or installed plugin update",
    "No commit/push requested"
  ]
}