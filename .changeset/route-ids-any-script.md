---
'cmdk-engine': patch
---

Behavior change: route ids and labels from `scanRoutes` and the CLI now keep letters of any script. Before, a path such as `/設定` or `/配置` got the id `home`, so it replaced the real home route or vanished, and accented labels came out as `ConfiguracióN`. Non-ASCII route ids and labels change once, which resets their frecency and "Recent" entries; ASCII ids and labels are unchanged (`/a_b`, `/a.b` and `/ab` still share the id `ab`).
