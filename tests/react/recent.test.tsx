import { describe, it, expect, beforeEach } from 'vitest'
import React from 'react'
import { renderHook, act } from '@testing-library/react'
import { CommandEngineProvider } from '../../src/react/context'
import { useCommandPalette } from '../../src/react/use-command-palette'
import type { UseCommandPaletteReturn } from '../../src/react/use-command-palette'
import { useCommandRegister } from '../../src/react/use-command-register'
import type { CommandEngineConfig, CommandItem } from '../../src/core/types'

const COMMANDS: CommandItem[] = [
  { id: 'new-doc', label: 'New Document', group: 'actions', action: () => {} },
  { id: 'billing', label: 'Billing', group: 'nav', action: () => {} },
  { id: 'help', label: 'Help', action: () => {} },
]

const GROUPS = [
  { id: 'actions', label: 'Actions', priority: 2 },
  { id: 'nav', label: 'Navigation', priority: 1 },
]

function renderPalette(config: CommandEngineConfig, commands: CommandItem[] = COMMANDS) {
  return renderHook(
    () => {
      useCommandRegister(commands)
      return useCommandPalette()
    },
    {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <CommandEngineProvider config={config}>{children}</CommandEngineProvider>
      ),
    },
  )
}

const headings = (palette: UseCommandPaletteReturn) =>
  palette.groupedResults.map((g) => g.group.label)

// Registry updates reach subscribers in a microtask.
const flush = () => act(async () => {})

async function use(result: { current: UseCommandPaletteReturn }, query: string, id: string) {
  act(() => result.current.setSearch(query))
  act(() => result.current.select(id))
  await flush()
}

beforeEach(() => {
  localStorage.clear()
})

describe('Recent group with configured groups', () => {
  it('comes first, above the configured groups', async () => {
    const { result } = renderPalette({ frecency: { showRecent: true }, groups: GROUPS })
    await flush()

    await use(result, 'help', 'help')

    expect(headings(result.current)).toEqual(['Recent', 'Actions', 'Navigation'])
    expect(result.current.groups.map((g) => g.id)).toEqual(['Recent', 'actions', 'nav'])
  })

  it('uses recentLabel, and leaves search results in relevance order', async () => {
    const { result } = renderPalette({
      frecency: { showRecent: true, recentLabel: 'Lately' },
      groups: GROUPS,
    })
    await flush()
    await use(result, 'bill', 'billing')

    expect(headings(result.current)).toEqual(['Lately', 'Actions', 'Other'])

    act(() => result.current.setSearch('new'))
    expect(headings(result.current)).toEqual(['Actions'])
  })
})

describe('Recent group with page-scoped commands', () => {
  it('fills recentCount from commands available here', async () => {
    // Minutes old, well inside the frecency maxAge (30 days)
    const used = (id: string, minutesAgo: number) => ({
      id,
      count: 1,
      lastUsed: Date.now() - minutesAgo * 60_000,
      halfLifeScore: 0,
    })
    localStorage.setItem(
      'cmdk-frecency',
      JSON.stringify({
        elsewhere1: used('elsewhere1', 1),
        elsewhere2: used('elsewhere2', 2),
        help: used('help', 3),
        billing: used('billing', 4),
      }),
    )
    const { result } = renderPalette({ frecency: { showRecent: true, recentCount: 2 } })
    await flush()

    const recent = result.current.results.filter((r) => r.item.group === 'Recent')
    expect(recent.map((r) => r.item.id)).toEqual(['help', 'billing'])
  })
})
