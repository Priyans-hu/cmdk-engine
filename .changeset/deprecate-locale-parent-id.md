---
'cmdk-engine': patch
---

Behavior change: `CommandEngineConfig.locale` and `CommandItem.parentId` are deprecated. Neither was ever read or set by cmdk-engine; both still compile, but deprecation lint rules will flag them. Remove `locale` (localize strings with `t`), and keep your own parent id in `meta`. The docs for `CommandItem.shortcut` (display only) and the frecency `storage`, `storageKey` and `maxAge` options now match what they do.
