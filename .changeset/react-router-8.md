---
'cmdk-engine': minor
---

React Router adapter: support `react-router` 8 (peer range `^6 || ^7 || ^8`). `scanRoutes` now accepts React Router 6, 7 and 8 route types and your own route interfaces without a cast, and discovers index routes: they resolve to their parent's URL (`/` for a pathless root), and their `handle.command` is merged over the parent's command.
