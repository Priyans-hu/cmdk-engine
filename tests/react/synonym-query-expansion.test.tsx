import { describe, it, expect, vi, afterEach } from 'vitest'
import React from 'react'
import { renderHook, act } from '@testing-library/react'
import { CommandEngineProvider } from '../../src/react/context'
import { useCommandPalette } from '../../src/react/use-command-palette'
import type { UseCommandPaletteReturn } from '../../src/react/use-command-palette'
import { useCommandRegister } from '../../src/react/use-command-register'
import { createFuzzySearch } from '../../src/core/search'
import { createMatchSorterSearch } from '../../src/core/search-match-sorter'
import { createInMemoryStorage } from '../../src/core/frecency'
import { createSimpleAccessProvider } from '../../src/core/access-control'
import type {
  AsyncSource,
  CommandEngineConfig,
  CommandItem,
  ScoredItem,
  SearchEngine,
} from '../../src/core/types'

// Query-side synonym expansion in the results pipeline: a query equal to a
// synonym key or value also returns what the other terms match, after the
// direct matches. Any other query must give exactly what the engine returns.

type Load = AsyncSource['load']

// The README Quick Start config and command.
const README_SYNONYMS = {
  billing: ['money', 'payment', 'credits'],
  settings: ['preferences', 'config', 'options'],
}
const BILLING_OVERVIEW: CommandItem = {
  id: 'billing-overview',
  label: 'Billing Overview',
  href: '/billing/overview',
  keywords: ['balance', 'credits'],
  group: 'Billing',
}

const COMMANDS: CommandItem[] = [
  BILLING_OVERVIEW,
  { id: 'cards', label: 'Payment Cards', group: 'Billing' },
  { id: 'transfer', label: 'Money Transfer' },
  { id: 'profile', label: 'Profile Settings', keywords: ['account'] },
  { id: 'home', label: 'Home', priority: 5 },
]

/** Render one palette consumer; frecency starts empty so scores stay the engine's. */
function renderPalette(config: CommandEngineConfig, commands: CommandItem[]) {
  const full = { frecency: { storage: createInMemoryStorage() }, ...config }
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <CommandEngineProvider config={full}>{children}</CommandEngineProvider>
  }
  return renderHook(
    () => {
      useCommandRegister(commands)
      return useCommandPalette()
    },
    { wrapper: Wrapper },
  )
}

/** Wraps an engine and records each call's query and the array it returned. */
function spyEngine(engine: SearchEngine = createFuzzySearch()) {
  const calls: { query: string; result: ScoredItem[] }[] = []
  const spy: SearchEngine = {
    search(query, items) {
      const result = engine.search(query, items)
      calls.push({ query, result })
      return result
    },
  }
  return { spy, calls }
}

/** Matches labels containing the query, scored by `meta.score` (an engine's own scale). */
const labelEngine: SearchEngine = {
  search: (query, items) =>
    items
      .filter((item) => item.label.toLowerCase().includes(query.toLowerCase().trim()))
      .map((item) => ({ item, score: item.meta?.score as number }))
      .sort((a, b) => b.score - a.score),
}

const scored = (id: string, label: string, score: number): CommandItem => ({
  id,
  label,
  meta: { score },
})

const ids = (palette: UseCommandPaletteReturn) => palette.results.map((r) => r.item.id)
const tick = () => new Promise((resolve) => setTimeout(resolve, 50))

afterEach(() => {
  vi.useRealTimers()
})

