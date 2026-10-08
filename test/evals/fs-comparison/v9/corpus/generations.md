# Async result ownership — identity is not credential bytes

This authored learning note is conditional guidance, not an assertion about every host.
A request can outlive the logical identity or tenant for which it started. Comparing
its captured token to the current token does not prove identity continuity: a host may
replace a session with the same token value. Conversely, credential rotation can occur
without a logical identity change. Trace the host replacement contract and ask what
invalidates outstanding work before choosing an epoch/generation mechanism.

If replacement represents a new logical context even when credential bytes match,
pin a generation at dispatch and reject obsolete outcomes before every side effect:
items, messages, pending changes and auth expiration, including after an awaited body
parse or a rejection. Scope this generation to the actual identity owner; independent
panels must not invalidate each other. Distinguish session invalidation from latest-
request ordering within one session, and from disposal of a view. Abort is useful for
resource cleanup but is not proof a callback cannot finish.

If the host guarantees same-value replacement is identity-preserving, do not force an
epoch increment on every replacement. Preserve that contract and define the actual
invalidation event. Ask only where the code/contracts do not settle the semantics.
Useful tests include same-token replacement, delayed body parsing, stale 401, a rejected
old request, overlapping latest requests, and disposal. A test matrix should reflect
chosen policy, not assume all these cases require the same behavior.
