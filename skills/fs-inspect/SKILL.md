---
name: fs-inspect
description: Inspect an existing frontend project and persist evidence-backed architecture, conventions, decisions, and quality gates. Use for frontend-system inspection, reinspection, sync after pulls or commits, or `fs inspect`; supports an overall mode that skips questions.
---

# Frontend System Inspect

The current top-level model owns the analysis. Do not launch a nested model.

1. Call `inspect_project`. Pass `overall: true` when the user supplied `--overall` or explicitly asked for autonomous inspection.
2. Use the returned shortlist and native repository search to inspect representative entry points, boundaries, state ownership, data fetching, styling, tests, build settings, security-sensitive inputs, and error handling. Do not read every file by default.
3. Distinguish evidence, established decisions, and assumptions. Check installed framework versions before applying version-sensitive guidance.
4. Outside overall mode, ask only about ambiguity that would materially change architecture, ownership, or quality gates. Ask as soon as the ambiguity is found, then continue with the answer.
5. In overall mode, ask no project-structure questions; make conservative assumptions and record them. This mode does not grant permission for installs or external writes.
6. Call `save_project_context` with the final structured analysis. Keep open questions only when genuinely unresolved.

The saved `.frontend-system/project.md` is durable project context for later implementation and review. Update it when project-level facts or decisions change, not for every incidental edit.
