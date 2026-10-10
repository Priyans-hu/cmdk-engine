---
'cmdk-engine': patch
---

Fix `cmdk-engine/search/match-sorter` ignoring command-side synonyms: a command now also matches its synonym keywords, ranked at most CONTAINS so it stays below direct matches ("prefer" finds a "Settings" command with the synonym "preferences"). A `threshold` above CONTAINS leaves synonym matches out.
