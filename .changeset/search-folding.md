---
'cmdk-engine': patch
---

Behavior change: search now ignores accents, Unicode compatibility forms and repeated spaces. "resume" finds "Résumé", a decomposed "café" finds a composed one, and `billing  over` (two spaces) finds "Billing Overview", in the built-in search, synonym lookups and the match-sorter query. Results for ASCII text with single spaces are unchanged; ASCII text with repeated spaces, tabs or line breaks (a multi-line description, for example) now also matches across them. For non-ASCII text, built-in fuzzy scores can shift slightly and Korean is compared by its letters (jamo); ß and dotless ı are not folded. match-sorter keeps the query's case and compares it with the command text as written. Nothing to migrate; pass your own `searchEngine` if you need accent-sensitive matching.
