---
name: fs-skill
description: Manage FS skill sources; list, add, import, update, consolidate and evaluate skills. Use for changes to FS skills, not for performing the task a skill describes or installing unrelated plugins.
---

# FS Skill Management

Maintain one source in an explicit FS Git checkout. The installed plugin is a versioned
consumer; never edit its cache. Installation and authentication remain host concerns.
Use the user's existing authorization and preserve unrelated working changes.

Choose the smallest appropriate operation:

- **List:** `get_skills` reads installed metadata by default; use repositoryRoot for
  a source checkout. Inspect the selected skill and relevant references only.
- **Add/import:** compare existing descriptions before creating an entry. Extend an
  existing skill, add a conditional reference, or keep a project-specific convention
  in the project when that fully solves the request. Create a separate skill only for
  an independently selectable procedure. Read [management](../../references/workflows/skill-management.md)
  for source editing, provenance and evaluation requirements.
- **Update/consolidate:** trace callers and references, preserve supported operations
  and user choices, then change only the demonstrated problem. Do not create an
  automatic chain of skill calls or impose one project's architecture/test layout.
- **Evaluate:** run structural checks and the relevant existing tests. Use realistic
  positive, negative and failure cases from test/evals/skills. Record actual artifacts
  with `save_skill_evaluation`; unexecuted cases remain not-run. This tool records an
  assessment, not an independent semantic judge. Do not run paid model comparisons
  or mutate live external systems merely to evaluate a skill.
- **Release:** only on a release request, use the existing
  [release procedure](../../references/contribution-release.md). Saving, evaluating,
  committing and publishing are distinct operations. Do not archive the old repository
  until its supported uses have replacements and the user requests that transition.

`save_skill` accepts a confined draftFile containing name, full SKILL.md content,
expectedHash (null for a new entry), and optional origin. Preserve existing frontmatter.
Prepare needed resources before saving and read the current skill closure hash; a
changed reference invalidates earlier evaluations. Read the tool schema before writes.
Report paths, checks, assessment limits and whether anything was actually published.
