# Verification dependencies and CI

Read when planning missing verification, installing check tools, or connecting CI.
Use the smallest toolset that can check the agreed contract; reuse working scripts.

## Ownership

| Location | What belongs there |
| --- | --- |
| FS plugin | Knowledge, rule guidance, setup procedures, script execution and interpretation |
| Target project or its workspace | Compatible checker/test devDependencies, lockfile, configuration, tests and package scripts |
| Execution environment | Node/package manager, browser binaries and OS dependencies, browser extensions |
| Application and operations, when needed | Runtime instrumentation such as OpenTelemetry, collector/service configuration |

Installing a tool inside FS does not establish the target project's verification
environment. Shared workspace tooling is fine when the checked package can resolve
it and CI reproduces that layout. Package-manager/browser caches can share downloads;
they do not replace project-owned versions and configuration. Runtime instrumentation
is not merely a development dependency; decide its application and operational scope.

## Plan, establish, execute

1. Inspect the target's package manager, lockfile, framework versions, scripts,
   configs and existing CI. Map each required guarantee to an existing check or an
   explicit gap. A graph/profiler/trace collects evidence; an assertion or agreed
   threshold supplies the verdict. Keep semantic review for context-dependent choices.
2. In the revision, name only missing tools, their purpose, compatible versions,
   installation location, exact script IDs/commands, prerequisites and evidence.
   Explain meaningful alternatives; resolve version/API uncertainty in official docs.
   Do not propose every tool category by default or duplicate an adequate checker.
3. During authorized work, install in the owning project/workspace with its package
   manager and update its lockfile. Reuse existing authorization. Do not silently fall
   back to FS/global tools or download the latest CLI on each verification run.
   Install required browser/OS dependencies in the execution environment using the
   project's runner version. Review-only work proposes gaps without installing.
4. Run the actual non-watch scripts from their correct working directories. A package
   declaration is not installation; installation is not readiness. Check relevant
   app startup, browser, test data and authentication without storing credentials.
   Prove new guards with valid and intentionally invalid cases, restoring fixtures.
   Bind applicable script IDs/guards/reviews to the existing verification policy.
   Missing tools/environment or unexecuted tests stay not-run/blocked, never passed.

## CI and retained evidence

Use the same project scripts locally and in CI, with compatible Node/package-manager
versions and installation from the committed lockfile (for example `npm ci`). Keep
required checks as failing steps: neither artifact upload nor retries may conceal
their failures. Browser provisioning must match the installed runner. Record material
differences such as OS, browser, dev/production server and mocked/real services.

Prefer the runner's built-in machine-readable report, human report and failure trace
over a custom reporting engine. Retain needed artifacts even when tests fail; scope
paths and retention to avoid uploading credentials or unrelated data. Name CI artifacts
by source revision/run, and link the actual run/artifact in existing evidence records.
For local runs include command, source state, environment, result and retained paths;
include check IDs when FS produced them. A mutable local path alone is not historical
proof. Keep skipped, partial and retried results visible; report creation is not a pass.

Read check summaries first, then relevant failure logs or test cases. Run deterministic
checks before asking the model to interpret remaining ambiguity. Repeated model
agreement does not replace execution evidence or establish a probability of correctness.

Writing CI configuration does not prove a remote run succeeded or make its checks
required for merging. Confirm the actual CI result and applicable branch/ruleset
settings when authorized. Deployment and external-service connections retain their
own project scope and authorization; verification setup alone does not authorize them.

Official references: [Playwright CI](https://playwright.dev/docs/ci-intro),
[reporters](https://playwright.dev/docs/test-reporters),
[browser provisioning](https://playwright.dev/docs/browsers),
[ESLint installation](https://eslint.org/docs/latest/use/getting-started),
[GitHub required checks](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches).
