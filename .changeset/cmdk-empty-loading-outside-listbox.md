---
'cmdk-engine': patch
---

Behavior change: the cmdk adapter renders the empty state and the loading row right after the results list instead of inside it, because a `role=listbox` may only contain groups and options (axe reported a critical `aria-required-children` violation). Their `cmdk-*` and `data-cmdk-engine-*` attributes are unchanged: style them with `[cmdk-empty]`/`[cmdk-loading]`, not as list descendants such as `[cmdk-list] [cmdk-empty]`. Tests that look for the empty text inside `role=listbox` must search the palette instead. The loading row now sits below the scrolling list, as in the Base UI adapter.
