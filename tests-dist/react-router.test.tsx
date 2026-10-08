import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'
// Self-reference: resolves through package.json `exports` to the built dist/, not src/.
import { scanRoutes } from 'cmdk-engine/adapters/react-router'

// A pathless root with an index route, and an index route that adds to its parent's command
const routes = [
  {
    children: [
      { index: true },
      {
        path: 'billing',
        handle: { command: { label: 'Billing' } },
        children: [{ index: true, handle: { command: { description: 'Invoices' } } }],
      },
    ],
  },
]

const expected = [
  { id: 'home', label: 'Home', href: '/' },
  { id: 'billing', label: 'Billing', description: 'Invoices', href: '/billing' },
]

describe('built package: react-router index routes', () => {
  it('scans index routes through the ESM entry', () => {
    expect(scanRoutes(routes)).toMatchObject(expected)
  })

  it('scans index routes through the CJS entry', () => {
    const require = createRequire(import.meta.url)
    const cjs: { scanRoutes: typeof scanRoutes } = require('cmdk-engine/adapters/react-router')
    expect(cjs.scanRoutes(routes)).toMatchObject(expected)
  })
})
