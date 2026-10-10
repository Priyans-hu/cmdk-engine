---
'cmdk-engine': minor
---

CLI: new `includeDynamic` config option and `--include-dynamic [names...]` flag. They keep routes with `:param` segments in the sitemap, for example everything under a Next.js `[locale]` folder: `includeDynamic: ['locale']` gives `/:locale/billing`. Fill the segments at runtime with `sitemapToCommands(sitemap, { params: { locale } })`. `true` keeps every `:param` route; catch-all segments are never kept. The flag overrides the config value.
