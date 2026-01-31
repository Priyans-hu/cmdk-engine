import { describe, it, expect } from 'vitest'
import { scanRoutes } from '../../src/adapters/react-router/route-scanner'
import type { RouteObject } from '../../src/adapters/react-router/route-scanner'

describe('scanRoutes', () => {
  it('scans flat routes', () => {
    const routes: RouteObject[] = [
      { path: '/dashboard' },
      { path: '/settings' },
      { path: '/billing' },
    ]

    const commands = scanRoutes(routes)
    expect(commands).toHaveLength(3)
    expect(commands[0].label).toBe('Dashboard')
    expect(commands[0].href).toBe('/dashboard')
    expect(commands[1].label).toBe('Settings')
    expect(commands[2].label).toBe('Billing')
  })

  it('scans nested routes', () => {
    const routes: RouteObject[] = [
      {
        path: '/billing',
        children: [
          { path: 'overview' },
          { path: 'credits' },
        ],
      },
    ]

    const commands = scanRoutes(routes)
    expect(commands).toHaveLength(3) // parent + 2 children
    expect(commands[0].href).toBe('/billing')
    expect(commands[1].href).toBe('/billing/overview')
    expect(commands[1].label).toBe('Overview')
    expect(commands[2].href).toBe('/billing/credits')
  })

  it('uses handle.command metadata when available', () => {
    const routes: RouteObject[] = [
      {
        path: '/billing/overview',
        handle: {
          command: {
            label: 'Billing Dashboard',
            keywords: ['money', 'payment'],
            group: 'Billing',
            priority: 10,
          },
        },
      },
    ]

    const commands = scanRoutes(routes)
    expect(commands[0].label).toBe('Billing Dashboard')
    expect(commands[0].keywords).toEqual(['money', 'payment'])
    expect(commands[0].group).toBe('Billing')
    expect(commands[0].priority).toBe(10)
  })

  it('auto-generates group from first path segment', () => {
    const routes: RouteObject[] = [
      { path: '/billing/overview' },
      { path: '/settings/team' },
    ]

    const commands = scanRoutes(routes)
    expect(commands[0].group).toBe('Billing')
    expect(commands[1].group).toBe('Settings')
  })

  it('skips layout routes (no path)', () => {
    const routes: RouteObject[] = [
      {
        // Layout route — no path
        children: [
          { path: '/dashboard' },
          { path: '/settings' },
        ],
      },
    ]

    const commands = scanRoutes(routes)
    expect(commands).toHaveLength(2)
  })

  it('handles absolute child paths', () => {
    const routes: RouteObject[] = [
      {
        path: '/app',
        children: [
          { path: '/app/dashboard' }, // absolute path
        ],
      },
    ]

    const commands = scanRoutes(routes)
    const dashboard = commands.find((c) => c.label === 'Dashboard')
    expect(dashboard?.href).toBe('/app/dashboard')
  })

  it('generates correct IDs', () => {
    const routes: RouteObject[] = [
      { path: '/billing/overview' },
    ]

    const commands = scanRoutes(routes)
    expect(commands[0].id).toBe('billing-overview')
  })

  it('handles empty routes array', () => {
    expect(scanRoutes([])).toEqual([])
  })

  it('respects hidden flag from metadata', () => {
    const routes: RouteObject[] = [
      {
        path: '/admin/secret',
        handle: { command: { hidden: true } },
      },
    ]

    const commands = scanRoutes(routes)
    expect(commands[0].hidden).toBe(true)
  })

  it('handles permissions from metadata', () => {
    const routes: RouteObject[] = [
      {
        path: '/admin',
        handle: { command: { permissions: ['admin.view'] } },
      },
    ]

    const commands = scanRoutes(routes)
    expect(commands[0].permissions).toEqual(['admin.view'])
  })
})
