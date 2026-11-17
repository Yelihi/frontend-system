---
name: fs-issue
description: Draft, create or update Linear issues from a development request using shared writing criteria and project-specific settings. Use for Linear issue work; do not start architecture planning, implementation or PR delivery merely to write an issue.
---

# FS Issue

Determine whether the user requested a draft, creation, or an update. Preserve that
scope and existing authorization. A request to create in Linear authorizes that issue;
do not ask for the same permission again. Draft-only requests never authorize a write.

Use the connected Linear tools actually available in this session. Resolve the target
from the supplied issue/project/team, existing context and the relevant tool reads.
Never invent a tool name or assume that authentication grants every team permission.
If tools are unavailable, return a clearly labeled draft and the concrete missing
capability; do not install a client, store OAuth credentials, or claim creation.

When working in a project, pin this skill with `pin_skills` and record the selection
reason. On resume, use `get_skill_run` with the saved id/hash and read the pinned entry
and needed references. Never silently switch to updated guidance. If recording is
unavailable, disclose that the work is unpinned rather than fabricate a receipt.

Read [issue writing](references/issue-writing.md). It contains common criteria;
optional project settings contain only team/project IDs and project-specific choices.
Inspect only the relevant evidence. Do not require fs-project, fs-plan or an entire
repository analysis for ordinary issue work. Ask only when an unresolved choice
materially affects the issue's meaning, target or authorized scope.

Before writing, check the proposed content against the request and known facts. For
updates, read the current issue and preserve unrelated content. Use only supported
fields, then read the returned issue to verify its ID, target and intended changes.
Report the actual URL and verification limits. A successful write response alone is
not evidence that all acceptance conditions are correct.

If a write times out or its result is uncertain, first inspect the known issue ID or
search narrowly for the attempted operation. Reuse a verified existing issue. A title
match alone is not proof of identity. When the outcome cannot be established, report
it as uncertain and stop before another create; do not blindly retry or claim success.
No labels, cycles, assignments or notifications beyond the requested scope.
