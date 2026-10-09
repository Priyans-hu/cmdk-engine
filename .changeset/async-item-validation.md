---
'cmdk-engine': patch
---

Fix malformed items crashing the palette. Items from an async source without a non-empty string `id` and `label` (children included) are now dropped when they load, the rest still show, and `asyncErrors[id]` reports them, for example "2 items dropped: missing label". Non-string `keywords` entries on loaded items are removed.
Search and keyword enrichment now skip a missing or non-string `label`, `description` or keyword, so a registered command without a label, or with `keywords: ['a', null]`, no longer throws.
