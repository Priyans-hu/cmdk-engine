---
'cmdk-engine': minor
---

Add `frecency.enabled` to the provider config. Set `frecency: { enabled: false }` to turn frecency off: nothing is stored in or read from `localStorage`, results are not ranked by past use, and no "Recent" group shows, even with `showRecent`. It defaults to `true`, so nothing changes unless you set it.
