import { CommandPalette, useCommandPaletteShortcut } from 'cmdk-engine/adapters/cmdk'

// Styled by the Styling CSS from GUIDE.md (styles.css).
export function Palette() {
  useCommandPaletteShortcut() // Cmd+K / Ctrl+K
  return <CommandPalette dialog placeholder="Search pages..." />
}
