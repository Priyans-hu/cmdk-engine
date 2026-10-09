import { describe, it, expect, vi, afterEach, onTestFinished } from 'vitest'
import React from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { hydrateRoot } from 'react-dom/client'
import { CommandEngineProvider, useEngineContext } from '../../src/react/context'
import { useCommandRegister } from '../../src/react/use-command-register'
import { useCommandPalette } from '../../src/react/use-command-palette'
import { createDefaultTranslation, getTranslationKeys } from '../../src/core/i18n'
import {
  CommandPalette,
  useCommandPaletteShortcut,
} from '../../src/adapters/base-ui/command-palette'
import type { AsyncSource, CommandEngineConfig, CommandItem } from '../../src/core/types'

// No ResizeObserver or scrollIntoView mocks: Base UI needs no jsdom polyfills.

// Selections are recorded in localStorage (frecency) and would reorder later tests.
afterEach(() => localStorage.clear())

const commands: CommandItem[] = [
  { id: 'dashboard', label: 'Dashboard', group: 'Pages' },
  { id: 'billing', label: 'Billing', group: 'Pages', keywords: ['money'] },
  {
    id: 'settings',
    label: 'Settings',
    group: 'Pages',
    children: [
      { id: 'general', label: 'General Settings' },
      { id: 'security', label: 'Security Settings' },
      {
        id: 'profile',
        label: 'Profile Settings',
        children: [{ id: 'avatar', label: 'Avatar' }],
      },
    ],
  },
  { id: 'reports', label: 'Reports', group: 'Tools', disabled: true },
  { id: 'team', label: 'Team', group: 'Tools' },
]

function Register({ commands }: { commands: CommandItem[] }) {
  useCommandRegister(commands)
  return null
}

function State() {
  const { isOpen, search, depth } = useCommandPalette()
  return <output data-testid="state">{JSON.stringify({ isOpen, search, depth })}</output>
}

function Opener() {
  const { open } = useCommandPalette()
  return (
    <button type="button" onClick={open}>
      open
    </button>
  )
}

type PaletteProps = React.ComponentProps<typeof CommandPalette>

function Palette({
  props = {},
  config,
  items = commands,
}: {
  props?: PaletteProps
  config?: CommandEngineConfig
  items?: CommandItem[]
}) {
  return (
    <CommandEngineProvider config={config}>
      <Register commands={items} />
      <State />
      <Opener />
      <CommandPalette {...props} />
    </CommandEngineProvider>
  )
}

const input = () => screen.getByRole('combobox') as HTMLInputElement
const state = () => JSON.parse(screen.getByTestId('state').textContent!)
const options = () =>
  screen
    .getAllByRole('option')
    .map((o) => o.querySelector('[data-cmdk-engine-item-label]')?.textContent)
const highlighted = () =>
  document
    .querySelector('[role="option"][data-highlighted]')
    ?.querySelector('[data-cmdk-engine-item-label]')?.textContent

// Real typing: Base UI only resets the highlight for input events with an
// inputType, which fireEvent.change does not send.
async function type(value: string) {
  await act(async () => {
    fireEvent.input(input(), { target: { value }, inputType: 'insertText' })
  })
}

async function press(key: string) {
  await act(async () => {
    fireEvent.keyDown(document.activeElement ?? document.body, { key })
  })
}

async function pressTimes(key: string, times: number) {
  for (let i = 0; i < times; i++) await press(key)
}

const option = (label: string) => screen.getByText(label).closest('[role="option"]')!

async function hover(label: string) {
  await act(async () => {
    fireEvent.pointerMove(option(label), { pointerType: 'mouse' })
    fireEvent.mouseMove(option(label))
  })
}

async function openDialog() {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'open' }))
  })
  // Base UI focuses `initialFocus` (the input) on the next animation frame.
  await act(() => vi.waitFor(() => expect(document.activeElement).toBe(input())))
}

