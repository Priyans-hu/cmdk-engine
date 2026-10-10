---
'cmdk-engine': patch
---

Behavior change: the "Recent" group now fills `recentCount` with the most recently used commands that are available on the current page. Before, it took the `recentCount` most recent usages first and then dropped the ones not registered here, so with page-scoped commands it often showed fewer items or none. Recent may now list different, older commands; nothing needs to change in your code.
