# Native action semantics and scoped presentation

Authored conditional design note for this experiment, not a universal standard.

When an action wrapper chooses between a native button and an anchor, inspect the actual caller and form behavior. aria-disabled describes state; it alone does not prevent activation. A disabled link needs an explicit navigation and focus contract; removing href, suppressing activation, and replacing it with text have different keyboard and discoverability costs. Preserve native attributes and accessible names in the chosen API rather than inventing a universal as-anything type. Styling conventions may prefer statically discoverable utility classes or a variant helper; they are team choices, not universal correctness. Root-scoped theme tokens avoid cross-host interference when hosts need independent themes. Do not add a variants dependency for one trivial component or assume all roots require independent themes.
