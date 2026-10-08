# v8 actual comparison

| Arm | Stage | First / final | Eligible | Tokens | Uncached input + output | Seconds | MCP errors |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: |
| ordinary | initial | 97/97 / 97/97 | True | 722771 | 72147 | 245.474 | 0 |
| ordinary | variants | 97/97 / 97/97 | True | 611465 | 39689 | 152.113 | 0 |
| ordinary | defaults | 97/97 / 97/97 | True | 673666 | 44290 | 163.758 | 0 |
| informed | initial | 97/97 / 97/97 | True | 507436 | 39596 | 187.971 | 0 |
| informed | variants | 97/97 / 97/97 | True | 496431 | 36783 | 172.797 | 0 |
| informed | defaults | 97/97 / 97/97 | True | 449149 | 35069 | 127.332 | 0 |
| fs | initial | 97/97 / 97/97 | True | 2376490 | 169642 | 579.160 | 2 |
| fs | variants | unknown / unknown | False | None | None | 147.981 | 1 |

| Arm | All 3 eligible | Cumulative tokens | Uncached input + output | Seconds |
| --- | --- | ---: | ---: | ---: |
| ordinary | True | 2007902 | 156126 | 561.345 |
| informed | True | 1453016 | 111448 | 488.1 |
| fs | False | None | None | None |

Task-contract scores, not hidden preference obedience. Ordinary vs informed measures document-location guidance; informed vs FS adds workflow. Incomplete cumulative costs remain unknown. No statistical superiority from one run.
