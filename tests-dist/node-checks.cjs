// Shared checks for the native Node consumers (node-esm.mjs, node-cjs.cjs). They
// load the BUILT package through its own `exports` with Node's real resolver and
// linker, no bundler involved.
const assert = require('node:assert/strict')
const { existsSync, readFileSync } = require('node:fs')
const path = require('node:path')
const { createElement: h } = require('react')
const { useState } = require('react')
const { renderToString } = require('react-dom/server')

const DIST = path.join(__dirname, '..', 'dist')
// Client-only bundles that must keep the 'use client' directive.
const CLIENT_FILES = [
  'react/index.js',
  'react/index.cjs',
  'adapters/cmdk/index.js',
  'adapters/cmdk/index.cjs',
  'adapters/base-ui/index.js',
  'adapters/base-ui/index.cjs',
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
function checkEntries(label, { core, react, cmdk, router, matchSorter, sitemap, pkg }) {
  const items = [{ id: 'billing', label: 'Billing' }]
  assert.equal(core.createFuzzySearch().search('bill', items).length, 1)
  assert.match(renderToString(quickStart(react, cmdk)), /Type a command or search/)
  // An async source whose trigger passes renders the loading row from the first render.
  const pending = { id: 'remote', trigger: () => true, load: () => new Promise(() => {}) }
  const withSource = h(
    react.CommandEngineProvider,
    { config: { asyncSources: [pending] } },
    h(cmdk.CommandPalette),
  )
  assert.match(renderToString(withSource), /Loading\.\.\./)
  assert.equal(router.scanRoutes([{ path: '/billing' }])[0]?.label, 'Billing')
  assert.equal(matchSorter.createMatchSorterSearch().search('bill', items).length, 1)
  assert.equal(sitemap.sitemapToCommands([{ id: 'b', path: '/b', label: 'B', keywords: [] }])[0]?.href, '/b')
  assert.equal(pkg.name, 'cmdk-engine')

  // Next.js App Router only honours the directive as the first statement.
  for (const file of CLIENT_FILES) {
    const firstLine = readFileSync(path.join(DIST, file), 'utf8').split('\n', 1)[0]
    assert.equal(firstLine, "'use client';", `dist/${file} must start with 'use client'`)
  }

  console.log(`${label}: every entry loads and the Quick Start renders`)
}

/**
 * Base UI adapter: provider from `cmdk-engine/react`, palette and shortcut from
 * `cmdk-engine/adapters/base-ui`. The inline palette server-renders its options
 * without warnings; the dialog renders nothing until it opens.
 */
function checkBaseUi(label, { react, baseUi }) {
  // Registered during render: useCommandRegister's effect never runs on the server.
  function Register() {
    const { registry } = react.useEngineContext()
    useState(() => registry.registerMany([{ id: 'billing', label: 'Billing' }]))
    return null
  }
  function Shortcut() {
    baseUi.useCommandPaletteShortcut()
    return null
  }
  const errors = []
  const consoleError = console.error
  console.error = (...args) => errors.push(args.join(' '))
  let inline, dialog
  try {
    inline = renderToString(
      h(react.CommandEngineProvider, null, h(Register), h(Shortcut), h(baseUi.CommandPalette)),
    )
    dialog = renderToString(
      h(react.CommandEngineProvider, null, h(baseUi.CommandPalette, { dialog: true })),
    )
  } finally {
    console.error = consoleError
  }
  assert.deepEqual(errors, [])
  assert.match(inline, /role="combobox"[^>]*placeholder="Type a command or search\.\.\."/)
  assert.match(inline, /role="option".*Billing/)
  assert.equal(dialog, '')
  console.log(`${label}: the Base UI adapter loads and server-renders`)
}

module.exports = { assertBuilt, checkEntries }
module.exports.checkBaseUi = checkBaseUi
