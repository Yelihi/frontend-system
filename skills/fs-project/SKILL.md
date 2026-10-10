---
name: fs-project
description: Analyze an entire existing project to create .frontend-system/project.md, or explicitly refresh it with fs-project update. Generate a human report, compact AI references and automatic observed-flow HTML, with architecture, event/state flows, findings and coverage; no product edits.
---

# FS Project

`fs-project [path] [--base <branch>]` creates the project analysis.
`fs-project update [path] [--base <branch>]` refreshes it explicitly.
These are host-chat requests, not shell subcommands.

Follow [project analysis](../../references/workflows/fs-project.md), using the current
host AI and existing FS tools. Inspect the whole baseline inventory, explain code
with evidence, and record unknown areas. An existing project.md is reused unless
refresh is requested. Do not launch a nested model or edit product/test/config files.

Follow [user decisions](../../references/workflows/user-decisions.md) when a material
answer is missing. Use the host's native selection UI (`request_user_input` in
Codex when permitted); after asking, pause this task including read-only inspection
until the actual answer. See the shared procedure for unavailable UI.
Return the human report, AI context and automatically generated HTML links, with
coverage and completion status. Partial saves are checkpoints; continue inspectable
remaining areas unless blocked or paused. Do not read HTML into AI context. Planning is `fs-plan`;
standalone visualization is `fs-plan-visualize` and does not refresh project.md.
