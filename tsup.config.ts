import { defineConfig } from 'tsup'

export default defineConfig([
  // Core (framework-agnostic, zero deps)
  {
    entry: { 'core/index': 'src/core/index.ts' },
    format: ['esm', 'cjs'],
    dts: true,
    clean: true,
    treeshake: true,
    splitting: false,
    sourcemap: true,
    external: ['react', 'react-dom'],
  },
  // React hooks
  {
    entry: { 'react/index': 'src/react/index.ts' },
    format: ['esm', 'cjs'],
    dts: true,
    treeshake: true,
    splitting: false,
    sourcemap: true,
    external: ['react', 'react-dom'],
  },
  // cmdk adapter
  {
    entry: { 'adapters/cmdk/index': 'src/adapters/cmdk/index.ts' },
    format: ['esm', 'cjs'],
    dts: true,
    treeshake: true,
    splitting: false,
    sourcemap: true,
    external: ['react', 'react-dom', 'cmdk'],
  },
  // React Router adapter
  {
    entry: { 'adapters/react-router/index': 'src/adapters/react-router/index.ts' },
    format: ['esm', 'cjs'],
    dts: true,
    treeshake: true,
    splitting: false,
    sourcemap: true,
    external: ['react', 'react-dom', 'react-router', 'react-router-dom'],
  },
  // match-sorter search backend
  {
    entry: { 'core/search-match-sorter': 'src/core/search-match-sorter.ts' },
    format: ['esm', 'cjs'],
    dts: true,
    treeshake: true,
    splitting: false,
    sourcemap: true,
    external: ['match-sorter'],
  },
  // CLI tool
  {
    entry: { 'cli/index': 'src/cli/index.ts' },
    format: ['esm'],
    dts: false,
    treeshake: true,
    splitting: false,
    sourcemap: false,
    banner: { js: '#!/usr/bin/env node' },
    external: ['commander'],
  },
])
