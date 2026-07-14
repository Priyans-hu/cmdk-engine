import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { renderHook, act } from '@testing-library/react'
import { CommandEngineProvider } from '../../src/react/context'
import { useCommandPalette } from '../../src/react/use-command-palette'
import { useSearchHistory } from '../../src/react/use-search-history'
import type { CommandEngineConfig, CommandItem } from '../../src/core/types'

function wrapperWith(config: CommandEngineConfig = {}) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <CommandEngineProvider config={config}>{children}</CommandEngineProvider>
  }
}

const leaf = (o: Partial<CommandItem>): CommandItem => ({ id: 'a', label: 'Alpha', ...o })

describe('useCommandPalette · select()', () => {
  it('calls config.onNavigate for href commands instead of hard navigation', () => {
    const onNavigate = vi.fn()
    const { result } = renderHook(() => useCommandPalette(), { wrapper: wrapperWith({ onNavigate }) })
    act(() => result.current.select(leaf({ href: '/home' })))
    expect(onNavigate).toHaveBeenCalledWith('/home', expect.objectContaining({ id: 'a' }))
  })

  it('per-call onSelect overrides the provider-level onSelect', () => {
    const providerOnSelect = vi.fn()
    const perCall = vi.fn()
    const { result } = renderHook(() => useCommandPalette(), {
      wrapper: wrapperWith({ onSelect: providerOnSelect }),
    })
    act(() => result.current.select(leaf({ href: '/x' }), { onSelect: perCall }))
    expect(perCall).toHaveBeenCalledOnce()
    expect(providerOnSelect).not.toHaveBeenCalled()
  })

  it('falls back to provider onSelect, then to item.action', () => {
    const providerOnSelect = vi.fn()
    const { result } = renderHook(() => useCommandPalette(), {
      wrapper: wrapperWith({ onSelect: providerOnSelect }),
    })
    act(() => result.current.select(leaf({ href: '/x' })))
    expect(providerOnSelect).toHaveBeenCalledOnce()

    const action = vi.fn()
    const { result: r2 } = renderHook(() => useCommandPalette(), { wrapper: wrapperWith({}) })
    act(() => r2.current.select(leaf({ action })))
    expect(action).toHaveBeenCalledOnce()
  })

  it('records search history through select() when enabled (adapter used to drop this)', () => {
    const { result } = renderHook(
      () => ({ palette: useCommandPalette(), history: useSearchHistory() }),
      { wrapper: wrapperWith({ searchHistory: { enabled: true, minQueryLength: 2 } }) },
    )
    act(() => result.current.palette.setSearch('alp'))
    act(() => result.current.palette.select(leaf({ action: () => {} })))
    expect(result.current.history.getRecent().map((e) => e.query)).toContain('alp')
  })

  it('drills into children instead of executing the parent', () => {
    const action = vi.fn()
    const { result } = renderHook(() => useCommandPalette(), { wrapper: wrapperWith({}) })
    act(() =>
      result.current.select(
        leaf({ children: [leaf({ id: 'child', label: 'Child', action })] }),
      ),
    )
    expect(action).not.toHaveBeenCalled()
    expect(result.current.depth).toBe(1)
    expect(result.current.breadcrumbs.map((b) => b.id)).toEqual(['a'])
  })
})
