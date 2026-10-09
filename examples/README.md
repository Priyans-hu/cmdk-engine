# Examples

Each example is a standalone app that installs `cmdk-engine` from npm, so you can copy it out of
the repo or open it in StackBlitz.

| Example                                | What it shows                                                                                                                                                                                                   | Try it                                                                                                                      |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| [vite-react-router](vite-react-router) | Commands from the route tree with `scanRoutes`, plus two registered from a component; the provider inside the router; the README's Styling CSS; the same palette on the Base UI adapter with `?adapter=base-ui` | [StackBlitz](https://stackblitz.com/github/Priyans-hu/cmdk-engine/tree/main/examples/vite-react-router?file=src/layout.tsx) |
| [shadcn](shadcn)                       | The two shadcn registry items (`src/components/command-palette*.tsx`) in an app set up with `shadcn init`, in light and dark mode                                                                               | [StackBlitz](https://stackblitz.com/github/Priyans-hu/cmdk-engine/tree/main/examples/shadcn?file=src/App.tsx)               |

## Run one on this repo's build

CI (`.github/workflows/examples.yml`) builds every example against the package built from the
repo, not the npm release. To do the same, from the repo root:

```bash
bun install && bun run build
node scripts/local-build.mjs example vite-react-router --dev
```

The script copies the example to a temp dir outside the repo, installs it with npm against the
packed build, and starts it. Without `--dev` it builds it, as CI does.

## The shadcn registry items

`shadcn/src/components/command-palette.tsx` and `command-palette-base-ui.tsx` are the sources of
the registry items the docs site serves (`docs/registry.json`). For the shadcn example, CI also
deletes them, installs them again from the built registry JSON with the shadcn CLI, and builds
again.

## The README screenshot

`.github/assets/palette.png` comes from `vite-react-router`, which uses the README's Styling CSS.
Take it again when that CSS or the palette's markup changes:

```bash
node scripts/local-build.mjs example vite-react-router
node scripts/browser-check.mjs screenshot <the dir it printed>/dist .github/assets/palette.png
```
