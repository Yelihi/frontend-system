# React mandatory rules

## Preserve render purity

Do not perform side effects during render. Keep effects synchronized with external systems and clean them up when their lifetime ends.

## Follow hook invariants

Call hooks unconditionally at component top level and keep dependency lists consistent with reactive values used by the effect.

## Keep state ownership explicit

Place state at the narrowest shared owner and avoid duplicated sources of truth.