describe('synonym query expansion', () => {
  it('README example: "money" and "payment" find Billing Overview', () => {
    const { result } = renderPalette({ synonyms: README_SYNONYMS }, [BILLING_OVERVIEW])

    for (const query of ['money', 'payment', 'MONEY', '  money  ']) {
      act(() => result.current.setSearch(query))
      expect(ids(result.current)).toEqual(['billing-overview'])
      expect(result.current.groupedResults.map((g) => g.group.id)).toEqual(['Billing'])
    }
  })

  it('a synonym key also returns the matches of its values, after the direct ones', () => {
    const { result } = renderPalette({ synonyms: { billing: ['money', 'payment'] } }, COMMANDS)

    act(() => result.current.setSearch('billing'))
    // Direct first; then "money" and "payment" matches, ties in term order.
    expect(ids(result.current)).toEqual(['billing-overview', 'transfer', 'cards'])
  })

  it('direct matches keep their order; synonym-only matches never outscore the weakest one', () => {
    const commands = [
      scored('transfer', 'Money transfer', 0.9),
      scored('both', 'Money and billing', 0.6),
      scored('moneybox', 'Moneybox', 0.2),
      scored('overview', 'Billing overview', 1),
      scored('invoices', 'Billing invoices', 0.5),
      scored('cards', 'Payment cards', 0.8),
    ]
    const { result } = renderPalette(
      { searchEngine: labelEngine, synonyms: { billing: ['money', 'payment'] } },
      commands,
    )

    act(() => result.current.setSearch('money'))
    // "both" matches "money" directly and "billing" too: it appears once, as a direct match.
    expect(ids(result.current)).toEqual(['transfer', 'both', 'moneybox', 'overview', 'invoices'])
    const scores = result.current.results.map((r) => r.score)
    expect(Math.max(...scores.slice(3))).toBeLessThanOrEqual(scores[2])

    act(() => result.current.setSearch('billing'))
    expect(ids(result.current)).toEqual([
      'overview',
      'both',
      'invoices',
      'transfer',
      'cards',
      'moneybox',
    ])
  })

  it('calls the engine once for the query and once per extra term', () => {
    const { spy, calls } = spyEngine()
    const { result } = renderPalette(
      { searchEngine: spy, synonyms: { billing: ['money', 'payment'] } },
      COMMANDS,
    )

    const queriesFor = (query: string) => {
      calls.length = 0
      act(() => result.current.setSearch(query))
      return calls.map((c) => c.query)
    }
    expect(queriesFor('billing')).toEqual(['billing', 'money', 'payment'])
    // The query's own term is not searched twice.
    expect(queriesFor('Money ')).toEqual(['Money ', 'billing'])
    expect(queriesFor('mon')).toEqual(['mon'])
  })

  it('works with match-sorter before it loads (fallback ranker)', () => {
    const engine = createMatchSorterSearch()
    // Synchronous from here on, so match-sorter cannot finish loading.
    const { result } = renderPalette({ searchEngine: engine, synonyms: README_SYNONYMS }, [
      BILLING_OVERVIEW,
    ])

    act(() => result.current.setSearch('money'))
    expect(ids(result.current)).toEqual(['billing-overview'])
    // Still the fallback: a label prefix scores 0.9 there.
    expect(engine.search('bill', [BILLING_OVERVIEW])[0].score).toBe(0.9)
  })

  it('works with match-sorter once loaded', async () => {
    await import('match-sorter')
    const engine = createMatchSorterSearch()
    await tick()
    // Loaded: a single match-sorter hit scores 1.
    expect(engine.search('bill', [BILLING_OVERVIEW])[0].score).toBe(1)

    const { result } = renderPalette({ searchEngine: engine, synonyms: README_SYNONYMS }, [
      BILLING_OVERVIEW,
    ])
    act(() => result.current.setSearch('money'))
    expect(ids(result.current)).toEqual(['billing-overview'])
  })

  it('finds hidden commands like a direct query does, and keeps them out of the empty list', () => {
    const { result } = renderPalette({ synonyms: { billing: ['money'] } }, [
      { id: 'billing-debug', label: 'Billing Debug', hidden: true },
      { id: 'home', label: 'Home' },
    ])

    act(() => result.current.setSearch('billing'))
    expect(ids(result.current)).toEqual(['billing-debug'])
    act(() => result.current.setSearch('money'))
    expect(ids(result.current)).toEqual(['billing-debug'])
    act(() => result.current.setSearch(''))
    expect(ids(result.current)).toEqual(['home'])
  })

  it('never returns commands that `when` or permissions exclude', () => {
    const { result } = renderPalette(
      {
        synonyms: { billing: ['money'] },
        accessControl: createSimpleAccessProvider(['billing.view']),
      },
      [
        { id: 'billing', label: 'Billing Overview', permissions: ['billing.view'] },
        { id: 'billing-beta', label: 'Billing Beta', when: () => false },
        { id: 'billing-admin', label: 'Billing Admin', permissions: ['admin'] },
      ],
    )

    act(() => result.current.setSearch('money'))
    expect(ids(result.current)).toEqual(['billing'])
  })

  it('expands inside a nested page, against its children', () => {
    const { result } = renderPalette({ synonyms: { billing: ['money'] } }, [
      {
        id: 'settings',
        label: 'Settings',
        children: [
          { id: 'settings-billing', label: 'Billing Settings' },
          { id: 'settings-profile', label: 'Profile' },
        ],
      },
      { id: 'billing', label: 'Billing Overview' },
    ])

    const settings = result.current.results.find((r) => r.item.id === 'settings')!.item
    act(() => result.current.drillDown(settings))
    act(() => result.current.setSearch('money'))
    expect(ids(result.current)).toEqual(['settings-billing'])
  })

  it('client-filtered async items gain synonym matches; unfiltered ones are unchanged', async () => {
    vi.useFakeTimers()
    const remote = vi.fn<Load>(async () => [
      { id: 'remote-billing', label: 'Billing Export' },
      { id: 'remote-other', label: 'Other' },
    ])
    const server = vi.fn<Load>(async () => [{ id: 'server-hit', label: 'Server Hit' }])
    const { result } = renderPalette(
      {
        synonyms: { billing: ['money'] },
        asyncSources: [
          { id: 'remote', load: remote },
          { id: 'server', load: server, shouldFilter: false },
        ],
      },
      [],
    )

    act(() => result.current.setSearch('money'))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200)
    })

    expect(ids(result.current)).toEqual(['remote-billing', 'server-hit'])
    // Loads run for the typed query only, once per source.
    expect(remote.mock.calls.map(([query]) => query)).toEqual(['money'])
    expect(server.mock.calls.map(([query]) => query)).toEqual(['money'])
  })

  it('works with an inline config object created on every render', () => {
    function Wrapper({ children }: { children: React.ReactNode }) {
      return (
        <CommandEngineProvider config={{ synonyms: { billing: ['money'] } }}>
          {children}
        </CommandEngineProvider>
      )
    }
    const { result, rerender } = renderHook(
      () => {
        useCommandRegister([BILLING_OVERVIEW])
        return useCommandPalette()
      },
      { wrapper: Wrapper },
    )

    act(() => result.current.setSearch('money'))
    expect(ids(result.current)).toEqual(['billing-overview'])
    rerender()
    expect(ids(result.current)).toEqual(['billing-overview'])
  })
})

