# offline-uploader

Plan a reusable file upload queue for two independent workspaces. Keep the existing injected sender and public enqueue/cancel operations. Clarify retries, cancellation and workspace lifetime before implementation.

A send may commit remotely and then reject locally. The sender currently has no idempotency key or cancellation acknowledgement. Workspace credentials can change while uploads are pending. The product name does not promise an offline service worker.
The task is planning only. Do not implement, install dependencies or execute product code. A working code pattern is evidence of behavior, not proof the owner wants it preserved. Keep decisions and unknowns explicit.
