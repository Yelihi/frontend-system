# Page and route explorer

Use this packaged renderer for the route/page/component view: route overview first,
wheel zoom and pan, hover/focus relationships, then a selected event or lifecycle flow.
Flow descriptions precede function names; state changes retain concrete owners/fields.
It complements the persisted FS logical flow export; it does not replace its evidence,
freshness, design approval or implementation gates. Rendering and interaction use no model calls.

## Inputs from the actual project

Read the compact [input example](page-flow-input.json) for field shape, not its sample
behavior. Never show that example as the user's project. Map current saved flow IDs,
node contracts, evidence and ordered scenarios into a view model. Preserve stable IDs.
For observed views, supply `baseline.commit` and `baseline.flow: {id, hash}` from the
verified snapshot and saved flow. Recheck freshness with FS tools before rendering;
the script checks structure and pinned identity, not the current project's Git contents.
For an aggregate, preserve all contributing flow references in `baseline.flows` too.

- `nodes`: page/component/module/cache/store/service/external definitions; each has
  `id`, `kind`, `name`, `parent`, `props`, `state`, `events`, `lifecycle`, `signature`,
  `intent`, `evidence`. Non-page/component nodes need `environment: app|backend|external`.
  Optional `framework: {name, execution, reason, hooks}` records concrete framework facts.
- `pages`: `{id, title, route, domain?, scenes}`. A route pattern is one page definition,
  not one node for every parameter value. `domain` is an explicit grouping; the fallback
  first path segment is a navigation aid, not inferred domain knowledge.
- `instances`: `{id, node, page, parentInstance?, entityKey?}` for rendered component uses.
- `navigation`: explicit `{id, from, to, label, condition, basis, evidence?}` page-ID edges.
  Observed navigation requires evidence. Do not infer navigation from shared-state effects.
- `scenarios`: `{id, title, category: event|lifecycle, basis, steps}`. Each step has
  `{id, fromNode, toNode, page, scene, label, effect, changes?, guard?, measurement?, evidence?}`.
  `label` is the concrete handler/call; `effect` is its domain explanation.
  Each change is `{ownerNode, owner, field, before, after}`. Distinguish measured values
  from source interpretation. For a propagation group, add `ordering: unordered-consumers`
  and `effects: [{fromNode, toNode, page, scene, fromInstance?, toInstance?}, ...]`;
  it expresses shared causation, not measured concurrent commits.
- `browserApis`: optional `{name, ownerNode, detail}` referring to an app node.

Include recorded initial/mount/update/cleanup and success/failure flows relevant to the
scope. Missing behavior stays missing; do not manufacture lifecycles or framework hooks.
Names/IDs from different records must be reconciled once; don't silently merge incompatible
nodes. IDs and scene keys use letters, numbers, underscores and hyphens, starting with a letter.

## Generate in the target project

Write the authored view model under the target project's `.frontend-system/diagrams/`.
Do not modify the installed plugin cache. From any working directory:

```sh
node <plugin-root>/skills/fs-plan-visualize/scripts/build.mjs \
  <target-project>/.frontend-system/diagrams/page-flow.json \
  <target-project>/.frontend-system/diagrams/page-flow
```

The output directory contains `index.html`, `rendered-model.json`, and
`capture-input.json`. Link the actual output, not an FS repository preview URL.
The HTML works offline; its model link needs the adjacent JSON file. Changes must be
made to the authored input and rerendered, not patched into generated HTML.

## Screens, not invented UI

Without screen assets, the viewer explicitly shows an uncaptured page. It never creates
a sample product screen from a matching route ID. Capture authorized local project pages
with an available browser tool; use the same page/scene state and viewport. Map actual
component regions using code evidence plus DOM measurements. If browsing is unavailable,
deliver the structural model and state that screen capture is missing.

Place `assets.json` in the output directory, then rerun the same command:

```json
{
  "specHash": "from capture-input.json",
  "templateHash": "from capture-input.json",
  "screens": {
    "page-id:scene-id": {
      "image": "data:image/png;base64,...",
      "width": 760, "height": 570,
      "regions": [{"instance":"component-instance","x":0.1,"y":0.1,"width":0.6,"height":0.3}]
    }
  }
}
```

Regions are normalized 0..1. Hash mismatches reject stale assets. Recheck/recreate the
captures and mapping before rebinding them to new hashes; never relabel stale screenshots
as current. Proposed views on existing screenshots explicitly show a baseline-screen label.
Keep PNG/base64 and full HTML out of ordinary AI planning context; read the small model instead.

## Add a feature to a baseline

Keep the original view model. An optional third argument names an addition JSON:
`{id, title, baseHash, nodes?, pages?, instances?, navigation?, scenarios}`. Compute
`baseHash` with `modelHash` exported by the adjacent `compose.mjs` from the raw base model.
Existing IDs cannot be replaced, and additions are always proposed. A changed baseline
requires review, not automatic repinning. Render the combined model into a separate output
directory and show planned flows beside observed ones. This is not user approval.
Updates/removals and automatic promotion of implemented plans into observations are not
supported by the add-only composer; refresh the observed model after reviewing actual code.

## Verification and scope

Check route selection, one normal/error/lifecycle path, cross-page consumers and state
ownership against the source or approved design. Verify images visually if tools permit.
This renderer has structural/package tests and prior browser checks, including a synthetic
60-route/182-edge smoke check. It is not a complete automatic code analyzer, runtime debugger,
or a benchmark for thousands of nodes. Report those boundaries without adding blocking approval.
