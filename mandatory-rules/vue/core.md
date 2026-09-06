# Vue mandatory rules

## Preserve reactivity semantics

Do not mutate props. Use computed values for derivation and watchers only for side effects.

## Clean up effects

Dispose subscriptions and other external effects with the component or composable lifecycle that owns them.

