# OpenDesign integration

Use this reference during `fs-work` setup and OpenDesign-backed UI implementation.
The host agent calls the separately installed OpenDesign MCP; frontend-system's
MCP only persists settings and supplies repository context. It does not proxy
credentials, manage billing, or start a design engine itself.

## Setup and authentication

1. Reuse the installed desktop runtime and MCP registration. If missing, obtain
   installation approval and use the [official download](https://open-design.ai/download/)
   and installed package instructions for the active host. On Codex, the resolved
   packaged executable supports `--headless --mcp-install codex`; verify with
   `codex mcp get open-design --json`. Do not run the unrelated `/usr/bin/od`,
   guess a daemon endpoint, replace other MCP entries, or add app dependencies.
   Check the installed help for Claude Code rather than guessing its command.
2. Require a successful read-only MCP response. A registered tool that returns
   a transport error is not connected. Diagnose the installed runtime/registration;
   if tools need reloading, report that a new host task is needed. Do not label a
   transport error as signed out or as insufficient credits.
3. For `cloud`, call `get_vela_login_status`. If signed out, call
   `start_vela_login` once, present the returned activation link/code, and let
   the user complete browser authentication. Poll status while they sign in;
   stop on success, expiry, cancellation, or error and report the remaining step.
   Never ask for a password, token, or API key in chat or save one in this repo.
   Use the user-facing name OpenDesign Cloud, not protocol identifiers.
4. For explicitly selected `local-codex`, use `list_agents` to verify the `codex`
   runtime is available and authenticated. Follow the installed OpenDesign skill's
   authentication guidance if missing. Do not enter Cloud login or credit flows.
   For explicitly selected `byok`, use the advertised profile tools and OpenDesign
   Settings; select only a non-secret profile identifier. If unsupported, report
   it instead of substituting a mode. No credential belongs in frontend-system config.
5. List/select an existing OpenDesign project or create one for this repository
   within the user's setup request. Verify its returned ID and name, then save
   the exact ID via `configure_project.openDesignProjectId`. Ask only if selection
   is ambiguous. Do not silently bind the desktop's currently active project.
6. Report connection, authentication, project binding, and credit visibility
   separately. A login success does not prove sufficient balance. Use a balance
   or estimate only if the current official tools actually expose it; otherwise
   report it as unknown and refer to OpenDesign's account UI. Never generate a
   paid sample merely to verify setup.

Direct setup diagnostics use the advertised standalone tool contracts. Do not
invent a workflow ID or impersonate OpenDesign's first-party plugin attribution.
If the installed version requires a workflow for setup calls, use its supported
account UI or report that authentication must finish with the first real brief;
do not fabricate an artifact request to get around that requirement.

Installation/authentication can be reused across repositories on the same machine
and OS account. Provider/mode/project binding are per repository. Revalidate saved
IDs on another machine or account; clear an obsolete binding with
`openDesignProjectId: null`, then select/create its replacement. Config is not an
authentication cache and never contains balance, login status, or generation consent.
Older `open-design` settings without a mode need the Cloud cost explanation and
mode selection before first generation; they are not permission to spend credits.

## Generate and apply a design

1. Use the bound project explicitly for all source and generation calls. Verify
   that it resolves successfully before use; never fall back to the active project.
   For existing designs, select the relevant artifact and read its source bundle
   with `get_artifact`, or bounded file reads if that tool is unavailable.
2. For a new design or refinement, use the installed official OpenDesign skill.
   If unavailable, finish setup using its official installation instructions
   before generation. Supply the selected mode, this repository's framework,
   existing components/tokens, required states, breakpoints, and the concrete UI
   request. Send only relevant material covered by the user's request.
3. Explain which account bears usage costs before the first paid run. An explicit
   request to generate with the explained mode authorizes that generation; do
   not ask again. General `fs-work` or an enabled provider alone does not
   authorize an unspecified paid design. Reuse existing artifacts or ask for the
   missing generation choice while continuing independent implementation work.
4. Follow the official brief, login, and runtime workflow with its server-issued
   workflow ID. Never copy a publisher identity from this reference. Retain one
   stable request ID and the exact start arguments per logical generation;
   poll the returned run until terminal completion. Polling is not a new start.
   Local Codex generation is an explicitly selected OpenDesign execution, not a
   nested frontend-system session; follow its official recursion boundary.
5. On insufficient balance, retain the run, request, workflow, project, and exact
   arguments; show the returned recharge URL and wait for the user's top-up
   confirmation. Resume with the original arguments and `resume: true` according
   to the tool contract. Never auto-purchase, create a duplicate generation, or
   switch mode/provider without the user's choice. Do not infer a charge.
6. After success, deliver the exact returned preview/studio link and follow the
   official preview workflow. To implement in this repository, retrieve the
   artifact from that run's exact project and selected entry, including referenced
   styles/assets. Partial/truncated output requires the missing context before
   claiming a faithful implementation.
7. Adapt the design into the existing framework and shared components. Apply its
   layout, typography, colors, spacing, responsive behavior, and relevant states;
   preserve business behavior and accessibility. Inspect the rendered UI against
   the design at relevant viewport sizes, then run project checks. A preview URL
   alone is not application to the codebase. Record the design source and durable
   decisions in project context, with any visual-verification limitations.

Cloud pricing and balance belong to OpenDesign and can change. See the
[official pricing](https://open-design.ai/pricing/) and
[Cloud service terms](https://open-design.ai/terms/). Protocol details above were
checked against the installed OpenDesign skill 0.5.3; use the installed version's
advertised tools and official workflow when contracts differ.
