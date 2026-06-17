import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { render, renderHook, act } from '@testing-library/react'
import { CommandEngineProvider, useEngineContext } from '../../src/react/context'
import {
  useNextNavigate,
  useNextPrefetch,
  useNextCommandRoutes,
  NextCommandRoutes,
  usePrefetchOnHover,
} from '../../src/adapters/nextjs'
import type { NextRouteLike } from '../../src/adapters/nextjs'

// ---------------------------------------------------------------
// Mock next/navigation
// ---------------------------------------------------------------

const router = {
  push: vi.fn(),
  replace: vi.fn(),
  prefetch: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
}

vi.mock('next/navigation', () => ({
  useRouter: () => router,
}))

beforeEach(() => {
  router.push.mockReset()
  router.replace.mockReset()
  router.prefetch.mockReset()
})

// ---------------------------------------------------------------
// Test fixtures + helpers
// ---------------------------------------------------------------

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <CommandEngineProvider>{children}</CommandEngineProvider>
)

function renderWithProvider(ui: React.ReactElement) {
  return render(<CommandEngineProvider>{ui}</CommandEngineProvider>)
}

// Test-only inspector: peeks at the registry contents
function RegistryInspector({ onSnapshot }: { onSnapshot: (items: unknown[]) => void }) {
  const { registry } = useEngineContext()
  React.useEffect(() => {
    const sub = registry.subscribe(() => {
      onSnapshot(registry.getSnapshot())
    })
    onSnapshot(registry.getSnapshot())
    return sub
  }, [registry, onSnapshot])
  return null
}

// ---------------------------------------------------------------
// useNextNavigate
// ---------------------------------------------------------------

describe('useNextNavigate', () => {
  it('returns a function that calls router.push', () => {
    const { result } = renderHook(() => useNextNavigate(), { wrapper })

    act(() => {
      result.current('/billing')
    })

    expect(router.push).toHaveBeenCalledWith('/billing', { scroll: undefined })
    expect(router.replace).not.toHaveBeenCalled()
  })

  it('uses router.replace when options.replace is true', () => {
    const { result } = renderHook(() => useNextNavigate(), { wrapper })

    act(() => {
      result.current('/billing', { replace: true })
    })

    expect(router.replace).toHaveBeenCalledWith('/billing', { scroll: undefined })
    expect(router.push).not.toHaveBeenCalled()
  })

  it('forwards scroll option to router.push', () => {
    const { result } = renderHook(() => useNextNavigate(), { wrapper })

    act(() => {
      result.current('/billing', { scroll: false })
    })

    expect(router.push).toHaveBeenCalledWith('/billing', { scroll: false })
  })

  it('returns a stable reference across renders', () => {
    const { result, rerender } = renderHook(() => useNextNavigate(), { wrapper })
    const first = result.current
    rerender()
    expect(result.current).toBe(first)
  })
})

// ---------------------------------------------------------------
// useNextPrefetch
// ---------------------------------------------------------------

describe('useNextPrefetch', () => {
  it('calls router.prefetch with the given href', () => {
    const { result } = renderHook(() => useNextPrefetch(), { wrapper })

    act(() => {
      result.current('/billing')
    })

    expect(router.prefetch).toHaveBeenCalledWith('/billing')
  })
})

// ---------------------------------------------------------------
// useNextCommandRoutes — registers commands
// ---------------------------------------------------------------

