# Review before creating a PR

Use for `fs-review pre-pr --base <target-ref> [--plan <id>]` and before an authorized
PR creation in FS work. This is a local gate, not a guarantee of bug-free or secure code.
No remote PR/comment/push is authorized by a review request.

## Spend review effort in this order

1. **Safety and correctness (`pr-safety`).** Inspect changed behavior and affected
   callers: reachable error paths (including swallowed errors and false success),
   races/retries/cancellation, input ownership, browser/server trust boundaries,
   exposed secrets and unsafe rendering. Start with existing focused checks. Treat
   excessive rendering as a hypothesis until an actual interaction/measurement or
   concrete loop establishes impact; a hook count is not a defect. Do not claim a
   universal security guarantee. Required runtime evidence that is unavailable stays
   unmet, not a passing review with a footnote.
2. **Domain and scope (`pr-scope`).** Compare the entire PR diff from merge-base,
   including tests/config/deletions, with the approved requirements and decisions.
   Identify missing behaviors, invented features, unapproved abstractions and weakened
   checks. Read consumers beyond the diff when needed; every changed file needs a
   scope finding. Mark out-of-scope behavior as remaining work rather than silently
   broadening the plan to accommodate it.
3. **Maintainability.** Apply relevant approved design/architecture rules. Separate
   mandatory violations from optional improvements; group nonblocking suggestions.
   Do not block solely for a preferred pattern or unrelated refactor. Stop a deep
   optional review while material safety/domain failures remain unresolved.

For each material finding record a location, failure condition, consequence, evidence
and verification need. Reuse fresh investigations and previous answers. No fixed
multi-agent panel, complete corpus dump, full-project rescan or duplicate report.

## Reuse the existing plan, checks and review records

When preparing a plan that will be used for a PR, include `policy.reviews` requirements
with IDs `pr-safety` and `pr-scope`, each linked to nonempty applicable rule IDs. Their
descriptions and rules must state the actual safety/domain obligations, not simply
"review passed". Existing policies without these requirements require an explicit
scoped revision; do not silently alter an approved plan. Ordinary work completion
without PR submission keeps its current behavior.

1. Complete authorized fixes and commit the intended product changes when commit is
   authorized. This committed gate deliberately does not certify an unstaged/staged
   mixed tree. Do not commit just because someone requested a read-only review.
2. Call `check_pr_readiness` with the actual target ref and repository root. Its
   initial `blocked` response supplies `scope` and missing evidence. It uses the
   PR merge-base, not HEAD~1. Confirm the local target ref is current; fetch only
   within task authorization. The gate does not silently fetch a remote.
3. Review the scoped diff and save the two existing semantic review requirements with
   `save_semantic_review`, passing that exact `prScope`. Keep the approved step and
   attempt IDs. Evidence for a deleted file may reference its base revision. Reuse a
   matching passing test record; committing unchanged contents does not require
   rerunning those tests. Failed/unperformed required verification is `remaining`
   and a failed review. This step can be the normal final work review, not a second pass.
4. Complete execution through the existing guarded workflow with these review IDs.
   Call `check_pr_readiness` immediately before the authorized PR creation. A non-ready
   result stops that action. Source/base/head changes require scoped re-review;
   passing tests alone do not replace a missing review. Do not waive required evidence
   or reword a finding merely to make the gate green.

The deterministic CLI uses the same gate and exits nonzero when blocked:

```sh
fs pr-check . --base origin/main --plan <plan-id>
```

If chaining this before `gh pr create`, continue only on exit 0 and only when creation
was already authorized. FS does not intercept arbitrary `gh`, browser actions or
other clients. Local records contain host judgments and are not signed CI attestations.

## CI and enforcement boundary

A `pull_request` workflow runs after PR creation. Configure required status checks
and repository rulesets to prevent **merge**, while FS's local procedure stops its
own **creation** action. A local hook can be bypassed; it is not server enforcement.
Do not install hooks, modify protection or publish a status without that task's authority.
On CI rerun the actual approved checks on the PR revision; never trust an uploaded
`ready` JSON or run untrusted fork code with privileged `pull_request_target` secrets.

References: [GitHub rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets),
[workflow events](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#pull_request).
