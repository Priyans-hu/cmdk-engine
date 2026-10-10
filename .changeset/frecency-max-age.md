---
'cmdk-engine': patch
---

Behavior change: `frecency.maxAge` (default 30 days) now applies. The "Recent" group hides commands last used longer ago than that, and recording a selection removes those entries from storage. Before, `maxAge` was never applied, so a command used months ago could still show under "Recent". Set a larger `maxAge` to keep older entries.
