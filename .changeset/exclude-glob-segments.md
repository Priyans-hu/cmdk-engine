---
'cmdk-engine': patch
---

Behavior change: `exclude` globs, in the CLI config and in `scanRoutes(routes, { exclude })`, now follow standard glob rules: `*` matches within one path segment and `**` across segments. `/_*` now excludes `/_internal` (the `init` template and README pattern did nothing before), and a `*` in the middle (`/users/*/settings`, `/*/edit`) no longer excludes every route under its prefix. `/admin*` now also matches `/administration`; write `/admin/*` to exclude only `/admin` and the paths below it. Globs ending in `/*`, exact strings, RegExp patterns and the default exclusions give the same results as before.
