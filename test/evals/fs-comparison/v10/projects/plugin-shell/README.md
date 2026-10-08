# plugin-shell

Plan a refactor of the dashboard extension host so two dashboards can load and unload independent extensions. Keep dependency injection and the existing event contracts. Clarify extension failure, disposal and reload policy.

Extensions subscribe to an event bus and register commands. Extensions can unload themselves from inside a callback. The current bus is also imported by two mounted dashboards; no global broadcast contract is documented.
The task is planning only. Do not implement, install dependencies or execute product code. A working code pattern is evidence of behavior, not proof the owner wants it preserved. Keep decisions and unknowns explicit.
