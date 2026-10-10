---
'cmdk-engine': patch
---

Fix TypeScript error TS1259 ("can only be default-imported using the 'esModuleInterop' flag") in the `cmdk-engine/react` type declarations, seen in projects that compile without `esModuleInterop` or `allowSyntheticDefaultImports` and with `skipLibCheck: false`. The declarations now import React types by name.
