---
"cmdk-engine": minor
---

Functional Next.js (App Router) adapter — replaces the previous stub that threw "not yet implemented".

**New entry point:** `cmdk-engine/nextjs` (alias `cmdk-engine/adapters/nextjs`)

**API:**

- `useNextNavigate()` — wraps `next/navigation` `useRouter` for command actions
- `useNextPrefetch()` — exposes `router.prefetch`
- `useNextCommandRoutes(routes, options?)` — registers a sitemap as commands; each command's `action` calls `router.push(href)`
- `<NextCommandRoutes routes={...} />` — composition wrapper around the hook
- `usePrefetchOnHover()` — factory for hover-prefetch handlers

**Input:** accepts the `Sitemap` produced by `cmdk-engine scan`, a `SitemapRoute[]`, hand-authored `NextRouteLike[]`, or any `{ routes: [...] }`-shaped object.

**Options:** `prefetchOnMount`, `defaultGroup`, `transform`.

`next` is declared as an optional peer dependency alongside `react`/`react-dom` — only required when consuming the adapter.
