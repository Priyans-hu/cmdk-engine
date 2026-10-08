import { describe, it, expect, vi, beforeAll } from 'vitest'
import React from 'react'
import { createRequire } from 'node:module'
import { render, screen } from '@testing-library/react'
// Self-reference: these resolve through package.json `exports` to the built dist/, not src/.
import { CommandEngineProvider, useCommandRegister } from 'cmdk-engine/react'
import { CommandPalette, useCommandPaletteShortcut } from 'cmdk-engine/adapters/cmdk'

// cmdk uses ResizeObserver + scrollIntoView internally — mock them for jsdom
beforeAll(() => {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
  Element.prototype.scrollIntoView = vi.fn()
})

interface QuickStartEntries {
  CommandEngineProvider: typeof CommandEngineProvider
  useCommandRegister: typeof useCommandRegister
  CommandPalette: typeof CommandPalette
  useCommandPaletteShortcut: typeof useCommandPaletteShortcut
}

// README Quick Start: provider from `cmdk-engine/react`, palette from `cmdk-engine/adapters/cmdk`.
function renderQuickStart(entries: QuickStartEntries) {
  function Register() {
    entries.useCommandRegister([
      { id: 'billing-overview', label: 'Billing Overview', href: '/billing/overview' },
    ])
    return null
  }
  function Shortcut() {
    entries.useCommandPaletteShortcut()
    return null
  }
  return render(
    <entries.CommandEngineProvider>
      <Register />
      <Shortcut />
      <entries.CommandPalette />
    </entries.CommandEngineProvider>,
  )
}

describe('built package: README Quick Start', () => {
  it('renders registered commands through the ESM entries', async () => {
    renderQuickStart({
      CommandEngineProvider,
      useCommandRegister,
      CommandPalette,
      useCommandPaletteShortcut,
    })
    expect(await screen.findByText('Billing Overview')).toBeTruthy()
  })

  it('renders registered commands through the CJS entries', async () => {
    const require = createRequire(import.meta.url)
    renderQuickStart({ ...require('cmdk-engine/react'), ...require('cmdk-engine/adapters/cmdk') })
    expect(await screen.findByText('Billing Overview')).toBeTruthy()
  })
})
