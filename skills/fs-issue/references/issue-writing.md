# Shared issue writing criteria

Read optional `.frontend-system/issue-config.json` in the selected project only when
present. Supported settings are teamId, projectId, stateId and labelIds. They are hints
for tool lookup, not proof of access, and do not override the user's explicit target.
Do not create this file unless project defaults are requested. Never put credentials
or a copy of this guide in it.

Use the project's existing issue conventions when available. Otherwise keep the
issue proportionate to the request:

- Title: the concrete behavior or outcome, without invented urgency.
- Problem or goal: who is affected and what is observed or requested.
- Scope: the bounded outcome; separate an implementation suggestion from a requirement.
- Acceptance: observable results, including relevant failure behavior. Label proposals
  and unknowns; never invent approved business rules.
- For a bug: actual reproduction and expected/observed behavior when known. Missing
  logs or unknown causes stay unknown; do not manufacture evidence.
- Links: supplied code, design or prior issue links relevant to this work.

A small copy change needs no architectural document or test matrix. A domain-flow
issue may include UI/service/state/error handling together; do not split it by files
or technical layers solely to manufacture more issues.

Distinguish a draft from a created issue, content review from tool execution, and
verified fields from those the connector cannot read back. If the connector lacks
update/read support, explain the limitation and preserve the draft/current content.

Development fixtures for this skill live in `test/evals/skills/fs-issue.json` in the
FS source checkout. They are maintainer evaluation inputs, not consumer requirements.
