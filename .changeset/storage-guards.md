---
'cmdk-engine': patch
---

Fix `CommandEngineProvider` crashing the app when reading `window.localStorage` throws, as in sandboxed iframes and browsers that block cookies: frecency and search history now fall back to memory there.
Malformed data under the frecency or search-history `localStorage` keys (such as another app's data) is now ignored and replaced on the next write instead of throwing.