describe('CommandPalette (Base UI adapter)', () => {
  it('renders grouped results and highlights the first item', () => {
    render(<Palette />)
    expect(options()).toEqual(['Dashboard', 'Billing', 'Settings', 'Reports', 'Team'])
    expect(screen.getAllByRole('group').map((g) => g.firstElementChild?.textContent)).toEqual([
      'Pages',
      'Tools',
    ])
    expect(highlighted()).toBe('Dashboard')
  })

  it('shows the results as the engine returns them, with no Base UI filtering', async () => {
    render(<Palette />)
    // Matches the keyword only: a filtering Autocomplete would hide "Billing".
    await type('money')
    expect(options()).toEqual(['Billing'])
    expect(state().search).toBe('money')
  })

  it('typing highlights the first result again', async () => {
    render(<Palette />)
    input().focus()
    await pressTimes('ArrowDown', 2)
    expect(highlighted()).toBe('Settings')
    await type('s')
    expect(highlighted()).toBe(options()[0])
  })

  it('wraps around by default and stops at the ends with loop={false}', async () => {
    const { unmount } = render(<Palette />)
    input().focus()
    await pressTimes('ArrowDown', 5)
    expect(highlighted()).toBe('Dashboard')
    unmount()

    render(<Palette props={{ loop: false }} />)
    input().focus()
    await pressTimes('ArrowDown', 5)
    expect(highlighted()).toBe('Team')
  })

  it('Enter selects the highlighted item once with the onSelect prop', async () => {
    const onSelect = vi.fn()
    render(<Palette props={{ onSelect }} />)
    input().focus()
    await type('bil')
    await press('Enter')
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'billing' }))
    // select() closed the palette, which clears the query.
    expect(state().search).toBe('')
    expect(input().value).toBe('')
  })

  it('clicking an item selects it', async () => {
    const onSelect = vi.fn()
    render(<Palette props={{ onSelect }} />)
    await act(async () => {
      fireEvent.click(screen.getByText('Team'))
    })
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'team' }))
  })

  it('disabled items stay reachable by arrows but never run', async () => {
    const onSelect = vi.fn()
    render(<Palette props={{ onSelect }} />)
    input().focus()
    await pressTimes('ArrowDown', 3)
    expect(highlighted()).toBe('Reports')
    await press('Enter')
    await act(async () => {
      fireEvent.click(screen.getByText('Reports'))
    })
    expect(onSelect).not.toHaveBeenCalled()
    expect(
      screen.getByText('Reports').closest('[role="option"]')?.hasAttribute('data-disabled'),
    ).toBe(true)
  })

  it('Escape in an inline palette keeps the query', async () => {
    render(<Palette />)
    input().focus()
    await type('bil')
    await press('Escape')
    expect(state().search).toBe('bil')
    expect(input().value).toBe('bil')
  })
})

