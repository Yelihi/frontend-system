# Main context and request-plan implementation

- Date: 2026-09-30
- Authorization: user requested “네 이제 구현 시작해주세요” after the v0.5 direction and current state were summarized.
- Base HEAD: fb73be94b912d047754451b46e3d0db9a137f996. Results below include uncommitted working-tree changes.
- Existing knowledge sync, verification-tool documentation, CI artifact settings and design previews were preserved. This change does not approve or migrate the repository's old root revision/execution records.

## Implemented

- Main context: read local main's tracked Git objects and manifests without checkout. Page source/doc contents; keep working changes separate. Save project.md against the inspected commit and current document hash; preserve init.md and prior project.md versions. Report missing/unversioned/current/pending/stale/failed states. Generated workflow documents do not cause refresh loops; config.json and product/test/config changes remain relevant.
- Request plans: plans/<plan-id>/plan.md contains design and generated issue contracts. Each plan has independent version/approval, execution, progress, checks, attempts and reviews. Approval binds plan ID, version, design, policy and issues. Legacy root records remain readable when planId is omitted.
- Contract validation: reject duplicate/unknown/cyclic issue dependencies, unknown/unmapped checks and unsafe IDs. Execution preserves approved titles, file scope, dependencies and required checks. Manual plan edits invalidate approval; progress does not change the design. Existing stale-source, dependency, attempt-budget and semantic-review requirements remain in force.
- Stage checks: baseline selects lint/typecheck and unit/integration (test fallback per package); issue selects its pinned checks; delivery runs all policy scripts. Technical → boundary → behavior → browser → build ordering. Approved aggregate behavior checks can complete without fabricating child executions; baseline evidence cannot serve as final verification.
- MCP/CLI: list/select plans, main snapshot/source/document reads, refresh status, scoped workflow/check tools and --plan/--stage/--issue support. Bundled MCP regenerated.
- Four public skills: main-context workflow, issue contracts, stage timing, measurement review and authorized plan/work routing, original-repository knowledge contributions. No new public skill or dependency.

Procedure: [project-plans.md](../../references/project-plans.md).
Regression coverage: [plans-project.test.ts](../../test/plans-project.test.ts).

## Executed verification

- `npm run check`: typecheck, lint, build and 45 tests passed; no failures/skips. Includes new plan isolation, approval-version binding, missing/cyclic dependencies, symlink escape, issue contract preservation, stage selection, main/working-tree separation, stale save rejection, refresh state, history preservation, MCP/CLI integration and aggregate-script completion checks. Existing reliability regressions also passed.
- `npm run build` after the final CLI usage-text update: passed; regenerated distribution/bundle.
- `npm run test:package`: passed. Four public skills, raw-knowledge exclusion, and standalone bundled MCP including the new tools confirmed.
- `npm run test:frontend`: acceptance passed; valid fixtures accepted and hooks/accessibility/import/re-export/dynamic boundary/domain/server-only mutations rejected. Chromium E2E: 1 passed, covering repeated submit blocking, failure reporting and successful retry.
- Actual repository `fs project-snapshot .`: read local main commit fb73be9… and 662 tracked files, reported working changes separately and missing canonical project.md. It did not rewrite this repository's historical context or claim the new implementation is already committed to main.
- Skill frontmatter and referenced paths validated using the fixture's existing js-yaml. `quick_validate.py` could not run because Python PyYAML is absent; that validator is not reported as passed.
- `git diff --check`: passed.

## Boundaries

GitHub CI, remote artifact upload, installed plugin-cache update, push/PR/merge and external tool connections were not executed. The host invokes the main-document refresh after an authorized merge; no continuous AI bot, credentials or CI write permissions were configured. Main means the selected local ref; no implicit remote fetch occurs.

Semantic domain/event interpretation and runtime report interpretation remain host tasks. Evidence links can retain actual runner titles and reports; there is no new generic test-report parser, test.md generator, browser measurement server or integrated diagram editor. Review/knowledge routing was updated in skill instructions; improvement quality and token savings were not measured.

The checks establish local behavior for the exercised contracts and fixtures, not correctness across every consumer project or production backend. E2E uses the existing mocked API and local Next development server.
