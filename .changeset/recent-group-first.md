---
'cmdk-engine': patch
---

Behavior change: with `frecency.showRecent` and `groups` configured, the "Recent" group now comes first, above the configured groups, as documented. Before, it came after them. The palette highlights the first item when it opens, so with groups configured that is now the most recent command rather than the first command of the highest-priority group, and pressing Enter right after opening runs it. To keep your configured groups on top, leave `showRecent` off, or render your own list from `groupedResults`.
