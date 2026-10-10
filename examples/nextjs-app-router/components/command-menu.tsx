'use client'

import { useMemo } from 'react'
import type { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import type { CommandEngineConfig } from 'cmdk-engine'
import { CommandEngineProvider, useCommandRegister } from 'cmdk-engine/react'
import { CommandPalette, useCommandPaletteShortcut } from 'cmdk-engine/adapters/cmdk'
import { sitemapToCommands } from 'cmdk-engine/adapters/sitemap'
// Written by `cmdk-engine scan` before `next dev` and `next build` (package.json).
import sitemap from '@/command-routes.json'

function Commands({ locale }: { locale: string }) {
  // The scan keeps /:locale/... routes (--include-dynamic locale); fill in this locale.
  const commands = useMemo(() => sitemapToCommands(sitemap, { params: { locale } }), [locale])
  useCommandRegister(commands)
  return null
}

function Palette() {
  useCommandPaletteShortcut() // Cmd+K / Ctrl+K
  return <CommandPalette dialog placeholder="Search pages..." />
}

// A Server Component cannot pass functions like onNavigate to the provider, so
// the provider lives in this client file and the server layout renders it.
export function CommandMenu({ locale, children }: { locale: string; children: ReactNode }) {
  const router = useRouter()
  const config = useMemo<CommandEngineConfig>(
    () => ({ onNavigate: (href) => router.push(href) }),
    [router],
  )

  return (
    <CommandEngineProvider config={config}>
      <Commands locale={locale} />
      <Palette />
      {children}
    </CommandEngineProvider>
  )
}
