# Ask, pause, then use the answer

Apply when a missing user choice changes domain behavior, ownership, scope or an
approved contract. Investigate code facts and reuse an existing answer first.
Ordinary implementation details within the agreed contract do not need questions.

1. Explain the concrete code/requirement evidence and why the answer matters. Ask
   one material question with viable options and their costs; mark a recommendation
   as advice, never as a selected answer. Include keeping current behavior if viable.
2. Ask with the host's structured question UI when available and permitted in its
   current mode. Otherwise put the question in the final reply and end the turn.
   With an asynchronous question tool, keep the question pending and wait for an
   explicit answer; never continue implementation in the background. Tool absence
   or mode restrictions are not permission to pick an answer.
3. Pause product/test edits and implementation commands for this task. Read-only
   investigation and saving already-observed evidence may continue. If there is a
   saved plan, retain the choice as open and execution as blocked/remaining using
   existing records; do not create a new contract just to store a question.
4. No timeout, silence, preselected UI option, `auto`/full-access setting or tool
   permission constitutes an answer to a design question. Do not approve a plan,
   start a work attempt or mark the choice resolved on that basis.
5. After the actual answer arrives, record its exact intent and scope, update only
   affected decisions/obligations and resume the requested phase. A planning request
   still ends with a plan; implement only when that scope is authorized. Reuse prior
   authorization rather than asking the same approval again.

For analysis-only work, unanswered intent stays in the analysis's questions; report
partial coverage if it prevented inspection. For review-only work return the question
without writing project memory. A recommendation is never a developer confirmation.
