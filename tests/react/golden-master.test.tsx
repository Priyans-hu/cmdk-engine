import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import React from 'react'
import { renderHook, act } from '@testing-library/react'
import { CommandEngineProvider } from '../../src/react/context'
import { useCommandPalette } from '../../src/react/use-command-palette'
import type { UseCommandPaletteReturn } from '../../src/react/use-command-palette'
import { useCommandRegister } from '../../src/react/use-command-register'
import { createInMemoryStorage } from '../../src/core/frecency'
import { createSimpleAccessProvider } from '../../src/core/access-control'
import type { CommandEngineConfig, CommandItem } from '../../src/core/types'

// Golden master: pins the results pipeline (search, recents, frecency, context
// boost, groups, maxResults, nested pages) for a fixed config and query set.
// It must stay green and unedited while the pipeline evolves.

const NOW = Date.UTC(2026, 0, 15, 12, 0, 0)
const DAY = 86_400_000

const COMMANDS: CommandItem[] = [
  { id: 'home', label: 'Home', href: '/', priority: 5 },
  { id: 'docs', label: 'Documentation', href: '/docs', keywords: ['help', 'guide'] },
  {
    id: 'billing-overview',
    label: 'Billing Overview',
    href: '/billing',
    group: 'billing',
    keywords: ['invoices'],
    scope: ['/billing'],
  },
  {
    id: 'billing-cards',
    label: 'Payment Cards',
    href: '/billing/cards',
    group: 'billing',
    scope: ['/billing/*'],
  },
  {
    id: 'billing-history',
    label: 'Billing History',
    href: '/billing/history',
    group: 'billing',
    priority: 2,
  },
  {
    id: 'billing-plans',
    label: 'Plans and Pricing',
    href: '/billing/plans',
    group: 'billing',
    description: 'Upgrade or downgrade your billing plan',
  },
  {
    id: 'settings',
    label: 'Settings',
    group: 'account',
    keywords: ['preferences'],
    children: [
      { id: 'settings-profile', label: 'Profile Settings', href: '/settings/profile' },
      {
        id: 'settings-security',
        label: 'Security Settings',
        href: '/settings/security',
        keywords: ['password'],
      },
      {
        id: 'settings-billing',
        label: 'Billing Settings',
        href: '/settings/billing',
        group: 'billing',
      },
      { id: 'settings-debug', label: 'Settings Debug', href: '/settings/debug', hidden: true },
    ],
  },
  {
    id: 'team',
    label: 'Team Members',
    href: '/team',
    group: 'account',
    permissions: ['team.view'],
  },
  { id: 'admin', label: 'Admin Console', href: '/admin', group: 'admin', permissions: ['admin'] },
  { id: 'beta', label: 'Beta Lab', href: '/beta', when: () => false },
  { id: 'secret', label: 'Secret Settings', href: '/secret', hidden: true },
  { id: 'logout', label: 'Log Out', group: 'account', action: () => {}, disabled: true },
  { id: 'reports', label: 'Reports', href: '/reports', group: 'insights', scope: ['/billing'] },
  { id: 'usage', label: 'Usage Reports', href: '/usage', group: 'insights', keywords: ['billing'] },
  { id: 'status', label: 'System Status', href: '/status' },
]

const MANY: CommandItem[] = Array.from({ length: 55 }, (_, i) => {
  const n = String(i + 1).padStart(2, '0')
  return { id: `item-${n}`, label: `Item ${n}`, priority: i % 3 }
})

function fullConfig(): CommandEngineConfig {
  const storage = createInMemoryStorage()
  const used = (id: string, count: number, ago: number) =>
    storage.set(id, { id, count, lastUsed: NOW - ago, halfLifeScore: 0 })
  used('docs', 3, DAY)
  used('billing-history', 1, DAY / 12)
  used('team', 6, 10 * DAY)
  used('reports', 2, 3 * DAY)
  return {
    synonyms: { billing: ['money', 'payment'], settings: ['preferences'] },
    groups: [
      { id: 'billing', label: 'Billing', priority: 10 },
      { id: 'account', label: 'Account', priority: 5 },
    ],
    accessControl: createSimpleAccessProvider(['team.view']),
    context: { path: '/billing/cards' },
    frecency: { storage, showRecent: true, recentCount: 2 },
    maxResults: 6,
  }
}

function setup(config: CommandEngineConfig, commands: CommandItem[]) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <CommandEngineProvider config={config}>{children}</CommandEngineProvider>
  }
  return renderHook(
    () => {
      useCommandRegister(commands)
      return useCommandPalette()
    },
    { wrapper: Wrapper },
  )
}

const round = (n: number) => Math.round(n * 1e6) / 1e6

function capture(p: UseCommandPaletteReturn) {
  return {
    results: p.results.map((r) => `${r.item.id}|${r.item.group ?? '-'}|${round(r.score)}`),
    grouped: p.groupedResults.map(
      (g) => `${g.group.id}:${g.group.label}=${g.items.map((s) => s.item.id).join(',')}`,
    ),
    groups: p.groups.map((g) => g.id),
    depth: p.depth,
    breadcrumbs: p.breadcrumbs.map((b) => b.id),
    isLoading: p.isLoading,
  }
}

