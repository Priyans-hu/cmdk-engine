import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { CommandEngineProvider, usePaletteState } from '../../src/react/context'
import { useCommandRegister } from '../../src/react/use-command-register'
import { createFuzzySearch } from '../../src/core/search'
import * as cmdkAdapter from '../../src/adapters/cmdk'
import * as baseUiAdapter from '../../src/adapters/base-ui'
import type { CommandItem, SearchEngine } from '../../src/core/types'

// cmdk scrolls the selected item into view, which jsdom lacks.
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn()
})
afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

const commands: CommandItem[] = [
  { id: 'billing', label: 'Billing' },
  {
    id: 'settings',
    label: 'Settings',
    children: [
      { id: 'general', label: 'General' },
      { id: 'security', label: 'Security' },
    ],
  },
]

function Register() {
  useCommandRegister(commands)
  return null
}

// Reads the shared palette state without running the results pipeline.
function State() {
  const { isOpen, search, activePath } = usePaletteState()
  return (
    <output data-testid="state">
      {JSON.stringify({ isOpen, search, depth: activePath.length })}
    </output>
  )
}

const state = () => JSON.parse(screen.getByTestId('state').textContent!)

/** Dispatches a keydown on the page and returns it, to check `defaultPrevented`. */
function press(init: KeyboardEventInit) {
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init })
  act(() => {
    document.body.dispatchEvent(event)
  })
  return event
}

const slash = (e: KeyboardEvent) => e.key === '/'