describe('synonym query expansion · queries that do not expand are unchanged', () => {
  /** The palette shows exactly what one engine call for `query` returned, in order. */
  function expectEngineResults(
    palette: UseCommandPaletteReturn,
    calls: { query: string; result: ScoredItem[] }[],
    query: string,
  ) {
    expect(calls.map((c) => c.query)).toEqual([query])
    const items = calls[0].result.map((s) => s.item)
    expect(palette.results).toHaveLength(items.length)
    palette.results.forEach((r, i) => expect(r.item).toBe(items[i]))
  }

  it('without synonyms, every query gives exactly what the engine returns', () => {
    const { spy, calls } = spyEngine()
    const { result } = renderPalette({ searchEngine: spy }, COMMANDS)

    for (const query of ['money', 'payment', 'billing', 'bill', 'card', 'xyz', '']) {
      calls.length = 0
      act(() => result.current.setSearch(query))
      expectEngineResults(result.current, calls, query)
    }
  })

  it('with synonyms, a query that is not a key or value gives exactly what the engine returns', () => {
    const { spy, calls } = spyEngine()
    const { result } = renderPalette({ searchEngine: spy, synonyms: README_SYNONYMS }, COMMANDS)

    // Partial words and longer phrases do not expand.
    for (const query of ['bill', 'mon', 'money transfer', 'over', 'account', 'xyz', '   ', '']) {
      calls.length = 0
      act(() => result.current.setSearch(query))
      expectEngineResults(result.current, calls, query)
    }
  })

  it('maxResults still caps the list, direct matches first', () => {
    const { result } = renderPalette({ synonyms: { billing: ['money'] }, maxResults: 1 }, COMMANDS)

    act(() => result.current.setSearch('money'))
    expect(ids(result.current)).toEqual(['transfer'])
  })
})
