---
"cmdk-engine": patch
---

CLI `scan` now applies the same `DEFAULT_EXCLUDE` list as the runtime React Router adapter (auth/error/oauth-callback routes), matching the README. Opt out with `--no-default-exclude`.
