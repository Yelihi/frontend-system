# React mandatory rules

## Preserve render purity

Do not perform side effects during render. Keep effects synchronized with external systems and clean them up when their lifetime ends.

## Follow hook invariants

Follow the installed React version's hook rules. Ordinary hooks stay unconditional
at component/custom-hook top level; React's `use` API has documented exceptions.
Keep dependency lists consistent with reactive values used by the effect. Verify
with the applicable official eslint-plugin-react-hooks rule rather than a blanket
text heuristic for every identifier starting with `use`.

## Keep state ownership explicit

Place state at the narrowest shared owner and avoid duplicated sources of truth.
