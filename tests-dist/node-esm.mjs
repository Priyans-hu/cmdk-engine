// Native Node ESM consumer of the built package. Imports are dynamic so a missing
// build is reported by assertBuilt() before anything tries to resolve.
import checks from './node-checks.cjs'

checks.assertBuilt()

checks.checkEntries('node ESM', {
  core: await import('cmdk-engine'),
  react: await import('cmdk-engine/react'),
  cmdk: await import('cmdk-engine/adapters/cmdk'),
  router: await import('cmdk-engine/adapters/react-router'),
  matchSorter: await import('cmdk-engine/search/match-sorter'),
  pkg: (await import('cmdk-engine/package.json', { with: { type: 'json' } })).default,
})
