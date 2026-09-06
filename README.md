# frontend-system

V0 analysis and planning pipeline for arbitrary frontend repositories.

```bash
npm install
npm run build
node dist/src/cli.js analyze /path/to/project
node dist/src/cli.js plan /path/to/project "Describe the requested change"
```

The LangGraph workflow discovers nested package manifests, resolves relevant user knowledge and mandatory rules, builds a bounded work context, and creates a dependency-ordered plan. Execution, worktree allocation, worker dispatch, review execution, and knowledge approval remain later phases.
