---
name: fs-implement
description: Implement a frontend feature with project-aware architecture, framework intent, design-system evidence, and proportional testing. Use when the user asks frontend-system to build, change, or implement code.
---

# Frontend System Implement

The active top-level model owns the work and all final decisions. Never invoke a fixed model or a nested CLI session.

1. Call `get_work_context` with mode `implement`. Read `.frontend-system/project.md` and only the relevant files needed to confirm behavior.
2. Apply precedence in this order: current user request, project-specific rules and decisions, existing project patterns, then global learned references. Flag a conflict that materially changes the requested outcome.
3. For UI-affecting work, perform a design pass before editing: inspect the detected design system, Storybook stories, shared components, shadcn configuration, Tailwind configuration, global theme variables, typography, spacing, interaction states, and responsive conventions. If project config enables OpenDesign and it is available, use it as additional design context—not as authority over project evidence.
4. Preserve the framework's intent. Keep state at the narrowest correct owner, separate business decisions from rendering when useful, minimize client boundaries and effects, account for loading/error/empty states, and address accessibility, validation, caching, races, and observability where relevant.
5. Use the simplest architecture that meets the current need. Do not introduce DDD, hexagonal layers, state libraries, or abstractions without concrete pressure in this feature.
6. For a small cohesive change, implement directly. For complex work with independent areas, use native subagents when the host supports them. Give each agent a disjoint file ownership boundary; keep shared configuration and integration in the parent. A UI-specific agent owns the design pass when one is delegated.
7. Add or update proportional tests with the implementation. Run targeted checks first, then broader discovered checks when warranted.
8. If architecture facts or durable decisions changed, refresh the project context using `save_project_context`.

Read `../../references/frontend-quality.md` when establishing review dimensions.