async function settle() {
  await act(async () => {})
}

describe('golden master: results pipeline', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('root queries with recents, synonyms, access, context boost, groups and maxResults', async () => {
    const { result } = setup(fullConfig(), COMMANDS)
    await settle()

    const actual: Record<string, ReturnType<typeof capture>> = {}
    for (const query of ['', '   ', 'bill', 'money', 'set', 'rep', 'log', 'admin', 'beta', 'xyz']) {
      act(() => result.current.setSearch(query))
      expect(result.current.flatResults).toBe(result.current.results)
      actual[JSON.stringify(query)] = capture(result.current)
    }

    expect(actual).toEqual(ROOT_EXPECTED)
  })

  it('nested pages: drill down, search children, drill up', async () => {
    const { result } = setup(fullConfig(), COMMANDS)
    await settle()

    act(() => result.current.setSearch('sett'))
    const settings = result.current.results.find((r) => r.item.id === 'settings')!.item

    const actual: Record<string, ReturnType<typeof capture>> = {}
    act(() => result.current.drillDown(settings))
    actual['drill'] = capture(result.current)
    for (const query of ['bill', 'debug', 'pass']) {
      act(() => result.current.setSearch(query))
      actual[query] = capture(result.current)
    }
    act(() => result.current.drillUp())
    actual['up'] = capture(result.current)

    expect(actual).toEqual(NESTED_EXPECTED)
  })

  it('default maxResults caps at 50', async () => {
    const { result } = setup({ frecency: { storage: createInMemoryStorage() } }, MANY)
    await settle()

    const actual: Record<string, string> = {}
    for (const query of ['', 'item', 'item 1']) {
      act(() => result.current.setSearch(query))
      actual[JSON.stringify(query)] =
        `${result.current.results.length}:` +
        result.current.results.map((r) => `${r.item.id}@${round(r.score)}`).join(',')
    }

    expect(actual).toEqual(MANY_EXPECTED)
  })

  it('results, groupedResults and groups keep their identity when inputs are unchanged', async () => {
    const { result, rerender } = setup(fullConfig(), COMMANDS)
    await settle()

    act(() => result.current.setSearch('bill'))
    const { results, groupedResults, groups } = result.current

    rerender()
    act(() => result.current.open())
    await settle()

    expect(result.current.isOpen).toBe(true)
    expect(result.current.results).toBe(results)
    expect(result.current.groupedResults).toBe(groupedResults)
    expect(result.current.groups).toBe(groups)

    act(() => result.current.setSearch('bill'))
    expect(result.current.results).toBe(results)
  })
})

