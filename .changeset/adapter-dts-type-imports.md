---
'cmdk-engine': patch
---

The type declarations of `cmdk-engine/adapters/cmdk` and `cmdk-engine/adapters/base-ui` no longer use a default `React` import, so they compile without `esModuleInterop` or `allowSyntheticDefaultImports` (TS1259 with `skipLibCheck: false`).
