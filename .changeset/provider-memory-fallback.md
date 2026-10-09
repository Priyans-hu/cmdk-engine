---
'cmdk-engine': patch
---

Fix the in-memory frecency and search history (used where `localStorage` is unavailable) being wiped whenever the provider rebuilt its engines, for example on every parent re-render with an inline `config` object, which made "Recent" disappear.
