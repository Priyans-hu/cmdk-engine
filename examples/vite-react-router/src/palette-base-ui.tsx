import { CommandPalette, useCommandPaletteShortcut } from 'cmdk-engine/adapters/base-ui'

// Base UI renders no [cmdk-*] attributes, so its parts are styled through classes
// (styles.css). The [data-cmdk-engine-*] item markup is the same as cmdk's.
export function BaseUiPalette() {
  useCommandPaletteShortcut() // Cmd+K / Ctrl+K
  return (
    <CommandPalette
      dialog
      placeholder="Search pages..."
      overlayClassName="bui-backdrop"
      contentClassName="bui-popup"
      inputClassName="bui-input"
      listClassName="bui-list"
      groupClassName="bui-group"
      itemClassName="bui-item"
      emptyClassName="bui-empty"
    />
  )
}
