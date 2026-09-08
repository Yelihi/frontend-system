# frontend-system

`frontend-system` is a model-independent frontend engineering plugin for Codex and Claude Code. The model already running in the user's session owns analysis, questions, implementation, and review. This package supplies reusable Skills plus deterministic MCP tools for repository discovery, context persistence, knowledge indexing, and check execution.

It does not start another AI process, select a model, use LangGraph, or add an agent dependency to the target application.

## How it works

```text
User in Codex or Claude Code
        │ invokes an fs-* Skill
        ▼
Current top-level model ── asks material questions and makes engineering decisions
        │
        ├── frontend-system MCP ── manifests, files, hashes, git context, checks
        ├── project context ────── <project>/.frontend-system/
        └── learned references ─── compact guidance distributed with this plugin
```

MCP returns facts and performs bounded operations. Skills define the workflow. The host's current model therefore improves naturally as Codex or Claude models improve.

## Install in Codex

Requirements are Node.js 18 or newer and Git.

Register the GitHub repository once for the current Codex user. These commands may be run from any directory:

```bash
codex plugin marketplace add Yelihi/frontend-system
codex plugin add frontend-system@frontend-system
```

Start a new Codex session in any target project and invoke `$fs-init`. Marketplace registration and plugin installation are user-level; they are not repeated for every project. Each project keeps only its own `.frontend-system/` context.

To update an installed copy after this repository changes:

```bash
codex plugin marketplace upgrade frontend-system
codex plugin remove frontend-system@frontend-system
codex plugin add frontend-system@frontend-system
```

## Development setup

```bash
npm install
npm run build
```

The build produces both TypeScript CLI output and `bundle/mcp.js`. The committed MCP bundle lets a Git-backed plugin run without installing package dependencies in the target project.

For MCP-only use, npm exposes both entry points:

```bash
npm link
frontend-system-mcp
fs --help
```

`frontend-system-mcp` uses stdio. The Codex manifest and the included Claude Code `.mcp.json` wire that server to the appropriate plugin root.

## Workflows

Invoke the Skills from an active Codex or Claude Code session:

- `fs-init` — asks once whether to enable OpenDesign, writes project config, then runs inspection.
- `fs-inspect` — analyzes the existing repository and saves durable context. Add `--overall` for unfamiliar/open-source projects where questions should be skipped.
- `fs-implement` — implements a feature using project architecture, framework intent, and the detected design system. Complex independent areas may use native subagents.
- `fs-verify` — reviews the diff semantically, asks before production fixes, writes missing tests or stories, then runs discovered checks. Independent test areas may be delegated in parallel with disjoint ownership.
- `fs-knowledge-add` — normalizes authored Markdown, attachments, or linked sources into the central knowledge repository and catalogs them.
- `fs-knowledge-sync` — turns changed source knowledge into compact learned references distributed with the plugin.
- `fs-feedback` — drafts a sanitized, duplicate-checked issue for `Yelihi/frontend-system` and creates it only after explicit approval.

In Codex, an explicit invocation is typically `$fs-inspect`; plugin UIs may also expose the Skill by name. Claude Code namespaces plugin Skills according to its plugin configuration.

## Project-local state

`fs-init` and `fs-inspect` create:

```text
<project>/.frontend-system/
├── config.json  # selected integration settings; commit this
├── project.md   # evidence-backed architecture and decisions; commit this
├── state.json   # generated hashes and inspected commit; ignored
└── reports/     # generated transient output; ignored
```

The shared Skill is not copied into each project. A project may add its own rules or references, and precedence remains:

1. current user request;
2. project-specific rules and recorded decisions;
3. existing project patterns;
4. global learned references.

## OpenDesign

OpenDesign is optional and third-party. `fs-init` asks before installing or enabling it, reports whether the active host provides project or user scope, and never adds it to the application's `package.json`. The built-in design pass still inspects Storybook, shared components, shadcn configuration, Tailwind, theme variables, and established visual conventions.

## Knowledge lifecycle

Raw material is tracked only in the original repository under `knowledge/source/{manual,imported,attachments}`. `knowledge/catalog.json` stores hashes, summaries, and facets so the model can shortlist likely matches without reading the entire archive. `fs-knowledge-sync` publishes concise guidance to `references/learned/`.

The npm package intentionally excludes raw source knowledge. A symlinked development plugin sees learned-reference edits immediately; installed npm/plugin versions see them after that shared installation is updated. Consuming projects do not maintain independent copies.

## Deterministic CLI

The CLI is useful for debugging the data supplied to a host model:

```bash
fs inspect-context /path/to/project --overall
fs work-context /path/to/project "Add profile editing" --mode implement
fs change-context /path/to/project --base origin/main
fs checks /path/to/project
fs knowledge-status /path/to/frontend-system
fs knowledge-search /path/to/frontend-system "Next.js cache"
```

These commands do not perform AI analysis. Use the Skills for the complete workflow.

## Privacy and safety

- Repository files and imported sources are treated as untrusted input.
- External installs, GitHub issues, and comments require explicit approval.
- Feedback is sanitized; there is no telemetry or background upload.
- Broad checks run only existing non-watch package scripts discovered from project manifests.
- Production changes proposed during verification are not applied without prior user authorization.
