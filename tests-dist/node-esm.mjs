// Native Node ESM consumer of the built package. Imports are dynamic so a missing
// build is reported by assertBuilt() before anything tries to resolve.
import { createRequire } from 'node:module'
import checks from './node-checks.cjs'

checks.assertBuilt()

checks.checkEntries('node ESM', {
  core: await import('cmdk-engine'),
  react: await import('cmdk-engine/react'),
  cmdk: await import('cmdk-engine/adapters/cmdk'),
  router: await import('cmdk-engine/adapters/react-router'),
  matchSorter: await import('cmdk-engine/search/match-sorter'),
  sitemap: await import('cmdk-engine/adapters/sitemap'),
  // JSON import attributes need Node 20.10+; engines allows any Node 20.
  pkg: createRequire(import.meta.url)('cmdk-engine/package.json'),
})

checks.checkBaseUi('node ESM', {
  react: await import('cmdk-engine/react'),
  baseUi: await import('cmdk-engine/adapters/base-ui'),
})