describe('CommandPalette (Base UI adapter): nested commands', () => {
  // Fails without key={depth} on Autocomplete.Root: Base UI keeps the
  // highlighted index, so the third child ("Profile Settings") would stay
  // highlighted after drilling down from the third item.
  it('drill-down highlights the first child and keeps focus in the input', async () => {
    render(<Palette />)
    input().focus()
    await pressTimes('ArrowDown', 2)
    expect(highlighted()).toBe('Settings')
    await press('Enter')
    expect(state().depth).toBe(1)
    expect(options()).toEqual(['General Settings', 'Security Settings', 'Profile Settings'])
    expect(highlighted()).toBe('General Settings')
    expect(document.activeElement).toBe(input())
  })

  it('Backspace on an empty query drills up to the first item and keeps focus', async () => {
    render(<Palette />)
    input().focus()
    await pressTimes('ArrowDown', 2)
    await press('Enter')
    await pressTimes('ArrowDown', 2)
    expect(highlighted()).toBe('Profile Settings')
    await press('Backspace')
    expect(state().depth).toBe(0)
    expect(highlighted()).toBe('Dashboard')
    expect(document.activeElement).toBe(input())
  })

  it('Backspace drills up only when the query is empty and depth > 0', async () => {
    render(<Palette />)
    input().focus()
    await press('Backspace')
    expect(state().depth).toBe(0)
    await pressTimes('ArrowDown', 2)
    await press('Enter')
    await type('gen')
    await press('Backspace')
    expect(state()).toMatchObject({ depth: 1, search: 'gen' })
  })

  it('clicking the breadcrumb back button drills up and focuses the input', async () => {
    render(<Palette />)
    await act(async () => {
      fireEvent.click(screen.getByText('Settings'))
    })
    expect(screen.getByText('Settings', { selector: '[data-cmdk-engine-breadcrumb]' })).toBeTruthy()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Go back' }))
    })
    expect(state().depth).toBe(0)
    expect(highlighted()).toBe('Dashboard')
    expect(document.activeElement).toBe(input())
  })

  it('keeps breadcrumbs and the footer mounted across depth changes', async () => {
    const mounts = { crumbs: 0, footer: 0 }
    function Crumbs({ crumbs }: { crumbs: CommandItem[] }) {
      React.useEffect(() => void mounts.crumbs++, [])
      return <nav>{crumbs.map((c) => c.label).join(' / ')}</nav>
    }
    function Footer() {
      React.useEffect(() => void mounts.footer++, [])
      return <footer>tips</footer>
    }
    render(
      <Palette
        props={{ footer: <Footer />, renderBreadcrumbs: (crumbs) => <Crumbs crumbs={crumbs} /> }}
      />,
    )
    input().focus()
    await pressTimes('ArrowDown', 2)
    await press('Enter')
    await pressTimes('ArrowDown', 2)
    await press('Enter')
    expect(screen.getByText('Settings / Profile Settings')).toBeTruthy()
    await press('Backspace')
    await press('Backspace')
    expect(mounts).toEqual({ crumbs: 1, footer: 1 })
  })

  it('does not steal focus on mount, also under StrictMode', () => {
    const outside = document.createElement('button')
    document.body.appendChild(outside)
    outside.focus()
    const { unmount } = render(<Palette />)
    expect(document.activeElement).toBe(outside)
    unmount()
    render(
      <React.StrictMode>
        <Palette />
      </React.StrictMode>,
    )
    expect(document.activeElement).toBe(outside)
    outside.remove()
  })

  it('async results arrive without replacing the focused input', async () => {
    let finish: (items: CommandItem[]) => void = () => {}
    const load = vi.fn<AsyncSource['load']>(() => new Promise((resolve) => (finish = resolve)))
    render(<Palette config={{ asyncSources: [{ id: 'remote', debounceMs: 0, load }] }} />)
    const node = input()
    node.focus()
    await type('rem')
    await vi.waitFor(() => expect(load).toHaveBeenCalledTimes(1))
    await act(async () => finish([{ id: 'r1', label: 'Remote one' }]))
    expect(options()).toContain('Remote one')
    expect(input()).toBe(node)
    expect(document.activeElement).toBe(node)
  })
})

describe('CommandPalette (Base UI adapter): async sources', () => {
  it('shows the loading row in a status region after the list, and the empty state only when idle', async () => {
    let finish: (items: CommandItem[]) => void = () => {}
    const load = vi.fn<AsyncSource['load']>(() => new Promise((resolve) => (finish = resolve)))
    render(
      <Palette
        items={[]}
        config={{ asyncSources: [{ id: 'remote', debounceMs: 0, shouldFilter: false, load }] }}
      />,
    )
    await type('rem')
    const loading = await screen.findByText(/Loading\.\.\./)
    const status = loading.closest('[role="status"]')!
    const listbox = screen.getByRole('listbox')
    expect(listbox.contains(status)).toBe(false)
    expect(listbox.compareDocumentPosition(status) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.queryByText(/No results found/)).toBeNull()

    await act(async () => finish([]))
    expect(await screen.findByText(/No results found/)).toBeTruthy()
    expect(status.textContent).toBe('')
  })
})

