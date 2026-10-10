---
'cmdk-engine': patch
---

Behavior change: `cmdk-engine/search/match-sorter` now imports `match-sorter` statically, so install `match-sorter` for this entry; results no longer change once it loads. Every search, including the first, ranks with match-sorter, also with an engine created inline on every render, which used to stay on a simpler fallback ranker.
What else changes: match-sorter (about 2.7 kB min + brotli) is no longer a lazy chunk but part of the chunk that imports this entry, so import the entry lazily to keep it out of your main bundle. Server-side rendering loads match-sorter with the module, and server-rendered results now use it instead of the fallback. Without `match-sorter` installed, the import fails at build or server start (`ERR_MODULE_NOT_FOUND` in ESM, `Cannot find module` in CommonJS) instead of as a later unhandled rejection.
