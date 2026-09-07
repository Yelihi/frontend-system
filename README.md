# frontend-system

A thin, model-version-independent frontend engineering workflow. Static code discovers facts; the currently configured Codex model handles architecture analysis, implementation, review, and missing-test generation.

## Install

Requirements: Node.js, Git, and an authenticated `codex` CLI.

```bash
npm install
npm run build
npm link
```

Without `npm link`, replace `fs` below with `node /absolute/path/to/frontend-system/dist/src/cli.js`.

From this repository you can also run `npm run fs -- <command>` without installing a global link.

## Use in a project

Start with an interactive inspection. Codex asks only questions that can change the project contract.

```bash
fs inspect /path/to/project
```

For an unfamiliar or open-source repository, skip questions and record model assumptions instead.

```bash
fs inspect /path/to/project --overall
```

Inspection writes:

```text
<project>/.frontend-system/
├── project.md    # reviewable project context; commit this
├── state.json    # generated incremental state; ignored
└── reports/      # generated task/review output; ignored
```

Choose who implements a change:

```bash
# Get a concise, request-specific brief and implement it yourself.
fs prepare /path/to/project "Add profile editing"

# Let the current default Codex model implement it. No model name is hard-coded.
fs implement /path/to/project "Add profile editing"
```

After either path, review the Git diff, generate applicable missing tests, run the repository's discovered checks, and review the result again:

```bash
# Tests are generated automatically; production fixes require answers.
fs verify /path/to/project --fix ask

# Allow clear production fixes without questions.
fs verify /path/to/project --fix auto

# Generate tests but never change production code.
fs verify /path/to/project --fix never
```

Use a specific comparison point when needed:

```bash
fs verify /path/to/project --base origin/main
```

After a pull or commit, update only the changed project context:

```bash
fs sync /path/to/project
fs sync /path/to/project --overall
```

## Behavior

- Static discovery normalizes package manifests, technologies, architecture hints, and safe test/lint/typecheck/build scripts before the model runs.
- Inspect and sync compare the saved commit with the current repository and let the model read additional files on demand.
- Verify reviews frontend quality before writing tests, asks before ambiguous production changes by default, writes applicable tests, then runs checks sequentially to avoid shared-output conflicts.
- Repository files are treated as untrusted context. Codex runs read-only for analysis and review, and workspace-write only for explicit implement/test-generation operations.
- OpenWiki and parallel write worktrees are intentionally not required. Add them only when compact project context stops scaling.

Set `FS_CODEX_BIN` only when the `codex` executable has a non-standard name or path.
