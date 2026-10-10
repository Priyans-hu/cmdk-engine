'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { CommandEngineConfig, CommandItem } from 'cmdk-engine'
import { CommandEngineProvider, useCommandRegister } from 'cmdk-engine/react'
import { CommandPalette, useCommandPaletteShortcut } from 'cmdk-engine/adapters/cmdk'
import { DOCS_NAV, SITE } from '@/lib/constants'
import { useTheme } from './theme-provider'
import './palette-demo.css'

// The live demo: Cmd+K on this site, with the repo's own build of cmdk-engine.

const PAGE_KEYWORDS: Record<string, string[]> = {
  '/docs/getting-started': ['install', 'setup', 'quick start'],
  '/docs/api': ['hooks', 'props', 'provider'],
  '/docs/examples': ['recipes', 'samples'],
}

// One command per page in the sidebar, so new pages show up without a change here.
const pageCommands: CommandItem[] = [
  { id: 'page-home', label: 'Home', href: '/', group: 'Pages', keywords: ['start'] },
  ...DOCS_NAV.flatMap((section) =>
    section.items.map((page) => ({
      id: `page-${page.href}`,
      label: page.label,
      href: page.href,
      group: 'Pages',
      keywords: [section.title, ...(PAGE_KEYWORDS[page.href] ?? [])],
    })),
  ),
]

const linkCommands: CommandItem[] = [
  { id: 'link-github', label: 'GitHub repository', href: SITE.github, group: 'Links' },
  { id: 'link-npm', label: 'npm package', href: SITE.npm, group: 'Links' },
  {
    id: 'link-issue',
    label: 'Report an issue',
    href: `${SITE.github}/issues/new/choose`,
    keywords: ['bug', 'feature request'],
    group: 'Links',
  },
  {
    id: 'link-changelog',
    label: 'Changelog',
    href: `${SITE.github}/blob/main/CHANGELOG.md`,
    keywords: ['releases', 'versions'],
    group: 'Links',
  },
]

const synonyms = {
  theme: ['dark', 'light', 'mode', 'appearance'],
  api: ['reference', 'hooks'],
  install: ['setup', 'npm'],
}

function Commands() {
  const { setTheme } = useTheme()
  const actions = useMemo<CommandItem[]>(
    () => [
      {
        id: 'action-theme',
        label: 'Theme',
        description: 'Light, dark or system',
        group: 'Actions',
        children: [
          { id: 'theme-light', label: 'Light', action: () => setTheme('light') },
          { id: 'theme-dark', label: 'Dark', action: () => setTheme('dark') },
          { id: 'theme-system', label: 'System', action: () => setTheme('system') },
        ],
      },
      {
        id: 'action-copy-install',
        label: 'Copy the install command',
        description: 'npm install cmdk-engine cmdk',
        group: 'Actions',
        action: () => navigator.clipboard?.writeText('npm install cmdk-engine cmdk'),
      },
    ],
    [setTheme],
  )
  useCommandRegister(pageCommands)
  useCommandRegister(linkCommands)
  useCommandRegister(actions)
  return null
}

function Palette() {
  useCommandPaletteShortcut()
  return <CommandPalette dialog placeholder="Search the docs..." />
}

export function PaletteDemo({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const config = useMemo<CommandEngineConfig>(
    () => ({
      // router.push keeps the /cmdk-engine base path; other sites open in a new tab.
      onNavigate: (href) =>
        href.startsWith('/') ? router.push(href) : window.open(href, '_blank', 'noopener'),
      synonyms,
      frecency: { showRecent: true, storageKey: 'cmdk-engine-docs-frecency' },
    }),
    [router],
  )

  return (
    <CommandEngineProvider config={config}>
      <Commands />
      <Palette />
      {children}
    </CommandEngineProvider>
  )
}
