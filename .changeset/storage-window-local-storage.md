---
'cmdk-engine': patch
---

`createLocalStorageFrecencyStorage` and `createSearchHistory` now read and write `window.localStorage` only. Before, they checked `window.localStorage` but wrote to the bare `localStorage` global, so where the two differ (Node 25+ defines its own global `localStorage`, and a test DOM can set up `window` by hand) frecency and search history were silently not saved. A `null` `window.localStorage` now counts as unavailable.
