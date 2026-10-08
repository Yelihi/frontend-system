# Autosave snapshots and conflict ownership

Authored conditional design note for this experiment, not a universal standard.

Autosave combines document identity, edit versions and server revisions; one current object is not all three. Capture immutable save inputs and distinguish a newer local edit from an acknowledged older save. Cancellation cannot undo a server commit. A returned conflict is not permission to overwrite either the local draft or remote document. Ask the owner about recovery and navigation before selecting blocking navigation, local retention or deliberate discard. Two views may intentionally share a draft or be independent; do not introduce a module-global draft singleton by habit. A sequence test should include edit during an in-flight save, navigation during a timer, conflict, and disposal. Do not add offline persistence, queues or collaboration protocols without a requirement.
