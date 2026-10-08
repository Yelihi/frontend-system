# pricing-console

Plan separation of pricing policy from the quote screen so a second sales workflow can reuse it. Keep transport injectable and identify policy decisions before choosing abstractions. Do not add dependencies or implement.

The API returns decimal strings; the current UI maps them to Number. Quotes support fixed and percentage promotions. Signed server quotes are not yet part of the API. Tax order, rounding, invalid promotions and quote freshness are undocumented.
The task is planning only. Do not implement, install dependencies or execute product code. A working code pattern is evidence of behavior, not proof the owner wants it preserved. Keep decisions and unknowns explicit.
