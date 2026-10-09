---
'cmdk-engine': minor
---

Add `config.asyncSources`: commands loaded for each query (such as a server-side search), debounced, aborted when stale, and loaded once in the provider for every consumer. `isLoading` and `asyncErrors` report progress and per-source failures; `shouldFilter: false` shows server-matched items as returned; remote hrefs are limited to relative, http(s), mailto and tel.
