---
'cmdk-engine': patch
---

Fix `synonyms` not expanding the query: when the whole query equals a synonym key or value (for example "money" with `synonyms: { billing: ['money'] }`), the palette now also returns what the other terms match, after the direct matches and scored below them.
This works with the fuzzy, match-sorter and custom search engines (a custom engine is called once more per extra term). Partial words do not expand, and match-sorter still ignores the command-side synonym keywords.
