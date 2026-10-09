import { describe, it, expect } from 'vitest'
import React from 'react'
import { renderHook, act } from '@testing-library/react'
import { CommandEngineProvider, useEngineContext } from '../../src/react/context'
import { useCommandRegister } from '../../src/react/use-command-register'
import { useCommandPalette } from '../../src/react/use-command-palette'
import type { CommandItem } from '../../src/core/types'

function wrapper({ children }: { children: React.ReactNode }) {
  return <CommandEngineProvider>{children}</CommandEngineProvider>
}

describe('useCommandRegister', () => {
  it('registers commands on mount and unregisters on unmount', () => {
    const { result, unmount } = renderHook(
      () => {
        useCommandRegister([{ id: 'a', label: 'Alpha' }])
        return useEngineContext().registry
      },
      { wrapper },
    )
    expect(result.current.getById('a')?.label).toBe('Alpha')
    unmount()
    expect(result.current.getById('a')).toBeUndefined()
  })

  it('action always calls the latest closure (no stale capture)', () => {
    const seen: number[] = []
    const { result, rerender } = renderHook(
      ({ n }: { n: number }) => {
        useCommandRegister([{ id: 'a', label: 'Alpha', action: () => void seen.push(n) }])
        return useEngineContext().registry
      },
      { wrapper, initialProps: { n: 1 } },
    )
    // Shape is unchanged across the rerender, so no re-registration happens —
    // yet the action must still see the newest `n`.
    rerender({ n: 2 })
    const cmd = result.current.getById('a')!
    cmd.action!(cmd)
    expect(seen).toEqual([2])
  })

  it('re-registers when the command shape changes', () => {
    const { result, rerender } = renderHook(
      ({ label }: { label: string }) => {
        useCommandRegister([{ id: 'a', label }])
        return useEngineContext().registry
      },
      { wrapper, initialProps: { label: 'First' } },
    )
    expect(result.current.getById('a')?.label).toBe('First')
    rerender({ label: 'Second' })
    expect(result.current.getById('a')?.label).toBe('Second')
  })

  it('honors an explicit deps array (registers once, ignores later changes)', () => {
    const { result, rerender } = renderHook(
      ({ label }: { label: string }) => {
        useCommandRegister([{ id: 'a', label }], [])
        return useEngineContext().registry
      },
      { wrapper, initialProps: { label: 'First' } },
    )
    rerender({ label: 'Second' })
    // deps=[] → registered once with the initial shape.
    expect(result.current.getById('a')?.label).toBe('First')
  })
})

describe('useCommandRegister without deps', () => {
  function renderCommands<P>(commands: (props: P) => CommandItem[], initialProps: P) {
    return renderHook(
      (props: P) => {
        useCommandRegister(commands(props))
        return { palette: useCommandPalette(), registry: useEngineContext().registry }
      },
      { wrapper, initialProps },
    )
  }

  // Registry updates reach subscribers in a microtask.
  const flush = () => act(async () => {})
  const shown = (result: { current: { palette: ReturnType<typeof useCommandPalette> } }) =>
    result.current.palette.results.map((r) => r.item.id)

  it('shows a command when a boolean when turns true', async () => {
    const { result, rerender } = renderCommands(
      ({ on }: { on: boolean }) => [{ id: 'admin', label: 'Admin', when: on }],
      { on: false },
    )
    await flush()
    expect(shown(result)).toEqual([])

    rerender({ on: true })
    await flush()

    expect(shown(result)).toEqual(['admin'])
  })

  it('re-evaluates a when function that closes over props', async () => {
    const { result, rerender } = renderCommands(
      ({ plan }: { plan: string }) => [
        { id: 'sso', label: 'SSO settings', when: () => plan === 'enterprise' },
      ],
      { plan: 'free' },
    )
    await flush()
    expect(shown(result)).toEqual([])

    rerender({ plan: 'enterprise' })
    await flush()

    expect(shown(result)).toEqual(['sso'])
  })

  it('updates scope and a text icon', async () => {
    const { result, rerender } = renderCommands(
      ({ page }: { page: string }) => [
        { id: 'x', label: 'X', scope: [`/${page}`], icon: page === 'a' ? '🅰️' : '🅱️' },
      ],
      { page: 'a' },
    )
    await flush()

    rerender({ page: 'b' })
    await flush()

    expect(result.current.registry.getById('x')).toMatchObject({ scope: ['/b'], icon: '🅱️' })
  })

  it('does not re-register for a new element icon on every render', async () => {
    const { result, rerender } = renderCommands(
      (_: { n: number }) => [{ id: 'x', label: 'X', icon: <span>icon</span> }],
      { n: 1 },
    )
    await flush()
    const registered = result.current.registry.getById('x')

    rerender({ n: 2 })
    await flush()

    expect(result.current.registry.getById('x')).toBe(registered)
  })
})
