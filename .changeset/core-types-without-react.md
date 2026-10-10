---
'cmdk-engine': patch
---

Fix the `cmdk-engine` and `cmdk-engine/search/match-sorter` type declarations failing to compile in projects without React's types when `skipLibCheck` is off ("Cannot find module 'react'"). Without React's types, `icon` is typed `any`; with them, nothing changes.
