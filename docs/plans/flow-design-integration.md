# Flow design integration

Approved scope: one structured design feeds the visual explorer and implementation plan.
Preserve existing working-tree knowledge changes. No release is implied by this task.

- [x] 1. Structured scenes, contracts, knowledge judgments, cases and plan binding
- [x] 2. Deterministic explorer projection and knowledge/architecture inspector
- [x] 3. Actual-page capture manifests and no-image proposed wireframes
- [x] 4. Iterative requirement/design feedback and plan handoff
- [x] 5. Work verification, regression checks and documented usage

Each step receives focused checks before the next. Existing records remain readable.

## Verification and repeatable browser check

- `npm run check`: typecheck, lint and 160 tests passed after the final code changes.
- `npm run test:package`: installed-package MCP/skill smoke passed without raw knowledge.
- Four modified skill entry points passed skill-creator's frontmatter validation.
- Chromium: actual Next fixture idle/loading/error/success captures, scenario selection,
  no-image wireframes, cross-page state projection, learned/version and test-intent display,
  draft without scenarios, keyboard navigation, 1440px/390px viewport overflow checks.
- The browser test injects HTTP 500/200 responses. It does not validate a production
  backend, semantic learned applicability, other browsers or token savings.

To repeat after `npm run build` (using the existing frontend fixture dependencies):

```sh
# Terminal 1
npm --prefix test/fixtures/frontend run dev
# Terminal 2
node scripts/check-flow-design.mjs
```

The script prints temporary actual-page/wireframe HTML paths and writes report.json
with source hashes and screenshots. It preserves the project and source fixtures.

## Changed responsibilities

- `flow-schema.ts` / `flow-contracts.ts`: canonical scenes, state transitions, architecture,
  scoped learned judgments, test intent; validate exact plan adoption.
- `page-flow-view.ts` / explorer scripts: project canonical data into the viewer; verify
  capture manifests and show missing captures explicitly. No second authored semantic graph.
- `project-flows.ts` / `project-report.ts` / `render-project-flow.ts`: freshness and automatic
  report rendering with compact model/capture sidecars. Generated captures do not invalidate code.
- `workflow-store.ts` / `work-review.ts` / CLI: pinned contract/knowledge/test linkage and
  post-implementation comparison inputs. These checks cannot certify semantic correctness.
- Shared design-flow workflow and four skill entry points: iterative short-request dialogue,
  no-image drafts, scoped revision, local feedback versus shared knowledge review.

Existing flow records retain the legacy renderer. Korean structured page records use the
page explorer; explicit English rendering retains the existing logical-flow view.
Deployment and plugin installation are a separate step; this task does not publish.


## Release scope — 0.11.0

The owner selected feature-first delivery. This release retains the previously published
knowledge catalog and learned references; pending source/code-example review changes stay
in the original development worktree. No unreviewed knowledge was marked approved to release.
The isolated release passed typecheck, lint, 161 automated tests, package smoke and
release readiness. It also reran the canonical, legacy and image-led browser checks.
