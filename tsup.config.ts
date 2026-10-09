import { defineConfig } from 'tsup'
import type { Options } from 'tsup'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

type EsbuildPlugin = NonNullable<Options['esbuildPlugins']>[number]

const ROOT = path.dirname(fileURLToPath(import.meta.url))

// Entries that other entries import, and the public specifier to import them by.
const SIBLINGS = [
  { dir: path.join(ROOT, 'src/core') + path.sep, spec: 'cmdk-engine' },
  { dir: path.join(ROOT, 'src/react') + path.sep, spec: 'cmdk-engine/react' },
]

// Modules in src/core that src/core/index.ts does not export, so `cmdk-engine`
// cannot provide them. They must stay bundled into whichever entry uses them.
const NON_BARREL = ['src/core/search-match-sorter', 'src/core/route-defaults'].map((p) =>
  path.join(ROOT, p),
)

// Bundling a sibling entry's source gives the importer a private copy of it. For
// `cmdk-engine/react` that copy has its own React contexts, so components from
// `cmdk-engine/adapters/cmdk` could not see a <CommandEngineProvider> imported from
// `cmdk-engine/react`. This rewrites a relative import that leaves the importer's
// entry for a sibling's source dir to that sibling's public specifier, marked
// external, so every entry's code ships (and runs) exactly once.
function siblingEntriesExternal(specs: string[]): EsbuildPlugin {
  return {
    name: 'sibling-entries-external',
    setup(build) {
      build.onResolve({ filter: /^\.\.?(\/|$)/ }, (args) => {
        if (args.kind === 'entry-point') return
        const target = path.resolve(args.resolveDir, args.path)
        for (const { dir, spec } of SIBLINGS) {
          if (!specs.includes(spec) || args.importer.startsWith(dir)) continue
          if (!target.startsWith(dir) && target + path.sep !== dir) continue
          if (NON_BARREL.some((p) => target.startsWith(p))) {
            const text = `${target} is not exported by ${spec}; inline or export it`
            return { errors: [{ text }] }
          }
          return { path: spec, external: true }
        }
      })
    },
  }
}

// esbuild strips module-level "use client" directives during bundling, so we
// re-add them to the emitted client-only bundles after each build. Required for
// Next.js App Router / RSC consumers importing the hooks/components directly.
function prependUseClient(files: string[]) {
  return async () => {
    for (const file of files) {
      if (!existsSync(file)) continue
      const content = readFileSync(file, 'utf8')
      if (/^(['"])use client\1/.test(content)) continue
      writeFileSync(file, `'use client';\n${content}`)
    }
  }
}

export default defineConfig([
  // Core (framework-agnostic, zero deps). The `build` script empties dist/ first:
  // `clean` here would race the other configs, which build in parallel.
  {
    entry: { 'core/index': 'src/core/index.ts' },
    format: ['esm', 'cjs'],
    dts: true,
    treeshake: true,
    splitting: false,
    sourcemap: false,
    external: ['react', 'react-dom'],
  },
  // React hooks (client-only — needs the 'use client' directive so
  // Next.js App Router / RSC consumers can import the hooks directly).
  // Imports core from `cmdk-engine` instead of bundling it.
  {
    entry: { 'react/index': 'src/react/index.ts' },
    format: ['esm', 'cjs'],
    dts: true,
    treeshake: true,
    splitting: false,
    sourcemap: false,
    onSuccess: prependUseClient(['dist/react/index.js', 'dist/react/index.cjs']),
    external: ['react', 'react-dom'],
    esbuildPlugins: [siblingEntriesExternal(['cmdk-engine'])],
  },
  // cmdk adapter (client-only — renders React components + hooks).
  // Imports core and the hooks from `cmdk-engine` and `cmdk-engine/react`.
  {
    entry: { 'adapters/cmdk/index': 'src/adapters/cmdk/index.ts' },
    format: ['esm', 'cjs'],
    dts: true,
    treeshake: true,
    splitting: false,
    sourcemap: false,
    onSuccess: prependUseClient(['dist/adapters/cmdk/index.js', 'dist/adapters/cmdk/index.cjs']),
    external: ['react', 'react-dom', 'cmdk'],
    esbuildPlugins: [siblingEntriesExternal(['cmdk-engine', 'cmdk-engine/react'])],
  },
  // Base UI adapter (client-only, like the cmdk adapter). The string external
  // also covers the `@base-ui/react/*` subpaths it imports.
  {
    entry: { 'adapters/base-ui/index': 'src/adapters/base-ui/index.ts' },
    format: ['esm', 'cjs'],
    dts: true,
    treeshake: true,
    splitting: false,
    sourcemap: false,
    onSuccess: prependUseClient([
      'dist/adapters/base-ui/index.js',
      'dist/adapters/base-ui/index.cjs',
    ]),
    external: ['react', 'react-dom', '@base-ui/react'],
    esbuildPlugins: [siblingEntriesExternal(['cmdk-engine', 'cmdk-engine/react'])],
  },
  // React Router adapter. Keeps its core code bundled: it uses route-defaults
  // helpers that `cmdk-engine` does not export.
  {
    entry: { 'adapters/react-router/index': 'src/adapters/react-router/index.ts' },
    format: ['esm', 'cjs'],
    dts: true,
    treeshake: true,
    splitting: false,
    sourcemap: false,
    external: ['react', 'react-dom', 'react-router', 'react-router-dom'],
  },
  // match-sorter search backend
  {
    entry: { 'core/search-match-sorter': 'src/core/search-match-sorter.ts' },
    format: ['esm', 'cjs'],
    dts: true,
    treeshake: true,
    splitting: false,
    sourcemap: false,
    external: ['match-sorter'],
  },
  // CLI tool — emit CJS and bundle commander so the bin is fully self-contained.
  // commander is a devDependency (not shipped to consumers) and does internal
  // require()s of Node built-ins; CJS output lets those resolve natively without
  // the ESM dynamic-require shim that would otherwise throw.
  {
    entry: { 'cli/index': 'src/cli/index.ts' },
    format: ['cjs'],
    dts: false,
    treeshake: true,
    splitting: false,
    sourcemap: false,
    banner: { js: '#!/usr/bin/env node' },
    noExternal: ['commander'],
    external: [],
  },
  // Sitemap helper: turns the CLI's command-routes.json into commands. It imports
  // only types from core, so nothing is bundled from it. Its d.ts inlines
  // CommandItem, whose `icon` is a ReactNode: the banner keeps that react import
  // from failing in projects without React types (react is an optional peer).
  {
    entry: { 'adapters/sitemap/index': 'src/adapters/sitemap/index.ts' },
    format: ['esm', 'cjs'],
    dts: { banner: '// @ts-ignore react is an optional peer; without it, ReactNode is any' },
    treeshake: true,
    splitting: false,
    sourcemap: false,
  },
])
