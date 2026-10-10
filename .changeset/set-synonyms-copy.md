---
'cmdk-engine': patch
---

Fix `createKeywordEngine().setSynonyms()` changing the dictionary passed to `createKeywordEngine`: it now only reads its argument, works when that dictionary is frozen, and keeps working when given the same object.
