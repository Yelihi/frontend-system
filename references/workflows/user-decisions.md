# Ask, pause, then use the answer

Apply when a missing user choice changes domain behavior, ownership, scope or an
approved contract. Investigate code facts and reuse an existing answer first.
Ordinary implementation details within the agreed contract do not need questions.

1. Finish the small amount of code investigation needed to frame the decision
   **before** asking. Explain the concrete evidence and why the answer matters.
   Prepare one material question with 2–3 distinct, concise options and a short
   tradeoff for each. Keep current behavior as an option when viable; a recommendation
   is advice, never an answer. Let the user supply another answer through the host UI.
2. Invoke the host's native question tool; a Markdown numbered list in commentary
   is not the question interface. In Codex use `request_user_input` when exposed and
   permitted in the active mode; prefer this blocking UI over an asynchronous tool
   when both are available. In Claude Code use `AskUserQuestion` when exposed.
   Follow the actual tool schema rather than printing its JSON or inventing a tool.
   Do not send the full questionnaire as prose before invoking the tool.
3. The question call is the last task operation until the user answers. Do not batch
   it with shell/MCP/browser calls. Pause **all work on this task**, including source
   reads, reference-site browsing, evidence saves, planning, tests and implementation.
   Save any already-known blocker before asking if needed; do not do bookkeeping
   after showing the question. If there is a saved plan, leave the decision open.
4. With an asynchronous native question tool, submit the question once and use the
   host's wait/yield mechanism. No background investigation or speculative branch of
   work while the question is pending. Wait completion alone is not an answer.
   Codex CLI may show a queued question with an answer shortcut rather than opening
   the selector immediately; do not duplicate it as another prose question.
   Cancellation or an empty result leaves the decision unresolved; follow active
   host rules for how to return control, never assume an option was selected.
5. If a native question tool is unavailable or forbidden in this mode, state the
   limitation in the final reply and end the turn. For Codex CLI, direct the user to
   `/plan` when Plan mode is needed to expose the tool, then resume the same question
   through the native UI. `fs-plan` is a skill, not a host mode switch. Do not pretend
   to change modes, enable experimental/global settings, launch a nested Codex, or
   replace the requested UI with a prose questionnaire and continue work.
6. No timeout, silence, preselected UI option, `auto`/full-access setting or tool
   permission constitutes an answer to a design question. Do not approve a plan,
   start a work attempt or mark the choice resolved on that basis.
7. After the actual answer arrives, record its exact intent and scope, update only
   affected decisions/obligations and resume the requested phase. A planning request
   still ends with a plan; implement only when that scope is authorized. Reuse prior
   authorization rather than asking the same approval again.

For analysis-only work, unanswered intent stays in the analysis's questions; report
partial coverage if it prevented inspection. For review-only work return the question
without writing project memory. A recommendation is never a developer confirmation.