const ROOT_EXPECTED: Record<string, unknown> = {
  '""': {
    results: [
      'billing-history|Recent|1',
      'docs|Recent|1',
      'team|account|1',
      'reports|insights|0.9',
      'home|-|0.7',
      'billing-overview|billing|0.7',
    ],
    grouped: [
      'billing:Billing=billing-overview',
      'account:Account=team',
      'Recent:Recent=billing-history,docs',
      'insights:insights=reports',
      '__ungrouped__:Other=home',
    ],
    groups: ['billing', 'account', 'Recent', 'insights', '__ungrouped__'],
    depth: 0,
    breadcrumbs: [],
    isLoading: false,
  },
  '"   "': {
    results: [
      'billing-history|Recent|1',
      'docs|Recent|1',
      'team|account|1',
      'reports|insights|0.9',
      'home|-|0.7',
      'billing-overview|billing|0.7',
    ],
    grouped: [
      'billing:Billing=billing-overview',
      'account:Account=team',
      'Recent:Recent=billing-history,docs',
      'insights:insights=reports',
      '__ungrouped__:Other=home',
    ],
    groups: ['billing', 'account', 'Recent', 'insights', '__ungrouped__'],
    depth: 0,
    breadcrumbs: [],
    isLoading: false,
  },
  '"bill"': {
    results: [
      'billing-history|billing|0.965',
      'billing-overview|billing|0.865',
      'usage|insights|0.56525',
      'billing-plans|billing|0.392',
    ],
    grouped: [
      'billing:Billing=billing-history,billing-overview,billing-plans',
      'insights:insights=usage',
    ],
    groups: ['billing', 'insights'],
    depth: 0,
    breadcrumbs: [],
    isLoading: false,
  },
  '"money"': {
    results: ['usage|insights|0.385'],
    grouped: ['insights:insights=usage'],
    groups: ['insights'],
    depth: 0,
    breadcrumbs: [],
    isLoading: false,
  },
  '"set"': {
    results: ['settings|account|0.665', 'secret|-|0.56'],
    grouped: ['account:Account=settings', '__ungrouped__:Other=secret'],
    groups: ['account', '__ungrouped__'],
    depth: 0,
    breadcrumbs: [],
    isLoading: false,
  },
  '"rep"': {
    results: ['reports|insights|1', 'usage|insights|0.56'],
    grouped: ['insights:insights=reports,usage'],
    groups: ['insights'],
    depth: 0,
    breadcrumbs: [],
    isLoading: false,
  },
  '"log"': {
    results: ['logout|account|0.665'],
    grouped: ['account:Account=logout'],
    groups: ['account'],
    depth: 0,
    breadcrumbs: [],
    isLoading: false,
  },
  '"admin"': {
    results: [],
    grouped: [],
    groups: [],
    depth: 0,
    breadcrumbs: [],
    isLoading: false,
  },
  '"beta"': {
    results: [],
    grouped: [],
    groups: [],
    depth: 0,
    breadcrumbs: [],
    isLoading: false,
  },
  '"xyz"': {
    results: [],
    grouped: [],
    groups: [],
    depth: 0,
    breadcrumbs: [],
    isLoading: false,
  },
}
const NESTED_EXPECTED: Record<string, unknown> = {
  drill: {
    results: ['settings-profile|-|0.7', 'settings-security|-|0.7', 'settings-billing|billing|0.7'],
    grouped: [
      'billing:Billing=settings-billing',
      '__ungrouped__:Other=settings-profile,settings-security',
    ],
    groups: ['billing', '__ungrouped__'],
    depth: 1,
    breadcrumbs: ['settings'],
    isLoading: false,
  },
  bill: {
    results: ['settings-billing|billing|0.665'],
    grouped: ['billing:Billing=settings-billing'],
    groups: ['billing'],
    depth: 1,
    breadcrumbs: ['settings'],
    isLoading: false,
  },
  debug: {
    results: ['settings-debug|-|0.56'],
    grouped: ['__ungrouped__:Other=settings-debug'],
    groups: ['__ungrouped__'],
    depth: 1,
    breadcrumbs: ['settings'],
    isLoading: false,
  },
  pass: {
    results: ['settings-security|-|0.56525'],
    grouped: ['__ungrouped__:Other=settings-security'],
    groups: ['__ungrouped__'],
    depth: 1,
    breadcrumbs: ['settings'],
    isLoading: false,
  },
  up: {
    results: [
      'billing-history|Recent|1',
      'docs|Recent|1',
      'team|account|1',
      'reports|insights|0.9',
      'home|-|0.7',
      'billing-overview|billing|0.7',
    ],
    grouped: [
      'billing:Billing=billing-overview',
      'account:Account=team',
      'Recent:Recent=billing-history,docs',
      'insights:insights=reports',
      '__ungrouped__:Other=home',
    ],
    groups: ['billing', 'account', 'Recent', 'insights', '__ungrouped__'],
    depth: 0,
    breadcrumbs: [],
    isLoading: false,
  },
}
const MANY_EXPECTED: Record<string, unknown> = {
  '""': '50:item-03@0.7,item-06@0.7,item-09@0.7,item-12@0.7,item-15@0.7,item-18@0.7,item-21@0.7,item-24@0.7,item-27@0.7,item-30@0.7,item-33@0.7,item-36@0.7,item-39@0.7,item-42@0.7,item-45@0.7,item-48@0.7,item-51@0.7,item-54@0.7,item-02@0.7,item-05@0.7,item-08@0.7,item-11@0.7,item-14@0.7,item-17@0.7,item-20@0.7,item-23@0.7,item-26@0.7,item-29@0.7,item-32@0.7,item-35@0.7,item-38@0.7,item-41@0.7,item-44@0.7,item-47@0.7,item-50@0.7,item-53@0.7,item-01@0.7,item-04@0.7,item-07@0.7,item-10@0.7,item-13@0.7,item-16@0.7,item-19@0.7,item-22@0.7,item-25@0.7,item-28@0.7,item-31@0.7,item-34@0.7,item-37@0.7,item-40@0.7',
  '"item"':
    '50:item-03@0.665,item-06@0.665,item-09@0.665,item-12@0.665,item-15@0.665,item-18@0.665,item-21@0.665,item-24@0.665,item-27@0.665,item-30@0.665,item-33@0.665,item-36@0.665,item-39@0.665,item-42@0.665,item-45@0.665,item-48@0.665,item-51@0.665,item-54@0.665,item-02@0.665,item-05@0.665,item-08@0.665,item-11@0.665,item-14@0.665,item-17@0.665,item-20@0.665,item-23@0.665,item-26@0.665,item-29@0.665,item-32@0.665,item-35@0.665,item-38@0.665,item-41@0.665,item-44@0.665,item-47@0.665,item-50@0.665,item-53@0.665,item-01@0.665,item-04@0.665,item-07@0.665,item-10@0.665,item-13@0.665,item-16@0.665,item-19@0.665,item-22@0.665,item-25@0.665,item-28@0.665,item-31@0.665,item-34@0.665,item-37@0.665,item-40@0.665',
  '"item 1"':
    '15:item-12@0.665,item-15@0.665,item-18@0.665,item-11@0.665,item-14@0.665,item-17@0.665,item-10@0.665,item-13@0.665,item-16@0.665,item-19@0.665,item-21@0.42,item-51@0.42,item-41@0.42,item-01@0.42,item-31@0.42',
}
