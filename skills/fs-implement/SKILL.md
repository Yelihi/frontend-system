---
name: fs-implement
description: Implement a frontend feature with project-aware architecture, framework intent, design-system evidence, and proportional testing. Use when the user asks frontend-system to build, change, or implement code.
---

# Frontend System Implement

The active top-level model owns the work and all final decisions. Never invoke a fixed model or a nested CLI session.

Read `../../references/decision-workflow.md`. Use the approved revision and current
facts together. Missing/stale inspection requires relevant analysis; a missing target
requires `fs-revise` before architectural commitments. In-scope fixes need no repeated
approval; changes to domain rules, team rules, technology or scope require discussion.

1. Call `get_work_context` with mode `implement`. Read `.frontend-system/init.md` (legacy `project.md` fallback), relevant revision sections and project decisions. Reconcile reported source changes and follow the affected consumers and dependencies beyond the shortlist.
2. Respect the current request and explicit project constraints. Distinguish observed habits from team rules and conditional knowledge from prescriptions. Retain conflicting evidence and assess applicability before choosing; reading priority does not resolve semantic conflicts.
3. For UI-affecting work, inspect the relevant existing screens, detected design system, Storybook stories, shared components, shadcn configuration, Tailwind configuration, global theme variables, typography, spacing, interaction states, and responsive conventions. Then follow the UI design conversation below before editing the affected UI, regardless of design provider. Read the provider settings returned by `get_work_context`. If OpenDesign is selected, follow `../../references/open-design.md` for live readiness, the bound project, generation when requested, and applying the resulting design to this repository. Existing artifacts can supply context without a new generation. Preserve project evidence as the authority. If OpenDesign is unavailable, explain the unfinished step and continue independent work; do not silently change provider or claim that its design was applied.
4. Preserve the framework's intent. Keep state at the narrowest correct owner, separate business decisions from rendering when useful, minimize client boundaries and effects, account for loading/error/empty states, and address accessibility, validation, caching, races, and observability where relevant.
5. Use the simplest architecture that meets the current need. Do not introduce DDD, hexagonal layers, state libraries, or abstractions without concrete pressure in this feature.
6. For a small cohesive change, implement directly. For complex work with independent areas, use native subagents when the host supports them. Give each agent a disjoint file ownership boundary; keep shared configuration and integration in the parent. A UI-specific agent owns the design pass when one is delegated.
7. Follow `../../references/testing-and-transition.md` to select meaningful cases, establish missing test infrastructure and verify changes. New shared UI/design-system work includes compatible Storybook setup, stories and relevant interaction checks by default. For UI changes, inspect rendered behavior against the agreed direction and relevant viewports/states. Correct observed issues; report unavailable visual verification. Run targeted checks, then necessary integration/full checks.
8. Record actual decisions locally and refresh changed current facts using `save_project_context`. Do not automatically rewrite revision to match code: discuss, save and approve any intentional target change through `fs-revise`.

Read `../../references/frontend-quality.md` when establishing review dimensions.

## UI design conversation

Use this sequence for changes to visible layout, styling, content hierarchy, or
interaction. Skip it for work that does not affect the UI. Scale it to the change:
an exact button-color request does not need a full screen-design interview.

First fill in what the current request, prior answers, and repository already
establish. Ask only unresolved questions that affect implementation, in the order
below, one concise question at a time in the user's language. Wait for that answer
before asking the next; an answer may resolve later questions too. While waiting,
continue independent inspection, but do not implement a design dependent on the
missing answer. Do not present the whole sequence as a questionnaire.

1. **Purpose and action:** Which screen is changing, and what should its users
   accomplish most easily? Ask about the current problem when it is unclear.
2. **Visual evidence and direction:** Is there an existing screen, screenshot,
   or design reference to follow, and which aspects matter? References are
   optional. If none exists, offer a concrete direction grounded in the project's
   existing UI, with a small number of alternatives only when useful.
3. **Content:** Which information, fields, and realistic examples must the screen
   show? Reuse existing data and schemas; ask for missing product content rather
   than requiring the user to describe technical structures.
4. **Scope and constraints:** What may change, and what must remain? Resolve
   uncertain preferences about brand, density, component reuse, or layout freedom;
   discover framework and theme details from the repository yourself.
5. **Responsive behavior and states:** Resolve product-specific requirements for
   mobile/desktop, empty results, loading, errors, and long content. Propose defaults
   from the existing flow. Accessibility and necessary states remain baseline
   responsibilities, not optional features the user must remember to request.

If the user says "decide for me" or asks to skip questions, use project-backed
defaults for remaining preferences and state material assumptions. Do not invent
required business facts or treat silence as an answer. Once enough is known,
briefly summarize the design direction and scope, then implement without an extra
approval gate. Carry these answers into any OpenDesign brief so the user does not
have to repeat them; preserve its required confirmation and billing workflow.
