# Server request state and hydration ownership

Authored conditional design note for this experiment, not a universal standard.

A process-wide mutable store is not a server request scope. Trace concurrently rendered callers, serialization and browser startup separately. Request isolation and browser persistence are different decisions. Hydration should reconcile against an explicit server snapshot contract rather than silently loading whichever store wins last. Guest-to-account cart merge is a product choice involving duplicates and authority, not a technical default; logout and storage failure also need bounded behavior. Do not prescribe a client state library, persistent storage or cross-tab synchronization without a need. Read-only shared configuration can remain process-wide; do not mechanically recreate every dependency per request.
