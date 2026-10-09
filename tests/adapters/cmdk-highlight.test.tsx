import { describe, it, expect, vi, beforeAll, onTestFinished } from 'vitest'
import React from 'react'
import { render, fireEvent, act } from '@testing-library/react'
import { Command } from 'cmdk'
import { CommandEngineProvider, useEngineContext } from '../../src/react/context'
import { useCommandRegister } from '../../src/react/use-command-register'
import { useCommandPalette } from '../../src/react/use-command-palette'
import { CommandPalette, useCommandPaletteShortcut } from '../../src/adapters/cmdk/command-palette'
import { createInMemoryStorage } from '../../src/core/frecency'
import type { CommandEngineConfig, CommandItem, FrecencyStorage } from '../../src/core/types'

// cmdk uses ResizeObserver + scrollIntoView internally — mock them for jsdom
beforeAll(() => {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
  Element.prototype.scrollIntoView = vi.fn()
})

// Frecency off: a storage that never remembers a run
const noFrecency = (): FrecencyStorage => ({
  get: () => null,
  set: () => {},
  getAll: () => [],
  clear: () => {},
})

const signOut = vi.fn()

// Rendered order: First (Alpha, Bravo, Charlie), Second (Delta, Sign out)
const COMMANDS: CommandItem[] = [
  { id: 'alpha', label: 'Alpha', group: 'First' },
  { id: 'bravo', label: 'Bravo', group: 'First' },
  { id: 'charlie', label: 'Charlie', group: 'First', disabled: true },
  {
    id: 'delta',
    label: 'Delta',
    group: 'Second',
    children: [
      { id: 'delta-one', label: 'Delta One' },
      { id: 'delta-two', label: 'Delta Two' },
    ],
  },
  { id: 'sign-out', label: 'Sign out', group: 'Second', keywords: ['logout'], action: signOut },
]

function Register({ commands }: { commands: CommandItem[] }) {
  useCommandRegister(commands)
  return null
}

// Exposes the hook and the engine so tests can open, close and edit commands
let palette: ReturnType<typeof useCommandPalette>
let engine: ReturnType<typeof useEngineContext>
function Spy() {
  palette = useCommandPalette()
  engine = useEngineContext()
  return null
}

function Shortcut() {
  useCommandPaletteShortcut()
  return null
}

interface Setup {
  commands?: CommandItem[]
  config?: CommandEngineConfig
  props?: React.ComponentProps<typeof CommandPalette>
  shortcut?: boolean
  strict: boolean
}

function renderPalette({
  commands = COMMANDS,
  config,
  props = { dialog: true },
  shortcut,
  strict,
}: Setup) {
  const engineConfig = config ?? { frecency: { storage: noFrecency() } }
  const tree = (
    <CommandEngineProvider config={engineConfig}>
      <Register commands={commands} />
      <Spy />
      {shortcut && <Shortcut />}
      <CommandPalette {...props} />
    </CommandEngineProvider>
  )
  return render(strict ? <React.StrictMode>{tree}</React.StrictMode> : tree)
}

const ids = (selector: string) =>
  Array.from(document.querySelectorAll(selector), (n) => n.getAttribute('data-value'))

// The highlighted item's id (cmdk marks it data-selected), or null
function highlighted() {
  const selected = ids('[cmdk-item][data-selected="true"]')
  expect(selected.length).toBeLessThanOrEqual(1)
  return selected[0] ?? null
}

const enabledIds = () => ids('[cmdk-item]:not([aria-disabled="true"])')
const input = () => document.querySelector('[cmdk-input]') as HTMLInputElement | null

async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

async function open() {
  await act(async () => palette.open())
  await settle()
  expect(input()).not.toBeNull()
}

async function press(key: string, init: KeyboardEventInit = {}) {
  await act(async () => {
    fireEvent.keyDown(input()!, { key, ...init })
  })
  await settle()
}

async function escape() {
  await press('Escape')
  expect(input()).toBeNull()
}

async function type(value: string) {
  await act(async () => {
    fireEvent.change(input()!, { target: { value } })
  })
  await settle()
}

async function cmdK() {
  await act(async () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))
  })
  await settle()
}

