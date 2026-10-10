---
'cmdk-engine': patch
---

An async source whose `load()` resolves to something other than an array (an object or `null`, for example) now reports `load() must resolve to an array` in `asyncErrors[id]`, instead of a minified "is not iterable" error.