describe('useNextCommandRoutes', () => {
  function HookHost({
    routes,
    options,
  }: {
    routes: Parameters<typeof useNextCommandRoutes>[0]
    options?: Parameters<typeof useNextCommandRoutes>[1]
  }) {
    useNextCommandRoutes(routes, options)
    return null
  }

  it('registers commands derived from a flat NextRouteLike[]', () => {
    const snapshots: unknown[][] = []
    const routes: NextRouteLike[] = [
      { path: '/dashboard' },
      { path: '/billing/overview', label: 'Billing Overview' },
    ]

    renderWithProvider(
      <>
        <HookHost routes={routes} />
        <RegistryInspector onSnapshot={(s) => snapshots.push(s)} />
      </>,
    )

    const last = snapshots.at(-1) as Array<{ id: string; label: string; href: string; group?: string }>
    expect(last).toHaveLength(2)
    expect(last[0]).toMatchObject({
      id: 'dashboard',
      label: 'Dashboard',
      href: '/dashboard',
    })
    expect(last[1]).toMatchObject({
      id: 'billing--overview',
      label: 'Billing Overview',
      href: '/billing/overview',
      group: 'Billing',
    })
  })

  it('accepts a Sitemap-shaped object with .routes', () => {
    const snapshots: unknown[][] = []
    const sitemap = {
      version: 1,
      generatedAt: '2025-01-01T00:00:00Z',
      framework: 'nextjs-app',
      routes: [
        { id: 'home', path: '/', label: 'Home', keywords: [] },
        { id: 'settings', path: '/settings', label: 'Settings', keywords: [] },
      ],
    }

    renderWithProvider(
      <>
        <HookHost routes={sitemap} />
        <RegistryInspector onSnapshot={(s) => snapshots.push(s)} />
      </>,
    )

    const last = snapshots.at(-1) as Array<{ id: string; href: string }>
    expect(last).toHaveLength(2)
    expect(last.map((c) => c.href).sort()).toEqual(['/', '/settings'])
  })

  it('wires action to router.push with the href', () => {
    const snapshots: Array<Array<{ id: string; href: string; action?: () => void }>> = []
    const routes: NextRouteLike[] = [{ path: '/billing' }]

    renderWithProvider(
      <>
        <HookHost routes={routes} />
        <RegistryInspector onSnapshot={(s) => snapshots.push(s as never)} />
      </>,
    )

    const last = snapshots.at(-1)!
    expect(typeof last[0].action).toBe('function')

    act(() => {
      last[0].action?.()
    })

    expect(router.push).toHaveBeenCalledWith('/billing')
  })

  it('prefetches all routes on mount when prefetchOnMount=true', () => {
    const routes: NextRouteLike[] = [
      { path: '/dashboard' },
      { path: '/billing' },
      { path: '/settings' },
    ]

    renderWithProvider(<HookHost routes={routes} options={{ prefetchOnMount: true }} />)

    expect(router.prefetch).toHaveBeenCalledTimes(3)
    expect(router.prefetch).toHaveBeenCalledWith('/dashboard')
    expect(router.prefetch).toHaveBeenCalledWith('/billing')
    expect(router.prefetch).toHaveBeenCalledWith('/settings')
  })

  it('does NOT prefetch by default', () => {
    const routes: NextRouteLike[] = [{ path: '/dashboard' }, { path: '/billing' }]

    renderWithProvider(<HookHost routes={routes} />)

    expect(router.prefetch).not.toHaveBeenCalled()
  })

  it('respects route metadata (label, keywords, group, priority)', () => {
    const snapshots: Array<Array<Record<string, unknown>>> = []
    const routes: NextRouteLike[] = [
      {
        path: '/billing/overview',
        meta: {
          label: 'Billing Dashboard',
          keywords: ['money', 'payment'],
          group: 'Money',
          priority: 10,
        },
      },
    ]

    renderWithProvider(
      <>
        <HookHost routes={routes} />
        <RegistryInspector onSnapshot={(s) => snapshots.push(s as never)} />
      </>,
    )

    const last = snapshots.at(-1)!
    expect(last[0]).toMatchObject({
      label: 'Billing Dashboard',
      keywords: ['money', 'payment'],
      group: 'Money',
      priority: 10,
    })
  })

  it('applies the transform option after deriving defaults', () => {
    const snapshots: Array<Array<Record<string, unknown>>> = []
    const routes: NextRouteLike[] = [{ path: '/dashboard' }]

    renderWithProvider(
      <>
        <HookHost
          routes={routes}
          options={{ transform: (r) => ({ description: `Go to ${r.path}` }) }}
        />
        <RegistryInspector onSnapshot={(s) => snapshots.push(s as never)} />
      </>,
    )

    const last = snapshots.at(-1)!
    expect(last[0].description).toBe('Go to /dashboard')
  })

  it('falls back to defaultGroup when route has no group', () => {
    const snapshots: Array<Array<Record<string, unknown>>> = []
    const routes: NextRouteLike[] = [{ path: '/about' }]

    renderWithProvider(
      <>
        <HookHost routes={routes} options={{ defaultGroup: 'Misc' }} />
        <RegistryInspector onSnapshot={(s) => snapshots.push(s as never)} />
      </>,
    )

    const last = snapshots.at(-1)!
    expect(last[0].group).toBe('Misc')
  })

  it('handles empty routes input gracefully', () => {
    const snapshots: unknown[][] = []
    renderWithProvider(
      <>
        <HookHost routes={[]} />
        <RegistryInspector onSnapshot={(s) => snapshots.push(s)} />
      </>,
    )
    expect(snapshots.at(-1)).toEqual([])
  })
})

// ---------------------------------------------------------------
// <NextCommandRoutes> HOC
// ---------------------------------------------------------------

describe('<NextCommandRoutes />', () => {
  it('registers routes via the hook', () => {
    const snapshots: unknown[][] = []

    renderWithProvider(
      <>
        <NextCommandRoutes routes={[{ path: '/foo' }, { path: '/bar' }]} />
        <RegistryInspector onSnapshot={(s) => snapshots.push(s)} />
      </>,
    )

    const last = snapshots.at(-1) as Array<{ href: string }>
    expect(last.map((c) => c.href).sort()).toEqual(['/bar', '/foo'])
  })

  it('forwards prefetchOnMount to the hook', () => {
    renderWithProvider(
      <NextCommandRoutes routes={[{ path: '/foo' }]} prefetchOnMount />,
    )
    expect(router.prefetch).toHaveBeenCalledWith('/foo')
  })
})

// ---------------------------------------------------------------
// usePrefetchOnHover
// ---------------------------------------------------------------

describe('usePrefetchOnHover', () => {
  it('returns a factory that prefetches on hover', () => {
    const { result } = renderHook(() => usePrefetchOnHover(), { wrapper })

    const handler = result.current('/billing')
    expect(typeof handler).toBe('function')

    act(() => {
      handler({} as React.MouseEvent<HTMLElement>)
    })

    expect(router.prefetch).toHaveBeenCalledWith('/billing')
  })
})
