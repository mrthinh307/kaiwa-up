<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Web — Next.js App Router (`apps/web`)

Extends the rules in the root `AGENTS.md`.

## Stack and boundaries

- Use Next.js App Router, TypeScript, and Tailwind CSS.
- Treat `apps/web` as an HTTP client of `apps/api`; never import Python or backend implementation code directly.
- Use `@kaiwa-app/api-client` for shared API contracts and generated client code. Do not duplicate generated request or response types locally.
- Do not introduce a shared design-system package unless explicitly requested.

## File conventions

- Place all routes under `src/app/` using folder-based routing.
- Use Server Components by default. Add `"use client"` only when interactivity, React client hooks, or browser APIs require it.
- Keep page-specific components close to their route. Put reusable web-only components under `src/components/`.
- Use route-segment conventions such as `loading.tsx`, `error.tsx`, and `not-found.tsx` where the route needs those states.

## Imports and TypeScript

- Use the `@/*` alias for modules within `apps/web/src`.
- Once generated, consume FastAPI contracts and client functions through `@kaiwa-app/api-client`; do not duplicate generated request or response types in `apps/web`.
- Prefer `import type` for type-only imports and follow the configured ESLint import ordering.
- Keep strict typing; do not use `any` to bypass an API or component contract.

## Rendering and data fetching

- Fetch server data in Server Components, Server Actions, or Route Handlers. Do not use `useEffect` for initial server data loading.
- Keep Client Components small and push their boundary as far down the component tree as practical.
- Start independent requests before awaiting them and use `Promise.all` where appropriate to avoid request waterfalls.
- Use `loading.tsx` for route-level loading and `<Suspense>` for granular async boundaries with meaningful fallback UI.
- The project currently uses the caching model configured by `next.config.ts`; do not enable Cache Components or add `cacheComponents: true` unless explicitly requested.
- In the current model, do not assume `fetch` responses are cached. Choose caching and revalidation deliberately based on the data's freshness requirements.
- Prefer tag-based invalidation over path-wide invalidation when cached data has a stable domain identity.

## Errors and mutations

- Represent expected failures as typed results that the UI can render. Let unexpected rendering failures reach the nearest `error.tsx` boundary.
- Validate mutation input on the server before calling the API.
- Use optimistic UI only when rollback or reconciliation behavior is defined.
- Automatically retry only idempotent operations. Do not retry mutations unless an idempotency strategy is explicitly implemented.
- Always provide an intentional pending, empty, error, and success state when they apply.

## Styling and assets

- Prefer Tailwind CSS utilities. Keep shared theme tokens and global base styles in `src/app/globals.css`.
- Avoid inline styles and arbitrary hardcoded colors when a Tailwind token or CSS custom property can represent the value.
- Build mobile-first responsive layouts and preserve semantic HTML.
- Follow the existing CSS-based color-scheme strategy; do not add JavaScript media-query logic for dark mode.
- Use `next/image` for application images with explicit dimensions or `fill` plus a correctly sized container.
- Use `next/font` for application fonts and configure shared fonts at the root layout level.
- Avoid moving large dependencies into the client bundle. Use `next/dynamic` when a heavy client-only component benefits from lazy loading.

## Security

- Treat browser input, URL parameters, cookies, headers, and API responses as untrusted at their boundary.
- Perform authoritative authentication, authorization, validation, and rate limiting in FastAPI or the infrastructure layer. Client-side checks are never sufficient.
- Use Next.js Proxy only for lightweight routing decisions or optimistic redirects, not as the sole authorization layer.
- Keep secrets and privileged API credentials in server-only modules. Never expose them through `NEXT_PUBLIC_*` variables.
- Apply CSRF defenses appropriate to the authentication design; SameSite cookies alone are not a universal CSRF solution.

## Verification

- Run `pnpm lint:web` after web code changes.
- Run `pnpm build:web` when changes affect routing, rendering boundaries, configuration, or production behavior.
- Run `pnpm format:check` for changes that span multiple files.
- Do not introduce a web test framework or require web tests unless explicitly requested.

## Do not

- Do not add the Pages Router or use `getStaticProps`, `getServerSideProps`, or `getInitialProps`.
- Do not import implementation code from `apps/api`.
- Do not create broad Client Components merely to access a hook in one small interactive subtree.
- Do not duplicate instructions already covered by the bundled Next.js documentation; consult the version-matched docs as directed by the generated block above.
