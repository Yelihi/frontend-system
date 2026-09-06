# Common mandatory review rules

## Security review is never skipped

Check changed trust boundaries, authentication, authorization, secret handling, injection risks, and unsafe browser APIs. Scale depth to the change, but do not skip the dimension because user knowledge is absent.

## Preserve accessibility basics

Keep semantic structure, keyboard operation, accessible names, focus behavior, and readable contrast intact for affected user interfaces.

## Verify with discovered capabilities

Use only lint, typecheck, test, build, or e2e commands discovered from the target repository. Do not invent commands.

