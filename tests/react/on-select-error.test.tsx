import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { renderHook, act } from '@testing-library/react'
import { CommandEngineProvider } from '../../src/react/context'
import { useCommandPalette } from '../../src/react/use-command-palette'
import type { CommandEngineConfig, CommandItem } from '../../src/core/types'

function renderPalette(config: CommandEngineConfig) {
  const rendered = renderHook(() => useCommandPalette(), {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <CommandEngineProvider config={config}>{children}</CommandEngineProvider>
    ),
  })
  act(() => rendered.result.current.open())
  return rendered
}

const item = (o: Partial<CommandItem>): CommandItem => ({ id: 'export', label: 'Export', ...o })

describe('onSelectError', () => {
  it('receives a rejected async action, and the palette closes at once', async () => {
    const onSelectError = vi.fn()
    const error = new Error('export failed')
    const command = item({ action: () => Promise.reject(error) })
    const { result } = renderPalette({ onSelectError })

    act(() => result.current.select(command))

    expect(result.current.isOpen).toBe(false)
    await act(async () => {})
    expect(onSelectError).toHaveBeenCalledExactlyOnceWith(error, command)
  })

  it('receives a synchronous throw, and the palette still closes', () => {
    const onSelectError = vi.fn()
    const error = new Error('boom')
    const command = item({
      action: () => {
        throw error
      },
    })
    const { result } = renderPalette({ onSelectError })

    act(() => result.current.select(command))

    expect(onSelectError).toHaveBeenCalledExactlyOnceWith(error, command)
    expect(result.current.isOpen).toBe(false)
  })

  it('covers onSelect and onNavigate handlers too', async () => {
    const onSelectError = vi.fn()
    const navigationError = new Error('navigation failed')
    const { result } = renderPalette({
      onSelectError,
      onNavigate: () => Promise.reject(navigationError) as unknown as void,
    })

    act(() => result.current.select(item({ href: '/export' })))
    act(() =>
      result.current.select(item({ id: 'other' }), {
        onSelect: () => {
          throw new Error('handler failed')
        },
      }),
    )
    await act(async () => {})

    expect(onSelectError.mock.calls.map(([error]) => (error as Error).message)).toEqual([
      'handler failed',
      'navigation failed',
    ])
  })

  it('attaches its handler to a thenable the action returns', () => {
    const then = vi.fn()
    const { result } = renderPalette({ onSelectError: () => {} })

    act(() => result.current.select(item({ action: () => ({ then }) as unknown as Promise<void> })))

    expect(then).toHaveBeenCalledOnce()
  })
})

describe('without onSelectError (unchanged)', () => {
  it('lets a synchronous throw propagate and keeps the palette open', () => {
    const { result } = renderPalette({})

    expect(() =>
      result.current.select(
        item({
          action: () => {
            throw new Error('boom')
          },
        }),
      ),
    ).toThrow('boom')
    expect(result.current.isOpen).toBe(true)
  })

  it('leaves a returned promise alone', () => {
    const then = vi.fn()
    const { result } = renderPalette({})

    act(() => result.current.select(item({ action: () => ({ then }) as unknown as Promise<void> })))

    expect(then).not.toHaveBeenCalled()
  })
})
