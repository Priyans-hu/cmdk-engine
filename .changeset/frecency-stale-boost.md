---
'cmdk-engine': patch
---

Behavior change: a command used only long ago no longer gets the full frecency boost when it is the only used command in the results. The boost is now relative to the strongest used result, but never to less than one use one half-life (7 days by default) ago, so ranking moves only when every used result is stale; results with a recent use rank as before.
