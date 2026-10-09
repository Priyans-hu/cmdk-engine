---
'cmdk-engine': minor
---

New `cmdk-engine/adapters/sitemap` entry with `sitemapToCommands(sitemap, { params })`. It turns the `command-routes.json` written by `cmdk-engine scan` (or its `routes` array) into commands for `useCommandRegister`, one `{ id, label, keywords, group, href }` per route. `params` fills `:name` segments, for example `{ locale: 'en' }` for `/:locale/billing`, and `''` drops a segment. Routes with an unfilled segment or a catch-all are skipped. Ids keep their placeholders, so frecency is shared across locales.
