---
'cmdk-engine': patch
---

Behavior change: `cmdk-engine scan` and `cmdk-engine validate` now exit 1 when they cannot read `cmdk-engine.config.ts`, with the file, line and value in the message. Before, they printed a warning and ran with the defaults, so `exclude`, `overrides` and `synonyms` were silently ignored while `validate` said "Config is valid.". The TS config is still read without running it, and now also accepts RegExp literals (the README example), `as const`, `satisfies`, typed top-level consts and spreads of them. For computed values such as `process.env`, rename the file to `cmdk-engine.config.mjs`.
