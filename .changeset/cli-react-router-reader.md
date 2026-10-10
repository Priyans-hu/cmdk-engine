---
'cmdk-engine': patch
---

Behavior change: the React Router CLI scan now reads route files with a small tokenizer instead of regexes, so its output changes. A route's label, keywords and group come only from its own `handle.command`; before, they were copied onto neighbouring routes. Routes after a `'/docs/*'` path are no longer lost, `<Route>` attributes are read in any order, quoted labels and keywords stay whole (`"Don't Panic"`), and `<Route handle={{ command }}>` is read. Run `npx cmdk-engine scan` again and review the diff of `command-routes.json`.