describe.each([
  ['cmdk', cmdkAdapter],
  ['Base UI', baseUiAdapter],
] as const)('useCommandPaletteShortcut (%s adapter)', (name, adapter) => {
  const { CommandPalette, useCommandPaletteShortcut } = adapter

  // cmdk measures its list with ResizeObserver; Base UI needs no jsdom polyfills.
  beforeEach(() => {
    if (name === 'cmdk') {
      vi.stubGlobal(
        'ResizeObserver',
        class {
          observe() {}
          unobserve() {}
          disconnect() {}
        },
      )
    }
  })

  function Palette({ shortcut }: { shortcut?: Parameters<typeof useCommandPaletteShortcut>[0] }) {
    const { toggle } = useCommandPaletteShortcut(shortcut)
    return (
      <>
        <button type="button" onClick={toggle}>
          toggle
        </button>
        <CommandPalette dialog />
      </>
    )
  }

  function renderApp(
    shortcut?: Parameters<typeof useCommandPaletteShortcut>[0],
    searchEngine?: SearchEngine,
  ) {
    return render(
      <CommandEngineProvider config={{ searchEngine }}>
        <Register />
        <State />
        <Palette shortcut={shortcut} />
      </CommandEngineProvider>,
    )
  }

  it('Cmd+K and Ctrl+K toggle the palette', () => {
    renderApp()
    expect(press({ key: 'k', code: 'KeyK', metaKey: true }).defaultPrevented).toBe(true)
    expect(state().isOpen).toBe(true)
    press({ key: 'k', code: 'KeyK', ctrlKey: true })
    expect(state().isOpen).toBe(false)
  })

  it('holding the keys toggles once: repeats are blocked but do not toggle', () => {
    renderApp()
    press({ key: 'k', code: 'KeyK', ctrlKey: true })
    const repeat = press({ key: 'k', code: 'KeyK', ctrlKey: true, repeat: true })
    expect(state().isOpen).toBe(true)
    // Unblocked, a held Ctrl+K would reach the browser's own shortcut.
    expect(repeat.defaultPrevented).toBe(true)
    press({ key: 'k', code: 'KeyK', ctrlKey: true, repeat: true })
    expect(state().isOpen).toBe(true)
  })

  it('opens with Caps Lock on (a "K" without Shift)', () => {
    renderApp()
    press({ key: 'K', code: 'KeyK', ctrlKey: true })
    expect(state().isOpen).toBe(true)
  })

  it('opens on non-Latin layouts through the physical K key', () => {
    renderApp()
    press({ key: 'л', code: 'KeyK', ctrlKey: true }) // Russian
    expect(state().isOpen).toBe(true)
    press({ key: 'κ', code: 'KeyK', metaKey: true }) // Greek
    expect(state().isOpen).toBe(false)
    press({ key: 'Л', code: 'KeyK', ctrlKey: true }) // Russian with Caps Lock
    expect(state().isOpen).toBe(true)
  })

  it('ignores the keys that never opened it', () => {
    renderApp()
    const ignored: KeyboardEventInit[] = [
      { key: 'k', code: 'KeyK' }, // no modifier
      { key: 'K', code: 'KeyK', ctrlKey: true, shiftKey: true }, // Ctrl+Shift+K on Windows
      { key: 'Л', code: 'KeyK', ctrlKey: true, shiftKey: true },
      { key: 'ł', code: 'KeyK', ctrlKey: true, altKey: true }, // AltGr+K types "ł" (Polish, Czech)
      { key: 't', code: 'KeyK', ctrlKey: true }, // Dvorak: the physical K types "t"
      { key: 'j', code: 'KeyJ', metaKey: true },
    ]
    for (const init of ignored) {
      expect(press(init).defaultPrevented).toBe(false)
      expect(state().isOpen).toBe(false)
    }
  })

  it('matches another key the same way', () => {
    renderApp('p')
    press({ key: 'p', code: 'KeyP', ctrlKey: true })
    expect(state().isOpen).toBe(true)
    press({ key: 'P', code: 'KeyP', metaKey: true })
    expect(state().isOpen).toBe(false)
    press({ key: 'з', code: 'KeyP', ctrlKey: true })
    expect(state().isOpen).toBe(true)
    press({ key: 'k', code: 'KeyK', ctrlKey: true })
    expect(state().isOpen).toBe(true)
  })

  it('still matches a named key exactly', () => {
    renderApp('Enter')
    press({ key: 'Enter', code: 'Enter', metaKey: true })
    expect(state().isOpen).toBe(true)
  })

  it('takes a function that decides the match, with the same repeat guard', () => {
    renderApp(slash)
    expect(press({ key: '/', code: 'Slash' }).defaultPrevented).toBe(true)
    expect(state().isOpen).toBe(true)
    expect(press({ key: '/', code: 'Slash', repeat: true }).defaultPrevented).toBe(true)
    expect(state().isOpen).toBe(true)
    expect(press({ key: 'k', code: 'KeyK', ctrlKey: true }).defaultPrevented).toBe(false)
    expect(state().isOpen).toBe(true)
  })

  it('closing clears the query and the drill-down path', async () => {
    renderApp()
    press({ key: 'k', code: 'KeyK', metaKey: true })
    await act(async () => {
      fireEvent.click(screen.getByText('Settings'))
    })
    await act(async () => {
      fireEvent.input(screen.getByRole('combobox'), {
        target: { value: 'gen' },
        inputType: 'insertText',
      })
    })
    expect(state()).toEqual({ isOpen: true, search: 'gen', depth: 1 })

    press({ key: 'k', code: 'KeyK', metaKey: true })
    expect(state()).toEqual({ isOpen: false, search: '', depth: 0 })
    press({ key: 'k', code: 'KeyK', metaKey: true })
    expect(state()).toEqual({ isOpen: true, search: '', depth: 0 })
    expect(screen.getByText('Billing')).toBeTruthy()
  })

  it('returns isOpen and a toggle that closes the same way', async () => {
    renderApp()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'toggle' }))
    })
    expect(state().isOpen).toBe(true)
    await act(async () => {
      fireEvent.input(screen.getByRole('combobox'), {
        target: { value: 'bil' },
        inputType: 'insertText',
      })
    })
    press({ key: 'k', code: 'KeyK', ctrlKey: true })
    expect(state()).toEqual({ isOpen: false, search: '', depth: 0 })
  })

  it('names itself when used outside a provider', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    function Outside() {
      useCommandPaletteShortcut()
      return null
    }
    expect(() => render(<Outside />)).toThrow(
      /^useCommandPaletteShortcut must be used within a <CommandEngineProvider>/,
    )
    error.mockRestore()
  })

  it('runs no search of its own: one search per keystroke', async () => {
    const fuzzy = createFuzzySearch()
    const search = vi.fn(fuzzy.search)
    renderApp(undefined, { ...fuzzy, search })
    press({ key: 'k', code: 'KeyK', ctrlKey: true })
    search.mockClear()
    await act(async () => {
      fireEvent.input(screen.getByRole('combobox'), {
        target: { value: 'b' },
        inputType: 'insertText',
      })
    })
    expect(search).toHaveBeenCalledTimes(1)
  })
})
