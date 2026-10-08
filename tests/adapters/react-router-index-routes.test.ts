import { describe, it, expect } from 'vitest'
import { scanRoutes } from '../../src/adapters/react-router/route-scanner'
import type { RouteObject } from '../../src/adapters/react-router/route-scanner'

const hrefs = (routes: RouteObject[], options?: Parameters<typeof scanRoutes>[1]) =>
  scanRoutes(routes, options).map((c) => c.href)

describe('scanRoutes index routes', () => {
  it('adds the index route of a pathless root as Home at /', () => {
    const commands = scanRoutes([{ children: [{ index: true }, { path: 'about' }] }])

    expect(commands.map((c) => c.href)).toEqual(['/', '/about'])
    expect(commands[0]).toMatchObject({ id: 'home', label: 'Home', href: '/' })
  })

  it('folds nested index routes into their parent route', () => {
    const routes: RouteObject[] = [
      {
        path: '/billing',
        children: [{ index: true }, { path: 'credits' }, { children: [{ index: true }] }],
      },
    ]

    expect(hrefs(routes)).toEqual(['/billing', '/billing/credits'])
  })

  it('excludes an index route together with its excluded parent', () => {
    expect(hrefs([{ path: '/login', children: [{ index: true }] }])).toEqual([])
    expect(hrefs([{ children: [{ index: true }] }], { exclude: ['/'] })).toEqual([])

    // A pattern that matches the parent's relative path also covers its index route
    const routes: RouteObject[] = [
      { path: '/app', children: [{ path: 'secret', children: [{ index: true }] }] },
    ]
    expect(hrefs(routes, { exclude: ['secret'] })).toEqual(['/app'])
  })

  it('applies the dynamic-route rule to index routes', () => {
    const routes: RouteObject[] = [{ path: '/users/:id', children: [{ index: true }] }]
    expect(hrefs(routes)).toEqual([])
    expect(hrefs(routes, { includeDynamic: true })).toEqual(['/users/:id'])

    const withMeta: RouteObject[] = [
      {
        path: '/users/:id',
        children: [{ index: true, handle: { command: { label: 'User Profile' } } }],
      },
    ]
    expect(scanRoutes(withMeta)).toMatchObject([{ href: '/users/:id', label: 'User Profile' }])
  })

  it('dedupes by URL whatever the route order', () => {
    const layout: RouteObject = {
      children: [{ index: true, handle: { command: { label: 'Start' } } }],
    }
    const root: RouteObject = { path: '/', handle: { command: { group: 'Main' } } }
    const about: RouteObject = { path: '/about' }
    const orders = [
      [layout, root, about],
      [layout, about, root],
      [root, layout, about],
      [root, about, layout],
      [about, layout, root],
      [about, root, layout],
    ]

    for (const routes of orders) {
      const commands = scanRoutes(routes)
      expect(commands).toHaveLength(2)
      expect(commands.find((c) => c.href === '/')).toMatchObject({
        id: 'home',
        label: 'Start',
        group: 'Main',
      })
    }

    const credits: RouteObject = { path: 'credits' }
    const index: RouteObject = { index: true }
    expect(hrefs([{ path: '/billing', children: [index, credits] }])).toEqual(
      hrefs([{ path: '/billing', children: [credits, index] }]),
    )
  })

  it('merges handle.command of an index route over its parent item', () => {
    const routes: RouteObject[] = [
      {
        path: '/billing',
        handle: { command: { label: 'Billing', group: 'Finance', keywords: ['money'] } },
        children: [
          {
            index: true,
            handle: { command: { label: 'Billing Overview', description: 'Invoices' } },
          },
        ],
      },
    ]

    expect(scanRoutes(routes)).toEqual([
      {
        id: 'billing',
        label: 'Billing Overview',
        description: 'Invoices',
        keywords: ['money'],
        group: 'Finance',
        href: '/billing',
      },
    ])
  })

  it('treats index: true with a path as a normal path route', () => {
    const routes: RouteObject[] = [
      { path: '/settings', children: [{ index: true, path: 'general' }] },
    ]

    expect(hrefs(routes)).toEqual(['/settings', '/settings/general'])
  })
})
