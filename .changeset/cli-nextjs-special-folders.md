---
'cmdk-engine': patch
---

Behavior change: the Next.js scanners now emit the URL of an optional catch-all route (`app/shop/[[...slug]]/page.tsx` gives `/shop`) and skip intercepting routes (`(.)photo`, `(..)settings`) instead of emitting their parent's path. The App Router scan also skips every page under a private `_folder`, which Next.js does not route; before, `app/_drafts/pricing/page.tsx` gave `/pricing`. Run `npx cmdk-engine scan` again and review the diff of `command-routes.json`.
