import { describe, it, expect } from 'vitest'
import React from 'react'
import { render, act } from '@testing-library/react'
import { CommandEngineProvider } from '../../src/react/context'
import { useCommandPalette } from '../../src/react/use-command-palette'
import { useCommandRegister } from '../../src/react/use-command-register'
import type { UseCommandPaletteReturn } from '../../src/react/use-command-palette'

describe('CommandEngineProvider · without a config prop', () => {
  it('does not re-render engine consumers on each keystroke', () => {
    let renders = 0
    function Commands() {
      renders++
      useCommandRegister([{ id: 'a', label: 'Alpha' }])
      return null
    }
    let palette!: UseCommandPaletteReturn
    function Palette() {
      palette = useCommandPalette()
      return null
    }
    render(
      <CommandEngineProvider>
        <Commands />
        <Palette />
      </CommandEngineProvider>,
    )
    const before = renders

    for (const query of ['a', 'al', 'alp', 'alph', 'alpha']) {
      act(() => palette.setSearch(query))
    }

    expect(palette.search).toBe('alpha')
    expect(renders).toBe(before)
  })
})
