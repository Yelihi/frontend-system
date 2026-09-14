---
name: fs-inspect
description: Inspect an existing frontend project and persist evidence-backed architecture, conventions, decisions, and quality gates. Use for frontend-system inspection, reinspection, sync after pulls or commits, or `fs inspect`; supports an overall mode that skips questions.
---

# Frontend System Inspect

The current top-level model owns the analysis. Do not launch a nested model.

1. Call `inspect_project`. Pass `overall: true` when the user supplied `--overall` or explicitly asked for autonomous inspection.
2. Page through `list_project_files` until `nextOffset` is null, retaining the inventory hash between pages. Inventory all first-party source, configuration and test areas; record generated/vendor exclusions, unfollowed symlinks, unresolved dynamic dependencies and inaccessible areas. A shortlist or directory-name heuristic is not whole-project analysis. Read each area in bounded batches and persist area evidence with `save_project_record` (kind `evidence`); do not silently drop deep or large areas.
3. Trace entry points, actual imports/callers, layer boundaries, domain events and invariants, state/data ownership, caching, async/error paths, design tokens/components, tests and runtime requirements. Distinguish explicit team rules from repeated implementation habits. Use framework-aware tools/search to follow aliases and re-exports and report unresolved edges. Save a coverage index linking every area to evidence and inspected/pending/blocked status, with file references and limitations. Full inspection requires every area to be accounted for; it does not guarantee every defect has been found.
4. Distinguish evidence, established decisions, and assumptions. Check installed framework versions before applying version-sensitive guidance. Reconcile legacy `project.md` decisions when present; preserve the original. On later inspections, use changed-source evidence to refresh affected areas and recheck their dependencies without needlessly repeating unchanged analysis.
5. Outside overall mode, ask only about ambiguity that materially changes architecture, ownership or quality gates. In overall mode, record conservative assumptions instead; it does not authorize installations, design changes or external writes.
6. Call `save_project_context` with the evidence-backed analysis and links to area records in `observed`. It writes `init.md` and source hashes. Record unfinished analysis explicitly rather than labeling it complete. Do not edit the target revision to match observed drift; classify approved evolution, pending migration and deviation separately.

The saved `.frontend-system/init.md` is current project context for later work; `project.md` remains a legacy fallback. Read `../../references/decision-workflow.md` for evidence, authority and domain boundaries. Inspection does not refactor product code.
