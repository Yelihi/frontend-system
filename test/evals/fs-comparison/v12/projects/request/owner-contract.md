# Supplied requirements
Refactor the existing request boundary without new dependencies. Preserve caller-owned
input objects and headers on both success and failure. Validation failure must not
send a request or write the cache. Keep page-owned error display and list subscription cleanup.
Order POST must make at most one transport attempt; server deduplication is unavailable.
The user can edit quantity while a save is in flight. A successful old save must not
clear newer unsaved input's dirty state. Concurrent submits and multiple writers to
orders.rows are not supported in this release; do not invent a concurrent edit product.
The current session-expired classification is required for interactive requests.
No implementation, approvals or main refresh after implementation are authorized in this exercise.