describe('CommandPalette (Base UI adapter): dialog mode', () => {
  it('opens with focus in the input and closes on Escape', async () => {
    render(<Palette props={{ dialog: true }} />)
    expect(screen.queryByRole('dialog')).toBeNull()
    await openDialog()
    expect(screen.getByRole('dialog').getAttribute('aria-label')).toBe('Command palette')
    expect(document.activeElement).toBe(input())
    await type('dash')
    await press('Escape')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(state()).toMatchObject({ isOpen: false, search: '' })
  })

  it('closes on a backdrop click', async () => {
    render(<Palette props={{ dialog: true, overlayClassName: 'overlay' }} />)
    await openDialog()
    const backdrop = document.querySelector('.overlay')!
    await act(async () => {
      fireEvent.pointerDown(backdrop, { button: 0, pointerType: 'mouse' })
      fireEvent.mouseDown(backdrop, { button: 0 })
      fireEvent.pointerUp(backdrop, { button: 0, pointerType: 'mouse' })
      fireEvent.mouseUp(backdrop, { button: 0 })
      fireEvent.click(backdrop, { button: 0 })
    })
    expect(state().isOpen).toBe(false)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('has a visually hidden close button named by palette.close', async () => {
    expect(createDefaultTranslation()('palette.close')).toBe('Close')
    expect(getTranslationKeys()).toContain('palette.close')
    const t = (key: string) => (key === 'palette.close' ? 'Schließen' : key)
    render(<Palette props={{ dialog: true }} config={{ t }} />)
    await openDialog()
    const close = screen.getByRole('button', { name: 'Schließen' })
    expect(close.style).toMatchObject({ position: 'absolute', width: '1px', overflow: 'hidden' })
    await act(async () => {
      fireEvent.click(close)
    })
    expect(state().isOpen).toBe(false)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('drills down and up with Enter and Backspace without closing, focus kept', async () => {
    render(<Palette props={{ dialog: true }} />)
    await openDialog()
    await pressTimes('ArrowDown', 2)
    await press('Enter')
    expect(state()).toMatchObject({ isOpen: true, depth: 1 })
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(highlighted()).toBe('General Settings')
    expect(document.activeElement).toBe(input())
    await press('Backspace')
    expect(state()).toMatchObject({ isOpen: true, depth: 0 })
    expect(highlighted()).toBe('Dashboard')
    expect(document.activeElement).toBe(input())
  })

  it('reopens on the first item with an empty query', async () => {
    render(<Palette props={{ dialog: true }} />)
    await openDialog()
    await pressTimes('ArrowDown', 2)
    await press('Enter')
    await press('ArrowDown')
    await press('Escape')
    expect(screen.queryByRole('dialog')).toBeNull()

    await openDialog()
    expect(state()).toMatchObject({ isOpen: true, search: '', depth: 0 })
    expect(input().value).toBe('')
    expect(highlighted()).toBe('Dashboard')
  })

  it('opening at a nested level focuses the input, not the back button', async () => {
    function OpenAtSettings() {
      const { open, drillDown } = useCommandPalette()
      return (
        <button
          type="button"
          onClick={() => {
            drillDown(commands[2])
            open()
          }}
        >
          settings
        </button>
      )
    }
    render(
      <CommandEngineProvider>
        <Register commands={commands} />
        <OpenAtSettings />
        <CommandPalette dialog />
      </CommandEngineProvider>,
    )
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'settings' }))
    })
    expect(screen.getByRole('button', { name: 'Go back' })).toBeTruthy()
    await act(() => vi.waitFor(() => expect(document.activeElement).toBe(input())))
  })

  it('closing from a nested level returns focus without entering the closing dialog', async () => {
    render(<Palette props={{ dialog: true }} />)
    const opener = screen.getByRole('button', { name: 'open' })
    opener.focus()
    await openDialog()
    await pressTimes('ArrowDown', 2)
    await press('Enter')
    expect(state().depth).toBe(1)
    const focused: Element[] = []
    const record = (e: FocusEvent) => focused.push(e.target as Element)
    document.addEventListener('focusin', record)
    await press('Escape')
    await act(() => vi.waitFor(() => expect(document.activeElement).toBe(opener)))
    document.removeEventListener('focusin', record)
    expect(focused).toEqual([opener])
  })

  it('selecting a command closes the dialog and returns focus', async () => {
    const onSelect = vi.fn()
    render(<Palette props={{ dialog: true, onSelect }} />)
    const opener = screen.getByRole('button', { name: 'open' })
    opener.focus()
    await openDialog()
    await pressTimes('ArrowDown', 2)
    await press('Enter')
    await press('Enter')
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'general' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    await vi.waitFor(() => expect(document.activeElement).toBe(opener))
  })

  it('useCommandPaletteShortcut toggles the dialog', async () => {
    function App() {
      useCommandPaletteShortcut('k')
      return <CommandPalette dialog placeholder="Search here" />
    }
    render(
      <CommandEngineProvider>
        <Register commands={commands} />
        <App />
      </CommandEngineProvider>,
    )
    expect(screen.queryByPlaceholderText('Search here')).toBeNull()
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))
    })
    expect(screen.getByPlaceholderText('Search here')).toBeTruthy()
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))
    })
    expect(screen.queryByPlaceholderText('Search here')).toBeNull()
  })

  it('renders into the given container with the class names', async () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    render(
      <Palette
        props={{
          dialog: true,
          container,
          className: 'root',
          contentClassName: 'content',
          overlayClassName: 'overlay',
          label: 'Commands',
        }}
      />,
    )
    await openDialog()
    const popup = container.querySelector('.content')!
    expect(popup.getAttribute('role')).toBe('dialog')
    expect(popup.getAttribute('aria-label')).toBe('Commands')
    expect(popup.querySelector('.root')?.contains(input())).toBe(true)
    expect(container.querySelector('.overlay')).toBeTruthy()
    expect(input().getAttribute('aria-label')).toBe('Commands')
    container.remove()
  })
})

