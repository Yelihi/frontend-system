---
name: fs-init
description: Initialize frontend-system in the current project, optionally enable OpenDesign with explicit consent, then immediately inspect the project. Use when the user asks to initialize, set up, or start frontend-system.
---

# Frontend System Init

Use the current project root unless the user names another path.

1. Check for `.frontend-system/config.json`. If it already records a design provider, do not ask again unless the user requests a change.
2. Otherwise ask one concise question: whether to enable the third-party OpenDesign integration or use the built-in design review.
3. If OpenDesign is accepted, explain whether the active host can install it project-locally or only user-wide. Obtain explicit approval before installation, use OpenDesign's official installer for the active Codex or Claude Code host, and verify that its MCP is available. Never add OpenDesign to the target application's `package.json`.
4. Call `configure_project` with the selected provider and actual scope. If installation fails, report it and configure `built-in` only with the user's agreement.
5. Immediately continue with the `fs-inspect` workflow. Initialization is incomplete until `.frontend-system/project.md` exists.

`--overall` may suppress inspection questions, but never third-party installation consent.
