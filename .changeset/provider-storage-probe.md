---
'cmdk-engine': patch
---

`CommandEngineProvider` now keeps frecency and search history in memory when `window.localStorage` is `null` or rejects writes, so "Recent" and search history keep working for the session instead of silently recording nothing. Storage that is only full (a quota error while it holds data) is still read.
