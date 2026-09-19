# Frontend System Init

Use the current project root unless the user names another path.

First inspect what exists. For an existing project, preserve it and follow the setup
below. For a new project, read `get_workflow_context`: if a target is missing or
unapproved, use `fs-plan` for domain-first discussion and explicit approval before
framework installation. Then scaffold only the approved frontend/framework-local
server foundation, dependencies and runnable checks, preserving any existing files.
Consult official framework instructions for the actual versions. Do not build a
separate backend, provision a database or deploy. After setup, inspect the result;
features follow through `fs-work`.

1. Read `.frontend-system/config.json`. Reuse the saved provider and execution mode unless the user requests a change; recheck live connection and authentication on reruns.
2. If no provider is saved, explain built-in review and optional OpenDesign. OpenDesign Cloud requires its account and credits; Local Codex uses its own authentication and quota; secure BYOK bills the selected provider. Cloud is the proposed OpenDesign default; Local Codex or BYOK require an explicit choice. Installation or setup permission does not authorize a paid test generation.
3. For OpenDesign, read `../../references/open-design.md` and follow its setup procedure through MCP response, mode-specific authentication, and explicit project binding. Reuse an existing installation and authenticated session. Do not stop at desktop installation or tool registration.
4. Call `configure_project` with the selected provider, actual MCP registration scope, execution mode, and verified project ID when available. Settings record intent, not live readiness. If setup is blocked, save the selected settings, report the exact unfinished step, and preserve that selection; use built-in only if the user chooses it.
5. Continue with `fs-plan` even when external setup is blocked. Finish with separate inspection and OpenDesign readiness results, any user action still needed, and a concrete `fs-plan` or `fs-work` example for this project. Full OpenDesign setup is incomplete until connection, authentication, and project binding have been verified; inspection requires `.frontend-system/init.md` and accounted-for area evidence. Legacy `project.md` remains preserved.

`--overall` may suppress inspection questions, but never third-party installation consent.
