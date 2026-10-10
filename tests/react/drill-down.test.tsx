import { describe, it, expect } from 'vitest'
import React from 'react'
import { renderHook, act } from '@testing-library/react'
import { CommandEngineProvider } from '../../src/react/context'
import { useCommandPalette } from '../../src/react/use-command-palette'
import { useCommandRegister } from '../../src/react/use-command-register'
import type { CommandItem } from '../../src/core/types'

const kids = (prefix: string, n: number): CommandItem[] =>
  Array.from({ length: n }, (_, i) => ({ id: `${prefix}${i}`, label: `${prefix} ${i}` }))

function renderTree(initialProps: { commands: CommandItem[] }) {
  return renderHook(
    ({ commands }: { commands: CommandItem[] }) => {
      useCommandRegister(commands)
      return useCommandPalette()
    },
    {
      initialProps,
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <CommandEngineProvider>{children}</CommandEngineProvider>
      ),
    },
  )
}

// Registry updates reach subscribers in a microtask.
const flush = () => act(async () => {})

describe('drilled-in children', () => {
  it('follow registry updates while drilled in', async () => {
    const { result, rerender } = renderTree({
      commands: [{ id: 'team', label: 'Team', children: kids('member', 2) }],
    })
    await flush()
    act(() => result.current.select('team'))
    expect(result.current.results).toHaveLength(2)

    rerender({ commands: [{ id: 'team', label: 'Team', children: kids('member', 4) }] })
    await flush()

    expect(result.current.depth).toBe(1)
    expect(result.current.results.map((r) => r.item.id)).toEqual([
      'member0',
      'member1',
      'member2',
      'member3',
    ])
  })

  it('follow updates two levels down', async () => {
    const tree = (n: number): CommandItem[] => [
      {
        id: 'settings',
        label: 'Settings',
        children: [{ id: 'theme', label: 'Theme', children: kids('theme', n) }],
      },
    ]
    const { result, rerender } = renderTree({ commands: tree(1) })
    await flush()
    act(() => result.current.select('settings'))
    act(() => result.current.select('theme'))

    rerender({ commands: tree(3) })
    await flush()

    expect(result.current.depth).toBe(2)
    expect(result.current.results).toHaveLength(3)
  })

  it('keep the children they had when the parent goes away', async () => {
    const { result, rerender } = renderTree({
      commands: [{ id: 'team', label: 'Team', children: kids('member', 2) }],
    })
    await flush()
    act(() => result.current.select('team'))

    rerender({ commands: [] })
    await flush()

    expect(result.current.depth).toBe(1)
    expect(result.current.results.map((r) => r.item.id)).toEqual(['member0', 'member1'])
  })
})
