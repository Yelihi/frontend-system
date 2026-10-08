# Portal controllers

A framework-neutral TypeScript frontend embedded in two server-rendered panels.
`mount` wires DOM events; the host calls replacement callbacks after login or tenant
selection. The host integration's replacement semantics are not specified here.
The two endpoints are reverse proxies on the browser's current origin.
// OWNERSHIP

Refactor this code for adding another panel next quarter. Preserve the existing
public controller methods and displayed success/business-error messages. Product
bugs can be identified, but any intentional behavior change must be called out.
No dependency migration, framework rewrite, cache or speculative plugin framework.
The backend's mutation retry/idempotency contract is currently undocumented.
Tests should use injected transport and view doubles; no live backend is available.
Please first inspect the code and ask material questions with evidence and options;
after answers, draft an actionable refactoring plan. Do not implement product code.
