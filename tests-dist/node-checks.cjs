// Shared checks for the native Node consumers (node-esm.mjs, node-cjs.cjs). They
// load the BUILT package through its own `exports` with Node's real resolver and
// linker, no bundler involved.
const assert = require('node:assert/strict')
const { existsSync, readFileSync } = require('node:fs')
const path = require('node:path')
const { createElement: h } = require('react')
const { renderToString } = require('react-dom/server')

const DIST = path.join(__dirname, '..', 'dist')
// Client-only bundles that must keep the 'use client' directive.
const CLIENT_FILES = [
  'react/index.js',
  'react/index.cjs',
  'adapters/cmdk/index.js',
  'adapters/cmdk/index.cjs',
]

/** Fail with a clear message, not a resolver error, when there is no build. */
function assertBuilt() {
  if (!existsSync(DIST)) {
    console.error('test:dist: dist/ is missing. Run `bun run build` first.')
    process.exit(1)
  }
}

/** README Quick Start: provider from `cmdk-engine/react`, palette from `cmdk-engine/adapters/cmdk`. */
function quickStart(react, cmdk) {
  function Register() {
    react.useCommandRegister([
      { id: 'billing-overview', label: 'Billing Overview', href: '/billing/overview' },
    ])
    return null
  }
  function Shortcut() {
    cmdk.useCommandPaletteShortcut()
    return null
  }
  return h(react.CommandEngineProvider, null, h(Register), h(Shortcut), h(cmdk.CommandPalette))
}

/**
 * Load-and-call check of every export path. Calls at least one function per entry,
 * because a CJS bundle that requires a missing name only fails once it is called.
 */
function checkEntries(label, { core, react, cmdk, router, matchSorter, pkg }) {
  const items = [{ id: 'billing', label: 'Billing' }]
  assert.equal(core.createFuzzySearch().search('bill', items).length, 1)
  assert.match(renderToString(quickStart(react, cmdk)), /Type a command or search/)
  assert.equal(router.scanRoutes([{ path: '/billing' }])[0]?.label, 'Billing')
  assert.equal(matchSorter.createMatchSorterSearch().search('bill', items).length, 1)
  assert.equal(pkg.name, 'cmdk-engine')

  // Next.js App Router only honours the directive as the first statement.
  for (const file of CLIENT_FILES) {
    const firstLine = readFileSync(path.join(DIST, file), 'utf8').split('\n', 1)[0]
    assert.equal(firstLine, "'use client';", `dist/${file} must start with 'use client'`)
  }

  console.log(`${label}: every entry loads and the Quick Start renders`)
}

module.exports = { assertBuilt, checkEntries }
