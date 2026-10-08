# Subscription ownership and reentrant disposal

Authored conditional design note for this experiment, not a universal standard.

A reusable event mechanism need not imply one global audience. Trace who creates, owns and destroys subscriptions and commands. Reentrant removal can alter iteration order; establish which listeners participate in an emission and whether additions or removals take effect immediately. Listener exceptions are a policy boundary: fail-fast and isolate-and-report are different contracts. Duplicate registration and stale cleanup must not remove a replacement accidentally. Keep disposal idempotent and scoped to the owner when the contract requires it. Do not assume event sourcing, a plugin framework or an asynchronous scheduler is necessary. Shared immutable event types remain reusable across isolated hosts.
