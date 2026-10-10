import { describe, it, expect, vi, afterEach } from 'vitest'
import type { ComponentProps } from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { CommandEngineProvider } from '../../src/react/context'
import { useCommandRegister } from '../../src/react/use-command-register'
import { useCommandPalette } from '../../src/react/use-command-palette'
import { CommandPalette } from '../../src/adapters/base-ui/command-palette'
import type { CommandItem } from '../../src/core/types'

// No ResizeObserver or scrollIntoView mocks: Base UI needs no jsdom polyfills.

afterEach(() => localStorage.clear())

// Display order: Archive (disabled), Dashboard, Billing, Reports (disabled), Team, Settings
const commands: CommandItem[] = [
  { id: 'archive', label: 'Archive', disabled: true },
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'billing', label: 'Billing' },
  { id: 'reports', label: 'Reports', disabled: true },
  { id: 'team', label: 'Team' },
  {
    id: 'settings',
    label: 'Settings',
    children: [
      { id: 'locked', label: 'Locked', disabled: true },
      { id: 'general', label: 'General' },
    ],
  },
]

function Register({ items }: { items: CommandItem[] }) {
  useCommandRegister(items)
  return null
}

function Opener() {
  const { open } = useCommandPalette()
  return (
    <button type="button" onClick={open}>
      open
    </button>
  )
}

type PaletteProps = ComponentProps<typeof CommandPalette>

function renderPalette(props: PaletteProps = {}, items = commands) {
  return render(
    <CommandEngineProvider>
      <Register items={items} />
      <Opener />
      <CommandPalette {...props} />
    </CommandEngineProvider>,
  )
}

const input = () => screen.getByRole('combobox') as HTMLInputElement
const label = (el: Element | null | undefined) =>
  el?.querySelector('[data-cmdk-engine-item-label]')?.textContent
const highlighted = () => label(document.querySelector('[role="option"][data-highlighted]'))
const firstEnabled = () => label(document.querySelector('[role="option"]:not([data-disabled])'))
const row = (text: string) => screen.getByText(text).closest('[role="option"]')!

async function press(key: string) {
  await act(async () => {
    fireEvent.keyDown(document.activeElement ?? document.body, { key })
  })
}

async function pressTimes(key: string, times: number) {
  for (let i = 0; i < times; i++) await press(key)
}

// Real typing: Base UI only resets the highlight for input events with an inputType.
async function type(value: string) {
  await act(async () => {
    fireEvent.input(input(), { target: { value }, inputType: 'insertText' })
  })
}

async function openDialog() {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'open' }))
  })
  // Base UI focuses `initialFocus` (the input) on the next animation frame.
  await act(() => vi.waitFor(() => expect(document.activeElement).toBe(input())))
}

describe('CommandPalette (Base UI adapter): disabled items', () => {
  it('opens and reopens on the first enabled item, and Enter runs it', async () => {
    const onSelect = vi.fn()
    renderPalette({ dialog: true, onSelect })
    await openDialog()
    expect(highlighted()).toBe('Dashboard')
    await press('Escape')
    expect(screen.queryByRole('dialog')).toBeNull()

    await openDialog()
    expect(highlighted()).toBe('Dashboard')
    await press('Enter')
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'dashboard' }))
  })

  it('highlights the first enabled match while typing', async () => {
    renderPalette()
    input().focus()
    for (const query of ['ar', 're', '']) {
      await type(query)
      expect(highlighted()).toBe(firstEnabled())
    }
    await type('ar')
    expect(label(document.querySelector('[role="option"]'))).toBe('Archive')
    expect(highlighted()).not.toBe('Archive')
  })

  it('skips disabled items with the arrow keys, wrapping by default', async () => {
    renderPalette()
    input().focus()
    const seen: Array<string | null | undefined> = []
    for (let i = 0; i < 4; i++) {
      await press('ArrowDown')
      seen.push(highlighted())
    }
    expect(seen).toEqual(['Billing', 'Team', 'Settings', 'Dashboard'])
    await press('ArrowUp')
    expect(highlighted()).toBe('Settings')
  })

  it('stops at the first and last enabled items with loop={false}', async () => {
    renderPalette({ loop: false })
    input().focus()
    await pressTimes('ArrowDown', 5)
    expect(highlighted()).toBe('Settings')
    await pressTimes('ArrowUp', 5)
    expect(highlighted()).toBe('Dashboard')
  })

  it('drills down to the first enabled child', async () => {
    renderPalette()
    input().focus()
    await pressTimes('ArrowDown', 3)
    expect(highlighted()).toBe('Settings')
    await press('Enter')
    expect(screen.getByText('Locked')).toBeTruthy()
    expect(highlighted()).toBe('General')
  })

  it('highlights and runs nothing when every item is disabled', async () => {
    const onSelect = vi.fn()
    renderPalette({ onSelect }, [
      { id: 'archive', label: 'Archive', disabled: true },
      { id: 'reports', label: 'Reports', disabled: true },
    ])
    input().focus()
    expect(highlighted()).toBeUndefined()
    await press('ArrowDown')
    await press('Enter')
    expect(highlighted()).toBeUndefined()
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('keeps disabled rows inert: no hover, no click, and focus stays in the input', async () => {
    const onSelect = vi.fn()
    renderPalette({ onSelect, itemClassName: 'item' })
    input().focus()
    const reports = row('Reports')
    expect(reports.getAttribute('aria-disabled')).toBe('true')
    expect(reports.hasAttribute('data-disabled')).toBe(true)
    expect(reports.className).toBe('item')

    await act(async () => {
      fireEvent.pointerMove(reports, { pointerType: 'mouse' })
      fireEvent.mouseMove(reports)
    })
    expect(highlighted()).toBe('Dashboard')

    // A mousedown on the row would otherwise move focus out of the input.
    expect(fireEvent.mouseDown(reports)).toBe(false)
    await act(async () => {
      fireEvent.click(reports)
    })
    expect(onSelect).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(input())
  })

  it('renders disabled rows with a custom renderItem', () => {
    renderPalette({ renderItem: (item) => <span>custom {item.label}</span> })
    expect(screen.getByText('custom Archive').closest('[role="option"]')).toBeTruthy()
    expect(document.querySelector('[role="option"][data-highlighted]')?.textContent).toBe(
      'custom Dashboard',
    )
  })
})
