import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest'
import { StrictMode, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { CommandEngineProvider, usePaletteState } from '../../src/react/context'
import { useCommandRegister } from '../../src/react/use-command-register'
import * as cmdkAdapter from '../../src/adapters/cmdk'
import * as baseUiAdapter from '../../src/adapters/base-ui'
import type { CommandItem } from '../../src/core/types'

// cmdk scrolls the selected item into view, which jsdom lacks.
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn()
})
afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

function Register({ commands }: { commands: CommandItem[] }) {
  useCommandRegister(commands)
  return null
}

function State() {
  return <output data-testid="open">{String(usePaletteState().isOpen)}</output>
}

const isOpen = () => screen.getByTestId('open').textContent === 'true'
const input = () => screen.getByRole('combobox')

async function ctrlK() {
  await act(async () => {
    document.activeElement!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'k', code: 'KeyK', ctrlKey: true, bubbles: true }),
    )
  })
}

async function pressInPalette(key: string) {
  await act(async () => {
    fireEvent.keyDown(input(), { key })
  })
}

// Lets Radix and Base UI run their deferred focus work (timers, animation frames).
const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 50)))

describe.each([
  ['cmdk', cmdkAdapter],
  ['Base UI', baseUiAdapter],
] as const)(
  'dialog focus on close (%s adapter)',
  (name, { CommandPalette, useCommandPaletteShortcut }) => {
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

    function Palette({ dialog = true }: { dialog?: boolean }) {
      useCommandPaletteShortcut()
      return <CommandPalette dialog={dialog} />
    }

    function renderApp(commands: CommandItem[], children?: ReactNode) {
      return render(
        <CommandEngineProvider>
          {children}
          <button type="button">opener</button>
          <Register commands={commands} />
          <State />
          <Palette />
        </CommandEngineProvider>,
      )
    }

    async function openFrom(element: HTMLElement) {
      element.focus()
      await ctrlK()
      await settle()
      expect(isOpen()).toBe(true)
      expect(document.activeElement).toBe(input())
    }

    const commands: CommandItem[] = [
      { id: 'billing', label: 'Billing', action: () => {} },
      { id: 'team', label: 'Team', action: () => {} },
    ]

    it('returns focus to the opener on Escape', async () => {
      renderApp(commands)
      const opener = screen.getByRole('button', { name: 'opener' })
      await openFrom(opener)
      await pressInPalette('Escape')
      await settle()
      expect(isOpen()).toBe(false)
      expect(document.activeElement).toBe(opener)
    })

    it('returns focus to the opener after a command runs, by click or Enter', async () => {
      renderApp(commands)
      const opener = screen.getByRole('button', { name: 'opener' })
      await openFrom(opener)
      await act(async () => {
        fireEvent.click(screen.getByText('Team'))
      })
      await settle()
      expect(isOpen()).toBe(false)
      expect(document.activeElement).toBe(opener)

      await openFrom(opener)
      await pressInPalette('Enter')
      await settle()
      expect(isOpen()).toBe(false)
      expect(document.activeElement).toBe(opener)
    })

    it('returns focus to the opener when the shortcut closes it', async () => {
      renderApp(commands)
      const opener = screen.getByRole('button', { name: 'opener' })
      await openFrom(opener)
      await ctrlK()
      await settle()
      expect(isOpen()).toBe(false)
      expect(document.activeElement).toBe(opener)
    })

    it('leaves focus where a command moved it', async () => {
      // A command that opens an editor, which focuses itself once it renders.
      function Editor({ editing }: { editing: boolean }) {
        const ref = useRef<HTMLTextAreaElement>(null)
        useEffect(() => {
          if (editing) ref.current?.focus()
        }, [editing])
        return <textarea ref={ref} aria-label="note" />
      }
      function App() {
        const [editing, setEditing] = useState(false)
        const note: CommandItem = {
          id: 'note',
          label: 'Write a note',
          action: () => setEditing(true),
        }
        return (
          <CommandEngineProvider>
            <Editor editing={editing} />
            <button type="button">opener</button>
            <Register commands={[note]} />
            <State />
            <Palette />
          </CommandEngineProvider>
        )
      }
      render(<App />)
      await openFrom(screen.getByRole('button', { name: 'opener' }))
      await pressInPalette('Enter')
      await settle()
      expect(isOpen()).toBe(false)
      expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'note' }))
    })

    it('does not throw when the opener is gone', async () => {
      function App() {
        const { isOpen } = usePaletteState()
        return (
          <>
            {!isOpen && <button type="button">opener</button>}
            <Register commands={commands} />
            <State />
            <Palette />
          </>
        )
      }
      render(
        <CommandEngineProvider>
          <App />
        </CommandEngineProvider>,
      )
      await openFrom(screen.getByRole('button', { name: 'opener' }))
      await pressInPalette('Escape')
      await settle()
      expect(isOpen()).toBe(false)
      expect(document.activeElement).toBe(document.body)
    })

    it('returns focus under StrictMode', async () => {
      render(
        <StrictMode>
          <CommandEngineProvider>
            <button type="button">opener</button>
            <Register commands={commands} />
            <State />
            <Palette />
          </CommandEngineProvider>
        </StrictMode>,
      )
      const opener = screen.getByRole('button', { name: 'opener' })
      await openFrom(opener)
      await pressInPalette('Escape')
      await settle()
      expect(document.activeElement).toBe(opener)
    })

    it('never moves focus in an inline palette', async () => {
      render(
        <CommandEngineProvider>
          <button type="button">opener</button>
          <Register commands={commands} />
          <State />
          <Palette dialog={false} />
        </CommandEngineProvider>,
      )
      const opener = screen.getByRole('button', { name: 'opener' })
      opener.focus()
      await ctrlK()
      await settle()
      expect(document.activeElement).toBe(opener)
      input().focus()
      await ctrlK()
      await settle()
      expect(isOpen()).toBe(false)
      expect(document.activeElement).toBe(input())
    })
  },
)
