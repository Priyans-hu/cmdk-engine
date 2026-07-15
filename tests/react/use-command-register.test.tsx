import { describe, it, expect } from 'vitest'
import React from 'react'
import { renderHook } from '@testing-library/react'
import { CommandEngineProvider, useEngineContext } from '../../src/react/context'
import { useCommandRegister } from '../../src/react/use-command-register'

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
        useCommandRegister([{ id: 'a', label: 'Alpha', action: () => seen.push(n) }])
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
