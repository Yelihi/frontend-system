# PR feedback to reusable judgment

Use for `fs-review pr <URL>` or a request to inspect PR comments. Default is read-only.
`fs-review pr <URL> learn` requests project-local evidence/candidate recording, not a
public contribution, product edits, approval of a plan, or posting a GitHub comment.
Use existing host GitHub tools or `gh`; no new review service or nested model is needed.

## Read the discussion with its code

1. Resolve the repository/PR, base and head commits. Read the task, diff, general
   comments, review summaries, inline threads and replies (paginate each collection).
   A PR body or `gh pr view --comments` alone can omit inline review threads. Track
   comment URL/ID, author, timestamp, original commit/path/line and whether it is outdated.
   Use an isolated checkout or committed file reads; never reset a user's worktree.
2. Read the code at the comment's original revision, then the current revision when
   different. Trace relevant callers, event/state lifetime, input ownership, errors,
   consumers and tests. A resolved thread or merged PR does not prove a claim true.
3. Separate factual assertions, project preferences, proposed remedies and confirmed
   owner decisions. Search existing project decision summaries and applicable FS
   knowledge; inspect only matching records/body windows. Reuse a still-applicable
   decision, cite its scope, and do not ask its already answered question again.
   New scope, contradictory requirements or obsolete evidence require reinspection.

## Judge before learning

For each material claim return one disposition with its reason:

| Disposition | Required reasoning | Next action |
| --- | --- | --- |
| `reusable` | Supported causal claim, applicability, legitimate exception, evidence and a way to check it | Propose a conditional shared-knowledge candidate |
| `project-only` | A confirmed scoped preference/contract; not a universal technical requirement | Reuse in this project; retain decision-maker and reconsideration conditions |
| `needs-context` | A missing fact or owner intent can change the choice | First inspect available evidence, then ask one bounded material question |
| `rejected` | Counterexample, incorrect premise, disproportionate remedy, or contradiction with current requirements | Explain the failure; do not promote it |

The user's assertion is not automatically correct. Distinguish "valid preference"
from "proved technical advantage". Check primary technical sources or an executable
counterexample when necessary. For example, extracting methods into a class does not
by itself establish open/closed compliance; compare real extension points and callers.
Repetition can nominate a candidate; three repetitions, likes or agreement are not proof.
Do not universalize a remedy while omitting its original failure condition.

Use a small proposed record, not a transcript dump:

```text
Claim / disposition / reason
PR and comment URLs, original/current commits, relevant code evidence
Observed condition → consequence → proposed choice (including keeping the code)
Owner decision and exact supplied confirmation, or explicitly unconfirmed
Applies when / exceptions / supersedes / reconsider when
Verification actually performed / limitations / unresolved question
Candidate trigger → follow-up investigation → expected and forbidden matches
```

Only authorized `learn` recording uses `save_project_record(kind:evidence)` and its
current hash. Save confirmed decisions with `kind:decisions`; proposed remedies stay
evidence. Preserve prior reasons when superseding a decision. Rejected claims may be
retained locally as rejected with their counterexample, never as accepted guidance.
Read-only review returns this compact proposal without incidental memory writes.

## Shared knowledge remains reviewed knowledge

An authorized shared `fs-knowledge add` makes a pending contribution. Do not transmit
private PR text or project contracts merely because the user requested local learning.
An explicitly selected local-only FS source checkout is an alternative to public add.
The maintainer selects active; source review checks truth, scope and counterexamples;
only currently approved active (merged) sources enter sync. Existing source review
can reject the candidate even when this PR review proposed it. A technical source
review does not turn a project preference into a common mandatory rule.

On sync, connect only observable code signals or cited semantic interpretations to
the candidate. Conditions and exceptions govern applicability after retrieval. New
mandatory obligations still need the owner's exact approval. Never directly rewrite
learned/index.json from a PR comment or silently override existing project decisions.
