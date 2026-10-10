---
'cmdk-engine': patch
---

Fix malformed fields on async-source items crashing the app. When items load, an object `icon`, `description` or `group` that is not a React element is removed, `shortcut` and `scope` keep only their string entries (a non-array is removed), and an item whose `children` is not an array becomes a plain item instead of failing the whole load. `permissions` follow the rules for registered commands: `null`, `undefined` and `''` mean no restriction, a string is one permission, array entries become strings, and any other value hides the item.
