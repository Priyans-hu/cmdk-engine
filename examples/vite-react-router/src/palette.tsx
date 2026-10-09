import { CommandPalette, useCommandPaletteShortcut } from 'cmdk-engine/adapters/cmdk'

// Styled by the README's Styling CSS (styles.css).
export function Palette() {
  useCommandPaletteShortcut() // Cmd+K / Ctrl+K
  return <CommandPalette dialog placeholder="Search pages..." />
}
