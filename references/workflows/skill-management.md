# Managing skill sources and versions

Use the existing skills/, per-skill references/, shared references/workflows/ and
release-manifest.json. Keep project decisions in the consuming project's records.
A skill is a procedure, learned knowledge is evidence for judgment, and the harness
records execution and checks. Do not publish each skill as learned knowledge or turn
an imported preference into a global mandatory rule.

## Source editing

Choose an explicit FS Git checkout (repositoryRoot). Management
writes reject installed plugin caches and non-FS repositories. Use get_skills to
inspect descriptions, selected closure hashes and broken references. The writer
preserves full frontmatter: supply the entire intended SKILL.md, not only its body.

For add/import/update, prepare supporting resources using normal host filesystem
editing, then save_skill with name, content and current expectedHash. For a new entry
use null. Keep folder and frontmatter names equal. Required metadata supports plain,
quoted or folded/literal block scalar strings; unsupported syntax fails explicitly.
References must stay in packaged skills/, references/ or mandatory-rules/; no symlinks.
External web links remain links and are not fetched or executed by these tools.

Import only after checking the upstream source and its license/notice requirements.
Supply origin.url, exact origin.revision, origin.license and origin.attribution; retain
required license/notice files alongside the skill. The tool preserves these fields,
not their legal correctness. Unclear provenance remains an unresolved import proposal.
First-party FS skills do not need an invented upstream origin.

Do not move tests, adopt FSD, introduce a DI library, or reopen a settled design merely
because an imported skill does so. Retain applicable expertise and remove redundant
pipeline instructions. See the [ai-skills assessment](ai-skills-integration.md) before
migrating that repository; it is a disposition plan, not an authorization to copy all.

## Selection and resumption

The host selects skills from their name/description and the actual request. get_skills
provides candidates; it does not autonomously choose or invoke a skill. Prefer explicit
user selection and the fewest relevant procedures. Ordinary task execution does not
require the skill-maintenance workflow or a full design cycle.

pin_skills stores the selection reason and a frozen copy of each selected skill's
resources and linked local guidance under `.frontend-system/skill-runs/<id>/files`.
It records package version and release manifest hash when present. get_skill_run
checks the immutable receipt hash and all frozen file hashes on resume. Read that
snapshot, not updated installed paths. It remains usable when the original installation
is replaced. A missing or corrupted snapshot requires repair or an explicit migration;
never substitute latest guidance. These records do not freeze models, tools, runtime
permissions, external state or unrelated global instructions.

## Evaluation and publication

Keep case inputs/rubrics in `test/evals/skills/<name>.json`. Keep outcome artifacts
separate from the inputs. Check successful use, wrong-task non-selection, small-task
scope, unsupported tools and uncertain external writes. Report omission, fabricated
facts, duplicate writes, repairs, time and tokens when actually measured.

Structural validation checks metadata, references and file identities. Behavioral
assessment requires actual output/trace artifacts and a host/user judgment. Record
observations with save_skill_evaluation with expectedHash for the skill and expectedCaseHash for the case
file. Missing cases stay not-run; stale artifacts or changed inputs are rejected.
A saved report is not automatic proof of behavior, approval, installation or release.
Do not mark authored examples or mock traces as independently executed model results.

Capture failures as local candidates; sanitize private project/issue data before
sharing a fixture. Change one demonstrated cause, compare against the previous skill
on relevant frozen cases, then check unrelated representative cases. Do not convert
one incident into an unconditional rule. Paid model evaluation and live connector
mutations require appropriate task authorization; the normal CI performs no such calls.

Use the existing build, package checks and explicit release process. Update descriptions
and relative links together. New releases apply to new runs; existing runs retain their
snapshots. Do not edit installed caches, auto-install updates, or change project rules
as a side effect of saving a skill.
