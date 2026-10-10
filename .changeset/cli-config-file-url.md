---
'cmdk-engine': patch
---

Fix the CLI failing to load a `.js`, `.mjs` or `.cjs` config on Windows (`ERR_UNSUPPORTED_ESM_URL_SCHEME`), or from a directory whose name contains `#` or `%`. The config is now imported through a `file:` URL.
