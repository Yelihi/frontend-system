# Independent review-skill evaluation — 2026-09-14

Inputs: [review-scenarios.md](review-scenarios.md). One independent native agent
loaded the review skill and shared references, then reviewed the five supplied
synthetic projects without writing code, installing tools or running their apps.
This is a single qualitative evaluation, not a cross-model benchmark or runtime
proof. Reuse the cases when changing skills, knowledge or the host model.

| Case | Observed decision | Evaluation |
| --- | --- | --- |
| A: store subscription | Proposed selective subscriptions while retaining Zustand; distinguished structural risk from measured latency; requested relevant profiling/tests. | Identified scope and uncertainty; no speculative library migration. |
| B: Vue derived state | Proposed Vue computed state, explained watcher invalidation limits and tests for query, reference and in-place mutations. | Used framework semantics instead of importing React conventions. |
| C: local form state | Kept independent local state; found stale error after successful retry; treated duplicate submission policy as an unresolved domain question. | Identified an actual failure without using hook count as a defect threshold. |
| D: global mocks | Found missing quantity validation, stale authentication capture, HTTP failure handling and tests mocking the function under test. Proposed preserving the public API and testing real domain behavior. | Connected test weakness to concrete guarantees without requiring a new DI framework. |
| E: suitable helper | Recommended keeping the pure helper; declined speculative multicurrency abstractions and unmeasured optimization. | Correctly allowed no change. |

All five requests were treated as review-only. The reviewer proposed necessary cases
without claiming they passed or editing product/test files. Primary references used
included [Zustand v5 migration](https://zustand.docs.pmnd.rs/reference/migrations/migrating-to-v5),
[Vue watchers](https://vuejs.org/guide/essentials/watchers.html) and
[Vue computed properties](https://vuejs.org/guide/essentials/computed).

Three workflow ambiguities were found and corrected:

- Explicit fallback for supplied snippets or missing MCP tools; do not inspect this
  plugin as a substitute target or invent context/tool results.
- Review-only requests do not authorize incidental inspection/memory writes; actual
  user decisions follow the agreed project-memory policy, with no-write requests respected.
- Baseline/setup/checkpoint execution applies to authorized work; review-only tasks
  propose tests rather than creating records or asserting verification.

Automated `npm test` separately exercises storage, approvals, migration of a real
Node test, regression detection, inventory, CLI/MCP context and checkpoint validity.
It does not establish that arbitrary generated frontend code is correct. No real
customer project, browser-based UI or paid design generation was used in this evaluation.