// Records every controlled `value` the palette hands cmdk's dialog while open.
// Install before rendering so the dialog's component type stays stable.
function recordDialogValues() {
  const RealDialog = Command.Dialog
  const values: Array<string | undefined> = []
  Command.Dialog = ((props: React.ComponentProps<typeof RealDialog>) => {
    if (props.open) values.push(props.value)
    return <RealDialog {...props} />
  }) as typeof RealDialog
  onTestFinished(() => {
    Command.Dialog = RealDialog
  })
  return values
}

describe.each([
  ['plain', false],
  ['StrictMode', true],
])('CommandPalette highlight (%s)', (_mode, strict) => {
  it('reopening the dialog starts on the first enabled item, not the last highlight', async () => {
    const dialogValues = recordDialogValues()
    renderPalette({ strict })
    await open()
    expect(highlighted()).toBe('alpha')
    await press('ArrowDown')
    expect(highlighted()).toBe('bravo')
    await escape()

    dialogValues.length = 0
    await open()
    expect(highlighted()).toBe('alpha')
    // cmdk never receives the last highlight, so not even one frame shows it
    expect(new Set(dialogValues)).toEqual(new Set(['alpha']))
  })

  it.each([
    ['off', noFrecency, 'alpha'],
    ['on', createInMemoryStorage, 'sign-out'],
  ])(
    'reopening after a run highlights the first enabled rendered item (frecency %s)',
    async (_frecency, storage, first) => {
      signOut.mockClear()
      renderPalette({ strict, config: { frecency: { storage: storage() } } })
      await open()
      await type('logout')
      expect(highlighted()).toBe('sign-out')
      await press('Enter')
      expect(signOut).toHaveBeenCalledTimes(1)
      expect(input()).toBeNull()

      await open()
      // Frecency floats the command just run to the top, by design
      expect(enabledIds()[0]).toBe(first)
      expect(highlighted()).toBe(first)
    },
  )

  it('reopening after a disabled item matched starts on the first enabled item', async () => {
    renderPalette({ strict })
    await open()
    await type('charlie')
    expect(enabledIds()).toEqual([])
    expect(highlighted()).toBeNull()
    await escape()

    await open()
    expect(highlighted()).toBe('alpha')
    // Arrow keys walk the enabled items in rendered order and wrap (loop)
    await press('ArrowDown')
    expect(highlighted()).toBe('bravo')
    await press('ArrowDown')
    expect(highlighted()).toBe('delta')
    await press('ArrowUp')
    await press('ArrowUp')
    expect(highlighted()).toBe('alpha')
    await press('ArrowUp')
    expect(highlighted()).toBe('sign-out')
  })

  it('a highlighted item that becomes disabled hands the highlight on, or drops it', async () => {
    renderPalette({ strict })
    await open()
    await press('ArrowDown')
    expect(highlighted()).toBe('bravo')

    await act(async () => engine.registry.update('bravo', { disabled: true }))
    await settle()
    expect(highlighted()).toBe('alpha')
    await press('ArrowDown')
    expect(highlighted()).toBe('delta')

    // Nothing left to highlight
    await act(async () => {
      for (const id of ['alpha', 'delta', 'sign-out']) {
        engine.registry.update(id, { disabled: true })
      }
    })
    await settle()
    expect(highlighted()).toBeNull()
  })

  it('opens on the top rendered item when group priority reorders the results', async () => {
    renderPalette({
      strict,
      commands: [
        { id: 'alpha-one', label: 'Alpha One', group: 'letters', priority: 5 },
        { id: 'alpha-two', label: 'Alpha Two', group: 'letters' },
        { id: 'beta-one', label: 'Beta One', group: 'greek' },
      ],
      config: {
        frecency: { storage: noFrecency() },
        groups: [
          { id: 'greek', label: 'Greek', priority: 10 },
          { id: 'letters', label: 'Letters', priority: 1 },
        ],
      },
    })
    await open()
    expect(enabledIds()).toEqual(['beta-one', 'alpha-one', 'alpha-two'])
    expect(highlighted()).toBe('beta-one')
    await press('ArrowDown')
    expect(highlighted()).toBe('alpha-one')
  })

  it('opens on the top rendered item when a high-priority ungrouped item renders last', async () => {
    renderPalette({
      strict,
      commands: [
        { id: 'home', label: 'Home', priority: 9 },
        { id: 'alpha-one', label: 'Alpha One', group: 'letters' },
        { id: 'alpha-two', label: 'Alpha Two', group: 'letters' },
      ],
    })
    await open()
    expect(enabledIds()).toEqual(['alpha-one', 'alpha-two', 'home'])
    expect(highlighted()).toBe('alpha-one')
    await press('ArrowDown')
    expect(highlighted()).toBe('alpha-two')
  })

  it('never highlights a leading disabled item; arrows and loop skip it', async () => {
    renderPalette({
      strict,
      commands: [
        { id: 'zulu', label: 'Zulu', group: 'Top', priority: 9, disabled: true },
        ...COMMANDS,
      ],
    })
    await open()
    expect(document.querySelector('[cmdk-item]')?.getAttribute('data-value')).toBe('zulu')
    expect(highlighted()).toBe('alpha')
    await press('ArrowUp')
    expect(highlighted()).toBe('sign-out')
    await press('ArrowDown')
    expect(highlighted()).toBe('alpha')
  })

  it('highlights nothing when every item is disabled', async () => {
    const action = vi.fn()
    renderPalette({
      strict,
      commands: [
        { id: 'x-ray', label: 'X-ray', disabled: true, action },
        { id: 'yankee', label: 'Yankee', disabled: true, action },
      ],
    })
    await open()
    expect(highlighted()).toBeNull()
    await press('ArrowDown')
    expect(highlighted()).toBeNull()
    await press('Enter')
    expect(action).not.toHaveBeenCalled()
    expect(input()).not.toBeNull()
  })

  it('an inline palette keeps its highlight when isOpen toggles', async () => {
    renderPalette({ strict, props: {}, shortcut: true })
    await settle()
    expect(highlighted()).toBe('alpha')
    await press('ArrowDown')
    expect(highlighted()).toBe('bravo')

    await cmdK()
    expect(palette.isOpen).toBe(true)
    expect(highlighted()).toBe('bravo')
    await cmdK()
    expect(palette.isOpen).toBe(false)
    expect(highlighted()).toBe('bravo')
  })

  it('vim bindings walk the enabled items in rendered order', async () => {
    renderPalette({ strict })
    await open()
    await press('n', { ctrlKey: true })
    expect(highlighted()).toBe('bravo')
    await press('j', { ctrlKey: true })
    expect(highlighted()).toBe('delta')
    await press('p', { ctrlKey: true })
    expect(highlighted()).toBe('bravo')
    await press('k', { ctrlKey: true })
    expect(highlighted()).toBe('alpha')
  })

  it('loop={false} stops at the first and last enabled items', async () => {
    renderPalette({ strict, props: { dialog: true, loop: false } })
    await open()
    await press('ArrowUp')
    expect(highlighted()).toBe('alpha')
    await press('End')
    expect(highlighted()).toBe('sign-out')
    await press('ArrowDown')
    expect(highlighted()).toBe('sign-out')
  })

  it('async items arriving later do not move a valid highlight', async () => {
    const pending: Array<(items: CommandItem[]) => void> = []
    renderPalette({
      strict,
      config: {
        frecency: { storage: noFrecency() },
        asyncSources: [
          {
            id: 'remote',
            debounceMs: 0,
            trigger: () => true,
            load: () => new Promise<CommandItem[]>((resolve) => pending.push(resolve)),
          },
        ],
      },
    })
    await open()
    await press('ArrowDown')
    expect(highlighted()).toBe('bravo')

    const remote: CommandItem = { id: 'remote', label: 'Remote', group: 'First', priority: 10 }
    await act(async () => {
      for (const resolve of pending) resolve([remote])
    })
    await settle()
    expect(enabledIds()[0]).toBe('remote')
    expect(highlighted()).toBe('bravo')
  })

  it('typing still snaps to the first match', async () => {
    renderPalette({ strict })
    await open()
    await press('ArrowDown')
    expect(highlighted()).toBe('bravo')
    await type('del')
    expect(highlighted()).toBe('delta')
    await type('')
    expect(highlighted()).toBe('alpha')
  })

  it('drill-down highlights the first child and Backspace returns to the first root item', async () => {
    renderPalette({ strict })
    await open()
    await press('ArrowDown')
    await press('ArrowDown')
    expect(highlighted()).toBe('delta')
    await press('Enter')
    expect(palette.depth).toBe(1)
    expect(highlighted()).toBe('delta-one')
    await press('ArrowDown')
    expect(highlighted()).toBe('delta-two')

    await press('Backspace')
    expect(palette.depth).toBe(0)
    expect(highlighted()).toBe('alpha')
  })
})
