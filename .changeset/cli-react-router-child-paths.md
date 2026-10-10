---
'cmdk-engine': minor
---

Behavior change: the React Router CLI scan now joins relative child paths to their parent route, in `children` arrays and in nested `<Route>` elements, so `{ path: '/', children: [{ path: 'dashboard' }] }` gives `/dashboard`. Routes it skipped before now appear in `command-routes.json`. Run `npx cmdk-engine scan` again, and add `exclude` patterns for any you do not want.
