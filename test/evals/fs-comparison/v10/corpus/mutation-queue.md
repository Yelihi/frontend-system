# Mutation uncertainty and queue lifecycle

Authored conditional design note for this experiment, not a universal standard.

A rejected upload can have committed; replay safety requires an actual server idempotency contract, not a retry helper. Distinguish cancellation of undispatched jobs, suppression of local notifications, and confirmed remote cancellation. Define per-owner versus global concurrency and backlog lifetime before sharing a queue. Capture credentials and mutation inputs according to the chosen owner contract; a token refresh is not automatically a workspace change. Pending counts, failures and acknowledgements all need lifetime rules. Do not add durable offline storage, chunking protocols or service workers just because uploads are asynchronous. Verify two owners, cancellation after dispatch, uncertain failure and close during work without promising remote rollback.