describe('CommandPalette (Base UI adapter): props', () => {
  it('applies the class names, label and placeholder in inline mode', async () => {
    render(
      <Palette
        props={{
          className: 'root',
          inputClassName: 'input',
          listClassName: 'list',
          itemClassName: 'item',
          groupClassName: 'group',
          emptyClassName: 'empty',
          label: 'Commands',
          placeholder: 'Find...',
        }}
      />,
    )
    const root = document.querySelector('.root')!
    expect(root.contains(input())).toBe(true)
    expect(input().className).toBe('input')
    expect(input().getAttribute('aria-label')).toBe('Commands')
    expect(input().getAttribute('placeholder')).toBe('Find...')
    expect(screen.getByRole('listbox').className).toBe('list')
    expect(screen.getAllByRole('option').every((o) => o.className === 'item')).toBe(true)
    expect(screen.getAllByRole('group').every((g) => g.className === 'group')).toBe(true)
    await type('zzz')
    expect(document.querySelector('.empty')?.textContent).toMatch(/No results found\./)
  })

  it('uses the custom renderers', async () => {
    render(
      <Palette
        props={{
          renderItem: (item, score) => <span data-testid="custom">{`${item.label}:${score}`}</span>,
          renderGroupHeading: (group) => <em>{group.label.toUpperCase()}</em>,
          renderEmpty: () => <p>Nothing here</p>,
        }}
      />,
    )
    expect(screen.getAllByTestId('custom')[0].textContent).toMatch(/^Dashboard:/)
    expect(screen.getByText('PAGES')).toBeTruthy()
    await type('zzz')
    expect(screen.getByText(/Nothing here/)).toBeTruthy()
  })

  it('disablePointerSelection stops hover from moving the highlight', async () => {
    const { unmount } = render(<Palette />)
    await hover('Team')
    expect(highlighted()).toBe('Team')
    unmount()

    render(<Palette props={{ disablePointerSelection: true }} />)
    await hover('Team')
    expect(highlighted()).toBe('Dashboard')
  })

  it('keeps the highlight when the pointer leaves the list', async () => {
    render(<Palette />)
    await hover('Team')
    await act(async () => {
      fireEvent.pointerLeave(option('Team'), { pointerType: 'mouse', relatedTarget: document.body })
    })
    expect(highlighted()).toBe('Team')
  })

  it('server-renders the inline palette and hydrates without errors', async () => {
    // useCommandRegister registers in an effect, which never runs on the server.
    function RegisterDuringRender() {
      const { registry } = useEngineContext()
      React.useState(() => registry.registerMany(commands))
      return null
    }
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    const tree = (
      <CommandEngineProvider>
        <RegisterDuringRender />
        <CommandPalette />
      </CommandEngineProvider>
    )
    const html = renderToString(tree)
    expect(html).toContain('role="combobox"')
    expect(html).toContain('Type a command or search...')
    expect(html.match(/role="option"/g)).toHaveLength(5)
    expect(
      renderToString(
        <CommandEngineProvider>
          <CommandPalette dialog />
        </CommandEngineProvider>,
      ),
    ).toBe('')

    const host = document.createElement('div')
    host.innerHTML = html
    document.body.appendChild(host)
    // Unmount even if an assertion fails: a live root can still run work after
    // jsdom is torn down ("window is not defined").
    let root: ReturnType<typeof hydrateRoot> | undefined
    onTestFinished(() => {
      act(() => root?.unmount())
      host.remove()
    })
    await act(async () => {
      root = hydrateRoot(host, tree)
    })
    expect(errors).not.toHaveBeenCalled()
    errors.mockRestore()
  })
})
