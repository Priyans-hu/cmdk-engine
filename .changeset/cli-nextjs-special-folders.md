---
'cmdk-engine': patch
---

Behavior change: the Next.js scanners now emit the URL of an optional catch-all route (`app/shop/[[...slug]]/page.tsx` gives `/shop`) and skip intercepting routes (`(.)photo`, `(..)settings`) instead of emitting their parent's path. Run `npx cmdk-engine scan` again and review the diff of `command-routes.json`.
