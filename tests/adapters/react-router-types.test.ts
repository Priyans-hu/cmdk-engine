import { describe, it, expect, expectTypeOf } from 'vitest'
import type { RouteObject as RouteObjectV6 } from 'react-router-v6'
import type { RouteObject as RouteObjectV7 } from 'react-router-v7'
import type { RouteObject as RouteObjectV8 } from 'react-router'
import { scanRoutes } from '../../src/adapters/react-router/route-scanner'
import type { RouteCommandMeta } from '../../src/core/types'

// These cases are checked by `bun run typecheck` (tsconfig.test.json).
// React Router is imported as types only: v8 needs a newer Node than CI runs.

interface AppHandle {
  crumb?: string
  command?: RouteCommandMeta
}

interface AppRoute {
  path?: string
  index?: boolean
  element?: unknown
  handle?: AppHandle
  children?: AppRoute[]
}

interface CrumbRoute {
  path?: string
  handle?: { crumb: string }
  children?: CrumbRoute[]
}

describe('scanRoutes route types', () => {
  it('accepts React Router 6 route objects', () => {
    const routes: RouteObjectV6[] = [
      { path: '/', children: [{ index: true }, { path: 'billing' }] },
    ]
    expect(scanRoutes(routes).map((c) => c.href)).toEqual(['/', '/billing'])
  })

  it('accepts React Router 7 route objects', () => {
    const routes: RouteObjectV7[] = [
      { path: '/', children: [{ index: true }, { path: 'billing' }] },
    ]
    expect(scanRoutes(routes).map((c) => c.href)).toEqual(['/', '/billing'])
  })

  it('accepts React Router 8 route objects', () => {
    const routes: RouteObjectV8[] = [
      { path: '/', children: [{ index: true }, { path: 'billing' }] },
    ]
    expect(scanRoutes(routes).map((c) => c.href)).toEqual(['/', '/billing'])
  })

  it('accepts a user-authored route interface', () => {
    const routes: AppRoute[] = [
      {
        path: '/billing',
        element: null,
        handle: { crumb: 'Billing', command: { label: 'Billing Home' } },
        children: [{ path: 'credits' }],
      },
    ]
    const commands = scanRoutes(routes)
    expect(commands.map((c) => c.href)).toEqual(['/billing', '/billing/credits'])
    expect(commands[0].label).toBe('Billing Home')
  })

  it('accepts route handles that carry no command', () => {
    const routes: CrumbRoute[] = [{ path: '/reports', handle: { crumb: 'Reports' } }]
    expect(scanRoutes(routes)[0].label).toBe('Reports')
  })

  it('accepts inline literals with extra route props', () => {
    const commands = scanRoutes([
      {
        path: '/reports',
        element: null,
        loader: () => null,
        handle: { crumb: 'Reports', command: { label: 'All Reports' } },
      },
    ])
    expect(commands[0].label).toBe('All Reports')
  })

  it('rejects a non-string path and a malformed handle.command', () => {
    // @ts-expect-error path must be a string
    expectTypeOf(scanRoutes).toBeCallableWith([{ path: 42 }])
    // @ts-expect-error handle.command.label must be a string
    expectTypeOf(scanRoutes).toBeCallableWith([{ path: '/x', handle: { command: { label: 1 } } }])
  })
})
