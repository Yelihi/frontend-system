---
name: fs-project
description: Analyze an entire existing project to create .frontend-system/project.md, or explicitly refresh it with fs-project update. Record architecture, event/state flows, knowledge-backed findings and coverage without implementing changes.
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
answer is missing. Ask and wait; never assume an answer or start implementation.
Return the actual saved path and coverage, then stop. Planning is `fs-plan`;
actual-code visualization is `fs-plan-visualize` and does not refresh project.md.
