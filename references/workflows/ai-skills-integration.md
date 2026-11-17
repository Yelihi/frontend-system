# ai-skills disposition

Source: https://github.com/Yelihi/ai-skills at
`512de7939e7229e373f6b3f933a65cb35eb0ee59`. This is the reviewed disposition of its
25 skill entrypoints, not a bulk import or approval of every supporting rule.
No third-party skill text is copied by this first integration.

| Existing skill(s) | Destination / decision |
| --- | --- |
| domain-driven-architecture-agent (name: ddd-architecture), spec-advisor, architecture-design, feature-checklist | Consolidate relevant domain/boundary/checklist judgments into fs-plan references when supported by real cases. Remove mandatory pipeline ordering. |
| design-system-spec | Optional design-system procedure; reuse existing tokens/components first. |
| component-builder | Preserve component ownership/purity guidance conditionally; remove default FSD/RSC/Tailwind assumptions. |
| frontend-test-principles, frontend-test-suite | One test-authoring entry with task-specific references. Preserve existing test placement/runner and public contracts. |
| type-checker, code-cleaner, code-quality | Reuse FS check execution; consolidate semantic review lenses without repeated lint/build runs. |
| a11y-checker, performance-checker | Retain focused procedures when requested or justified by actual risk; distinguish static suspicion from measured behavior. |
| fsd-clean-architecture (name: clean-architecture) | Project-selected architecture reference, not a universal rule. |
| vercel-composition-patterns, vercel-react-best-practices, web-design-guidelines | Verify upstream license/notices and pin source versions before import. Do not fetch a moving policy during a pinned run. |
| figma-to-tsx | Keep project-specific mappings only after comparing maintained Figma capabilities; no duplicate general Figma workflow. |
| karpathy-guidelines | Consolidate only missing decision guidance; avoid another always-loaded simplicity preamble. |
| commit-convention-reviewer | Project-specific convention reference; no global Notion linkage/title limit. |
| verify-pipeline | Exclude from core: its scaffold commands target a different project. |
| deploy-to-vercel | Exclude from this integration: provider-specific delivery, separate from FS's own release pipeline. |
| obsidian, obsidian-md-reviewer, obsidian-structure | Exclude from frontend core; decide their maintenance destination separately before retiring ai-skills. |

Observed conflicts: frontend-test-organizer mandates src/_tests/, while FS uses test/;
frontend-test-suite proposes design changes based on mock/dependency counts; several
entries impose sequential skill delegation or project architecture. Referenced
fsd-clean-architecture/reference/pages.md and vercel-composition-patterns/AGENTS.md
were absent. The domain entry also names a missing skills/domain-driven-architecture/
SKILL.md path. Repair links and narrow applicability before importing.

Some frontmatters declare MIT; no repository-wide LICENSE/NOTICE file was found in
the inspected tree. This is not a determination of upstream licensing. Preserve exact
origin and required attribution for each actual import; do not assume one declaration
covers the whole collection. The old repository remains unchanged during this pilot.
