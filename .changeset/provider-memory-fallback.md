---
'cmdk-engine': patch
---

Fix the in-memory frecency and search history (used where `localStorage` is unavailable) being wiped whenever the provider rebuilt its engines, for example on every parent re-render with an inline `config` object, which made "Recent" disappear. The in-memory search history keeps the options it was created with until the provider remounts.
