# Frontend quality priorities

Apply these as review dimensions, not as a demand for every abstraction in every change.

1. Preserve framework intent: rendering boundaries, data flow, caching, routing, bundle size, and hydration behavior.
2. Keep state at the narrowest durable owner. Separate server, URL, form, remote-cache, and ephemeral UI state.
3. Keep business decisions independent from rendering and transport where that improves testability.
4. Prefer cohesive components and existing project conventions over speculative layers.
5. Check accessibility, input validation, trust boundaries, failure handling, observability, race conditions, and cleanup.
6. Match tests to risk: unit for decisions, integration for boundaries, E2E for critical journeys, and Storybook for reusable visual states.
7. Validate build and browser-sensitive behavior using the project's real toolchain.

For Next.js, prefer Server Components and server-side data access by default. Move Client Components to the interactive leaves, and justify client state and effects. Adapt this principle to the installed version and the project's established conventions.
