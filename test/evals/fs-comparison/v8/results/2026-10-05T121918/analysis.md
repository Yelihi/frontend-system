# v8 actual comparison

| Arm | Stage | First / final | Eligible | Tokens | Uncached input + output | Seconds | MCP errors |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: |
| ordinary | initial | 97/97 / 97/97 | True | 814154 | 80842 | 321.532 | 0 |
| ordinary | variants | 97/97 / 97/97 | True | 523993 | 34265 | 158.543 | 0 |
| ordinary | defaults | 97/97 / 97/97 | True | 598030 | 38158 | 143.908 | 0 |
| informed | initial | 97/97 / 97/97 | True | 655125 | 52245 | 302.290 | 0 |
| informed | variants | 97/97 / 97/97 | True | 547664 | 40528 | 154.540 | 0 |
| informed | defaults | 97/97 / 97/97 | True | 601923 | 40259 | 247.244 | 0 |
| fs | initial | 97/97 / 97/97 | True | 2455915 | 110315 | 529.216 | 1 |
| fs | variants | 97/97 / 97/97 | True | 1223196 | 93084 | 260.956 | 0 |
| fs | defaults | 95/97 / 95/97 | False | 3752909 | 128077 | 548.983 | 0 |

| Arm | All 3 eligible | Cumulative tokens | Uncached input + output | Seconds |
| --- | --- | ---: | ---: | ---: |
| ordinary | True | 1936177 | 153265 | 623.983 |
| informed | True | 1804712 | 133032 | 704.0740000000001 |
| fs | False | 7432020 | 331476 | 1339.155 |

Task-contract scores, not hidden preference obedience. Ordinary vs informed measures document-location guidance; informed vs FS adds workflow. Incomplete cumulative costs remain unknown. No statistical superiority from one run.
