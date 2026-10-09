---
'cmdk-engine': patch
---

Behavior change: `cmdk-engine/search/match-sorter` now imports `match-sorter` statically, so install `match-sorter` for this entry; results no longer change once it loads. Every search, including the first, ranks with match-sorter, also with an engine created inline on every render, which used to stay on a simpler fallback ranker.
