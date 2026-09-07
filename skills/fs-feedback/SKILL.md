---
name: fs-feedback
description: Turn a frontend-system problem found in a consuming project into a sanitized, duplicate-checked GitHub issue for Yelihi/frontend-system. Use for dissatisfaction, analysis errors, missing guidance, or update requests.
---

# Frontend System Feedback

1. Inspect the local evidence needed to reproduce the frontend-system problem. Never collect unrelated project data.
2. Remove secrets, proprietary source, personal data, absolute user paths, remote URLs for private repositories, and unnecessary dependency details. Prefer a minimal synthetic example.
3. Search open and closed issues in `Yelihi/frontend-system` for likely duplicates. If one exists, show it and suggest a comment rather than a new issue.
4. Draft a title and body containing: symptom, expected behavior, sanitized environment/framework versions, reproduction, relevant frontend-system workflow, and suggested improvement when known.
5. Show the complete outbound content and ask for explicit approval. Creating an issue or comment is an external write and must never happen implicitly.
6. After approval, create the GitHub issue or comment and return its URL. If authentication or network access is unavailable, save or print the approved draft for manual submission.

Do not implement telemetry, automatic uploads, or background issue creation.
