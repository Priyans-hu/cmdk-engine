import { useMemo } from 'react'
import type { CommandItem } from 'cmdk-engine'
import { useCommandRegister, usePaletteState } from 'cmdk-engine/react'

import { Button } from '@/components/ui/button'
import { CommandPalette } from '@/components/command-palette'
import { CommandPalette as BaseUiCommandPalette } from '@/components/command-palette-base-ui'
import { useTheme } from '@/components/theme-provider'

// ?adapter=base-ui renders the Base UI registry item instead of the cmdk one.
const baseUi = new URLSearchParams(window.location.search).get('adapter') === 'base-ui'

function Commands() {
  const { setTheme } = useTheme()
  const commands = useMemo<CommandItem[]>(
    () => [
      {
        id: 'theme',
        label: 'Theme',
        description: 'Light, dark or system',
        keywords: ['dark', 'light', 'mode'],
        group: 'Settings',
        children: [
          { id: 'theme-light', label: 'Light', action: () => setTheme('light') },
          { id: 'theme-dark', label: 'Dark', action: () => setTheme('dark') },
          { id: 'theme-system', label: 'System', action: () => setTheme('system') },
        ],
      },
      {
        id: 'docs',
        label: 'Documentation',
        keywords: ['guide', 'help'],
        group: 'Links',
        href: 'https://priyans-hu.github.io/cmdk-engine/',
      },
      {
        id: 'repo',
        label: 'GitHub repository',
        keywords: ['source', 'code'],
        group: 'Links',
        href: 'https://github.com/Priyans-hu/cmdk-engine',
      },
      {
        id: 'sso',
        label: 'Single Sign-On',
        description: 'Available on the Enterprise plan',
        group: 'Settings',
        disabled: true,
      },
    ],
    [setTheme],
  )
  useCommandRegister(commands)
  return null
}

export default function App() {
  const { setIsOpen } = usePaletteState()
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <Commands />
      {baseUi ? <BaseUiCommandPalette /> : <CommandPalette />}
      <h1 className="text-2xl font-semibold">cmdk-engine with shadcn/ui</h1>
      <p className="text-muted-foreground">
        Press ⌘K (Ctrl+K on Windows and Linux), or open it here. Press <kbd>d</kbd> for dark mode.
      </p>
      <Button variant="outline" onClick={() => setIsOpen(true)}>
        Search commands
      </Button>
      <a href={baseUi ? '?' : '?adapter=base-ui'} className="text-sm underline">
        Use the {baseUi ? 'cmdk' : 'Base UI'} registry item
      </a>
    </div>
  )
}
