import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { renderHook, act } from '@testing-library/react'
import { CommandEngineProvider } from '../../src/react/context'
import { useCommandPalette } from '../../src/react/use-command-palette'
import { useSearchHistory } from '../../src/react/use-search-history'
import { useFrecency } from '../../src/react/use-frecency'
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

  it('shares open + search state across every consumer under one provider', () => {
    // Previously each useCommandPalette() owned its own state, so a Cmd+K
    // shortcut hook and the rendered palette never synced (broken quickstart).
    const { result } = renderHook(
      () => ({ a: useCommandPalette(), b: useCommandPalette() }),
      { wrapper: wrapperWith({}) },
    )
    expect(result.current.a.isOpen).toBe(false)
    expect(result.current.b.isOpen).toBe(false)

    act(() => result.current.a.toggle())
    expect(result.current.a.isOpen).toBe(true)
    expect(result.current.b.isOpen).toBe(true)

    act(() => result.current.b.setSearch('hello'))
    expect(result.current.a.search).toBe('hello')

    act(() => result.current.a.close())
    expect(result.current.b.isOpen).toBe(false)
    expect(result.current.b.search).toBe('')
  })

  it('persists frecency to localStorage by default', () => {
    localStorage.removeItem('cmdk-frecency')
    const { result } = renderHook(() => useFrecency(), { wrapper: wrapperWith({}) })
    act(() => result.current.recordUsage('persist-me'))
    expect(localStorage.getItem('cmdk-frecency')).toContain('persist-me')
  })

  it('useFrecency records, scores, lists recent, and clears', () => {
    localStorage.removeItem('cmdk-frecency')
    const { result } = renderHook(() => useFrecency(), { wrapper: wrapperWith({}) })
    act(() => {
      result.current.recordUsage('a')
      result.current.recordUsage('b')
    })
    expect(result.current.getScore('a')).toBeGreaterThan(0)
    expect(result.current.getRecent()).toContain('b')
    act(() => result.current.clear())
    expect(result.current.getScore('a')).toBe(0)
    expect(result.current.getRecent()).toHaveLength(0)
  })

  it('throws a helpful error when used outside a provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => renderHook(() => useCommandPalette())).toThrow(/CommandEngineProvider/)
    spy.mockRestore()
  })

  it('persists search history to localStorage by default when enabled', () => {
    localStorage.removeItem('cmdk-search-history')
    const { result } = renderHook(() => useCommandPalette(), {
      wrapper: wrapperWith({ searchHistory: { enabled: true, minQueryLength: 2 } }),
    })
    act(() => result.current.setSearch('billing'))
    act(() => result.current.select(leaf({ action: () => {} })))
    expect(localStorage.getItem('cmdk-search-history')).toContain('billing')
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
