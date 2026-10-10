import { describe, it, expect } from 'vitest'
import React from 'react'
import { renderHook, act } from '@testing-library/react'
import { CommandEngineProvider } from '../../src/react/context'
import { useCommandPalette } from '../../src/react/use-command-palette'
import type { UseCommandPaletteReturn } from '../../src/react/use-command-palette'
import { useCommandRegister } from '../../src/react/use-command-register'
import { createMatchSorterSearch } from '../../src/core/search-match-sorter'
import { createInMemoryStorage } from '../../src/core/frecency'
import type { CommandEngineConfig, CommandItem } from '../../src/core/types'

// Search in the results pipeline: words in any order and folded text, how they
// compose with query-side synonym expansion, and the match-sorter backend.

const COMMANDS: CommandItem[] = [
  { id: 'billing', label: 'Billing Overview', keywords: ['invoices'] },
  { id: 'resume', label: 'Résumé' },
  { id: 'settings', label: 'Settings' },
  { id: 'team', label: 'Team Members', description: 'Invite people' },
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

const ids = (palette: UseCommandPaletteReturn) => palette.results.map((r) => r.item.id)
const tick = () => new Promise((resolve) => setTimeout(resolve, 50))

describe('search in the palette', () => {
  it('finds the words of a query in any order, and ignores accents', () => {
    const { result } = renderPalette({}, COMMANDS)
    act(() => result.current.setSearch('overview billing'))
    expect(ids(result.current)).toEqual(['billing'])
    act(() => result.current.setSearch('invoices  billing'))
    expect(ids(result.current)).toEqual(['billing'])
    act(() => result.current.setSearch('resume'))
    expect(ids(result.current)).toEqual(['resume'])
  })

  it('lists whole-query matches, then any-order matches, then synonym-only matches', () => {
    const commands: CommandItem[] = [
      { id: 'synonym-only', label: 'Sign out everywhere' },
      { id: 'any-order', label: 'Off the log' },
      { id: 'whole-query', label: 'Log off now' },
    ]
    const { result } = renderPalette({ synonyms: { 'log off': ['sign out'] } }, commands)
    act(() => result.current.setSearch('log off'))
    expect(ids(result.current)).toEqual(['whole-query', 'any-order', 'synonym-only'])
    const scores = result.current.results.map((r) => r.score)
    expect(scores).toEqual([...scores].sort((a, b) => b - a))
  })

  it('match-sorter: finds synonym keywords and words in any order', () => {
    const searchEngine = createMatchSorterSearch()
    const { result } = renderPalette(
      { searchEngine, synonyms: { settings: ['preferences'] } },
      COMMANDS,
    )
    act(() => result.current.setSearch('prefer'))
    expect(ids(result.current)).toEqual(['settings'])
    act(() => result.current.setSearch('overview billing'))
    expect(ids(result.current)).toEqual(['billing'])
  })

  it('match-sorter created inline ranks the same before and after a re-render', async () => {
    function Wrapper({ children }: { children: React.ReactNode }) {
      // A new engine on every render, as with an inline config object.
      const config = {
        searchEngine: createMatchSorterSearch(),
        frecency: { storage: createInMemoryStorage() },
      }
      return <CommandEngineProvider config={config}>{children}</CommandEngineProvider>
    }
    const { result, rerender } = renderHook(
      () => {
        useCommandRegister(COMMANDS)
        return useCommandPalette()
      },
      { wrapper: Wrapper },
    )

    // Only match-sorter matches descriptions.
    act(() => result.current.setSearch('invite'))
    expect(ids(result.current)).toEqual(['team'])
    rerender()
    expect(ids(result.current)).toEqual(['team'])
    await act(tick)
    expect(ids(result.current)).toEqual(['team'])
  })
})
