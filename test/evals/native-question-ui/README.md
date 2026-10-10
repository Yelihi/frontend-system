# Native question UI verification — 2026-10-10

This checks FS question delivery and waiting behavior in the real Codex terminal UI.
It is not a model-quality benchmark or a simulated tool response.

## Environment and scope

- Prepared FS release: 0.5.1; the repository's `skills/fs-plan/SKILL.md` was explicitly loaded.
- Codex CLI 0.162.1, `gpt-6-astra`; Plan mode uses medium effort, Default mode low.
- A temporary `CODEX_HOME`, authenticated real model calls, and a temporary two-file blog fixture.
- `default_mode_request_user_input = false`; no global configuration changes.
- No MCP server or automatic plugin discovery in this fixture. The test exercises the actual skill and shared decision instructions, not persisted plan operations.
- A PTY drove the real CLI. Terminal output and native session events were checked together. Answers were entered by the test driver, not by a person.

Fixture `README.md`:

```text
A personal Astro blog. Existing articles are MDX files built into a static site. No private editor, auth or database. The owner wants short thinking notes but has not chosen where they appear or how they are authored.
```

## Reproduce

Use a disposable directory containing that README and a private `package.json`. Start the interactive CLI, not `codex exec`:

```sh
codex --no-daemon --no-alt-screen -C /path/to/fixture -a never -s workspace-write
```

For the first case enter `/plan`, then submit this prompt with the real repository path:

```text
Use the fs-plan skill at <repo>/skills/fs-plan/SKILL.md. README.md describes this blog.
기존 블로그에 짧은 사고 노트를 추가하려고 합니다. 기존 글과 노트를 어떤 관계로 둘지는 아직 정하지 못했습니다.
이번에는 이 한 가지 의도만 논의해주세요. 프로젝트 분석/계획 저장/구현은 하지 마세요.
제 답변을 받으면 선택한 의도를 한 문장으로 요약하고 종료해주세요.
```

Check the selectable input-area UI and the native question event. Leave it unanswered for 15 seconds: there must be no task tool calls, file changes or completed answer. Then select the second option instead of the recommendation. Confirm that the recorded answer and final summary reflect that selection and that fixture files are unchanged.

Repeat in a fresh Default-mode conversation. If the CLI offers `request_user_input_async`, it may display `Queued follow-up inputs`; open the selector using its displayed shortcut (Shift+Left in this tested version). Waiting tools are permitted; source reads, browser operations and writes are not. A queued question is not a missing question tool.

## Limits

One completed trial per mode, plus exploratory UI runs; this does not establish reliability across models or repeated production sessions. Claude Code, hosts with no question tool, cancellation, and all six end-to-end FS workflows are not covered. A skill cannot change the host's UI or mode. Plan mode's blocking question UI is the verified route for opening the selector immediately.

Raw sessions and authentication are not committed. The sanitized result file and excerpts below retain only the relevant question, answer and observed behavior.

## Observed results

| Case | Native tool / input-area UI | Unanswered hold | Task tool calls during hold | Files changed | Submitted answer used |
| --- | --- | ---: | ---: | ---: | --- |
| Plan | `request_user_input`, immediately opened | 15 seconds | 0 | 0 | Yes, second option |
| Default | `request_user_input_async`, opened with Shift+Left | 15 seconds | 0 (wait calls excluded) | 0 | Yes, second option |

Both turns remained unfinished until the answer was submitted. The Default-mode `accepted: true` tool receipt only accepted the question; the selected answer arrived later as a user question reply. No source reads or other task tools followed either question before its answer.

- [Sanitized results](results.json)
- [Plan UI capture](plan-ui.txt)
- [Default UI capture](default-ui.txt)

The first Default-mode exploration exposed the asynchronous path instead of the initially expected unavailable-tool fallback. A follow-up driver stopped because it expected the Plan-mode footer (`enter to submit answer`); the Default selector uses `enter submit`. These were test-driver assumptions, not failed FS behavior. The completed trials above used the actual native UI in each mode.

Local release checks: typecheck, lint, 140 tests, all six skill frontmatter checks, package smoke and release readiness passed. GitHub CI is a separate release gate.
