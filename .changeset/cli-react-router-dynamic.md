---
'cmdk-engine': patch
---

Behavior change: like the runtime `scanRoutes`, the React Router CLI scan now skips routes with a `:param` (`/users/:id`) unless the route declares its own `handle.command`, and always skips catch-all routes (`/docs/*`). To keep `:param` routes, set `includeDynamic: ['id']` (or `true`) in the config or pass `--include-dynamic id`, then fill them at runtime with `sitemapToCommands(sitemap, { params })`.
