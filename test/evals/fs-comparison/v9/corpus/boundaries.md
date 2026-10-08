# Request policy ownership — conditional design note

This is an authored learning note for this experiment, not a universal standard.
Repeated request syntax is a reason to trace callers, identity owners and error
consumers, not proof that all requests belong in one global client.

If several panels share one identity realm and expiration policy, consider an
instance-scoped common request interface for transport defaults, status classification
and authentication notification. Keep endpoint mapping, user-facing business errors
and domain actions with their domain. A single auth incident may produce multiple
concurrent 401s; whether notification is once per incident/session or per request is
an explicit product decision. Preserve transport injection for deterministic tests.

If panels have independent identities or incompatible expiration behavior, sharing
one mutable auth singleton can log out the wrong panel. Reusing a stateless mechanism
or separate instances can still be suitable. Inspect actual ownership before proposing
shared policy. Existing adequate boundaries and a single simple caller may need no
new abstraction. Do not introduce a query library just because fetch is present.

Retries are a separate contract. Do not infer safe POST replay from a network failure:
a server may have committed before the connection failed. Ask about idempotency only
if automatic retries are proposed or an existing retry is unsafe. Keeping current
no-retry behavior is a valid option. A test should distinguish auth errors, domain
errors, caller cancellation and uncertain transport failure without conflating them.
