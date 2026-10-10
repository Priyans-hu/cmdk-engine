// Native Node CommonJS consumer of the built package.
const checks = require('./node-checks.cjs')

checks.assertBuilt()

checks.checkEntries('node CJS', {
  core: require('cmdk-engine'),
  react: require('cmdk-engine/react'),
  cmdk: require('cmdk-engine/adapters/cmdk'),
  router: require('cmdk-engine/adapters/react-router'),
  matchSorter: require('cmdk-engine/search/match-sorter'),
  sitemap: require('cmdk-engine/adapters/sitemap'),
  pkg: require('cmdk-engine/package.json'),
})

checks.checkBaseUi('node CJS', {
  react: require('cmdk-engine/react'),
  baseUi: require('cmdk-engine/adapters/base-ui'),
})
