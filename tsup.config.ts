import { defineConfig } from 'tsup'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'

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
  // Core (framework-agnostic, zero deps)
  {
    entry: { 'core/index': 'src/core/index.ts' },
    format: ['esm', 'cjs'],
    dts: true,
    clean: true,
    treeshake: true,
    splitting: false,
    sourcemap: false,
    external: ['react', 'react-dom'],
  },
  // React hooks (client-only — needs the 'use client' directive so
  // Next.js App Router / RSC consumers can import the hooks directly)
  {
    entry: { 'react/index': 'src/react/index.ts' },
    format: ['esm', 'cjs'],
    dts: true,
    treeshake: true,
    splitting: false,
    sourcemap: false,
    onSuccess: prependUseClient(['dist/react/index.js', 'dist/react/index.cjs']),
    external: ['react', 'react-dom'],
  },
  // cmdk adapter (client-only — renders React components + hooks)
  {
    entry: { 'adapters/cmdk/index': 'src/adapters/cmdk/index.ts' },
    format: ['esm', 'cjs'],
    dts: true,
    treeshake: true,
    splitting: false,
    sourcemap: false,
    onSuccess: prependUseClient(['dist/adapters/cmdk/index.js', 'dist/adapters/cmdk/index.cjs']),
    external: ['react', 'react-dom', 'cmdk'],
  },
  // React Router adapter
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
])
