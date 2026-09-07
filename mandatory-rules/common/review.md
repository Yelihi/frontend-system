# Common mandatory review rules

## Security review is never skipped

Check changed trust boundaries, authentication, authorization, secret handling, injection risks, and unsafe browser APIs. Scale depth to the change, but do not skip the dimension because user knowledge is absent.

## Preserve accessibility basics

Keep semantic structure, keyboard operation, accessible names, focus behavior, and readable contrast intact for affected user interfaces.

## Verify with discovered capabilities

Use only lint, typecheck, test, build, or e2e commands discovered from the target repository. Do not invent commands.

## Keep state ownership narrow

Prefer server state or query cache for remote data, URL state for shareable navigation state, form state inside the form, and component state for local interaction. Use global client state only when independent areas truly share ownership.

## Separate business rules from UI mechanics

Keep reusable business invariants testable without rendering a component. Do not impose domain layers on simple presentation code.

## Control asynchronous lifecycles

Review cancellation, stale responses, cache invalidation, optimistic rollback, loading, empty, and error states whenever asynchronous behavior changes.

## Add tests before running checks

Inspect the diff and existing coverage, add only the missing applicable unit, integration, e2e, Storybook, or security tests, then run discovered commands.

## Review dependency and bundle cost

Prefer platform features and installed dependencies. New client dependencies require a concrete need and bundle-impact review.

## Preserve operational visibility

User-visible failures need an intentional error path. Review logging, error boundaries, monitoring hooks, and cross-browser behavior where relevant.
