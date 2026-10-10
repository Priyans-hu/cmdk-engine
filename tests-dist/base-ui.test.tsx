import { describe, it, expect } from 'vitest'
import React from 'react'
import { createRequire } from 'node:module'
import { render, screen, fireEvent, act } from '@testing-library/react'
// Self-reference: these resolve through package.json `exports` to the built dist/, not src/.
import { CommandEngineProvider, useCommandRegister, useCommandPalette } from 'cmdk-engine/react'
import { CommandPalette, useCommandPaletteShortcut } from 'cmdk-engine/adapters/base-ui'
import baseUiPackage from '@base-ui/react/package.json'

// No jsdom polyfills: Base UI needs none.

interface BaseUiEntries {
  CommandEngineProvider: typeof CommandEngineProvider
  useCommandRegister: typeof useCommandRegister
  useCommandPalette: typeof useCommandPalette
  CommandPalette: typeof CommandPalette
  useCommandPaletteShortcut: typeof useCommandPaletteShortcut
}

const commands = [
  { id: 'billing', label: 'Billing', keywords: ['money'] },
  {
    id: 'settings',
    label: 'Settings',
    children: [
      { id: 'general', label: 'General' },
      { id: 'security', label: 'Security' },
    ],
  },
  { id: 'team', label: 'Team' },
]

const labels = () =>
  Array.from(
    document.querySelectorAll('[role="option"] [data-cmdk-engine-item-label]'),
    (el) => el.textContent,
  )
const highlighted = () =>
  document.querySelector('[role="option"][data-highlighted] [data-cmdk-engine-item-label]')
    ?.textContent

// Provider from `cmdk-engine/react`, palette and shortcut from `cmdk-engine/adapters/base-ui`.
async function checkBaseUi(entries: BaseUiEntries) {
  function Register() {
    entries.useCommandRegister(commands)
    return null
  }
  function Depth() {
    return <output data-testid="depth">{entries.useCommandPalette().depth}</output>
  }
  function Shortcut() {
    entries.useCommandPaletteShortcut()
    return null
  }
  const view = render(
    <entries.CommandEngineProvider>
      <Register />
      <Depth />
      <Shortcut />
      <entries.CommandPalette loop={false} />
    </entries.CommandEngineProvider>,
  )
  const input = screen.getByRole('combobox')
  const type = (value: string, inputType: string) =>
    act(async () => {
      fireEvent.input(input, { target: { value }, inputType })
    })
  const press = (key: string) =>
    act(async () => {
      fireEvent.keyDown(input, { key })
    })
  input.focus()

  // The engine's results, unfiltered by Base UI: "money" only matches a keyword.
  await type('money', 'insertText')
  expect(labels()).toEqual(['Billing'])
  await type('', 'deleteContentBackward')
  expect(labels()).toEqual(['Billing', 'Settings', 'Team'])

  // loop={false} stops at the last item.
  await press('ArrowDown')
  await press('ArrowDown')
  await press('ArrowDown')
  expect(highlighted()).toBe('Team')

  // Drilling into Settings starts on its first child, with focus in the input.
  await press('ArrowUp')
  await press('Enter')
  expect(screen.getByTestId('depth').textContent).toBe('1')
  expect(highlighted()).toBe('General')
  expect(document.activeElement).toBe(screen.getByRole('combobox'))
  view.unmount()
}

describe('built package: Base UI adapter', () => {
  it('filters, navigates and drills down through the ESM entries', async () => {
    await checkBaseUi({
      CommandEngineProvider,
      useCommandRegister,
      useCommandPalette,
      CommandPalette,
      useCommandPaletteShortcut,
    })

    // vitest.dist.floor.config.ts reruns this test with @base-ui/react aliased to
    // the lowest supported version, for the adapter in dist/ too. Base UI 1.4.0+
    // appends U+2060 to a live region's first text for 200 ms; 1.1.0 does not, so
    // a clean empty state proves the adapter really ran on the floor version.
    if (process.env.BASE_UI_FLOOR) {
      expect(baseUiPackage.version).toBe(process.env.BASE_UI_FLOOR)
      render(
        <CommandEngineProvider>
          <CommandPalette />
        </CommandEngineProvider>,
      )
      expect(screen.getByText(/No results found\./).textContent).toBe('No results found.')
    }
  })

  // Also runs on the floor version (vitest.dist.floor.config.ts matches "ESM").
  it('highlights only enabled items through the ESM entries', async () => {
    function Register() {
      useCommandRegister([
        { id: 'archive', label: 'Archive', disabled: true },
        { id: 'billing', label: 'Billing' },
        { id: 'reports', label: 'Reports', disabled: true },
        { id: 'team', label: 'Team' },
      ])
      return null
    }
    render(
      <CommandEngineProvider>
        <Register />
        <CommandPalette />
      </CommandEngineProvider>,
    )
    await act(async () => {})
    const input = screen.getByRole('combobox')
    input.focus()
    expect(highlighted()).toBe('Billing')
    const press = (key: string) =>
      act(async () => {
        fireEvent.keyDown(input, { key })
      })
    await press('ArrowDown')
    expect(highlighted()).toBe('Team')
    await press('ArrowDown')
    expect(highlighted()).toBe('Billing')
  })

  it('filters, navigates and drills down through the CJS entries', async () => {
    const require = createRequire(import.meta.url)
    await checkBaseUi({
      ...require('cmdk-engine/react'),
      ...require('cmdk-engine/adapters/base-ui'),
    })
  })
})
