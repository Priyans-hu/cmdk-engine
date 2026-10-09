---
'cmdk-engine': patch
---

Behavior change: search now ignores accents, Unicode compatibility forms and repeated spaces. "resume" finds "Résumé", a decomposed "café" finds a composed one, and `billing  over` (two spaces) finds "Billing Overview", in the built-in search, synonym lookups and the match-sorter query. Results for plain-ASCII text are unchanged. For other text, fuzzy scores can shift slightly, Korean is compared by its letters (jamo), and ß and dotless ı are not folded. Nothing to migrate; pass your own `searchEngine` if you need accent-sensitive matching.
