---
"cmdk-engine": patch
---

Fixed `createFuzzySearch()` excluding `hidden` items even when a search query matched them. The `hidden` filter now only applies to the empty-query browse list — a non-empty query can still match hidden items, matching the documented "searchable but not browsable" contract.
