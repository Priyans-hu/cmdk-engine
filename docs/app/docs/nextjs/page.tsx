import { CodeBlock } from '@/components/code-block'

export const metadata = { title: 'Next.js' }

export default function NextJsGuide() {
  return (
    <>
      <h1>Next.js</h1>
      <p>
        The Quick Start works in the App Router. Two things are specific to Next.js: where the
        provider lives, and how commands come from your routes.
      </p>

      <h2>1. A client file for the palette</h2>
      <p>
        The provider, the palette and the shortcut use state and effects, so they run in a Client
        Component. Put them in one file that starts with <code>&apos;use client&apos;</code>,
        together with the provider config:
      </p>
      <CodeBlock
        language="tsx"
        filename="app/command-menu.tsx"
        code={`'use client'

import { useMemo, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { CommandEngineProvider, useCommandRegister } from 'cmdk-engine/react'
import { CommandPalette, useCommandPaletteShortcut } from 'cmdk-engine/adapters/cmdk'
import { sitemapToCommands } from 'cmdk-engine/adapters/sitemap'
import sitemap from '@/generated/command-routes.json'

const routeCommands = sitemapToCommands(sitemap)

function Palette() {
  useCommandRegister(routeCommands)
  useCommandPaletteShortcut() // Cmd+K / Ctrl+K
  return <CommandPalette dialog placeholder="Search..." />
}

export function CommandMenu({ children }: { children: ReactNode }) {
  const router = useRouter()
  const config = useMemo(() => ({ onNavigate: (href: string) => router.push(href) }), [router])

  return (
    <CommandEngineProvider config={config}>
      {children}
      <Palette />
    </CommandEngineProvider>
  )
}`}
      />
      <p>Render it from the root layout, which stays a Server Component:</p>
      <CodeBlock
        language="tsx"
        filename="app/layout.tsx"
        code={`import type { ReactNode } from 'react'
import { CommandMenu } from './command-menu'

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <CommandMenu>{children}</CommandMenu>
      </body>
    </html>
  )
}`}
      />

      <h2>Why the config stays in the client file</h2>
      <p>
        A Server Component can pass only serializable props to a Client Component.{' '}
        <code>onNavigate</code>, <code>onSelect</code>, <code>t</code>, <code>asyncSources</code>{' '}
        and access-control providers are functions, so a <code>config</code> written in a server
        layout fails the build (&quot;Functions cannot be passed directly to Client
        Components&quot;). Define the config in the <code>&apos;use client&apos;</code> file: at
        module scope, or with <code>useMemo</code> when it needs a hook such as{' '}
        <code>useRouter</code>.
      </p>

      <h2>2. Commands from your routes</h2>
      <p>
        The CLI scans your <code>app/</code> directory. Run it before each build:
      </p>
      <CodeBlock
        language="json"
        filename="package.json"
        code={`{
  "scripts": {
    "prebuild": "cmdk-engine scan --framework nextjs-app"
  }
}`}
      />
      <p>
        It writes <code>src/generated/command-routes.json</code>, which the <code>@/</code> import
        above reads in a <code>src/</code> layout; set <code>output</code> in{' '}
        <code>cmdk-engine.config.ts</code> to write it elsewhere. Every <code>page</code> file
        becomes a route:
      </p>
      <ul>
        <li>
          route groups and <code>@slot</code> folders add no segment;
        </li>
        <li>
          private <code>_folders</code>, intercepting <code>(.)</code> routes and <code>api/</code>{' '}
          are skipped;
        </li>
        <li>
          <code>[[...slug]]</code> gives its parent&apos;s URL, and other dynamic routes are skipped
          unless you name them (below).
        </li>
      </ul>

      <h2>3. Apps under [locale]</h2>
      <p>
        When every page sits under a dynamic segment such as <code>app/[locale]</code>, name it so
        the scan keeps those routes:
      </p>
      <CodeBlock
        language="ts"
        filename="cmdk-engine.config.ts"
        code={`import { defineConfig } from 'cmdk-engine'

export default defineConfig({
  framework: 'nextjs-app',
  includeDynamic: ['locale'],
})`}
      />
      <p>
        <code>app/[locale]/billing/page.tsx</code> then becomes <code>/:locale/billing</code>. Fill
        the segment with the current locale when you register the commands:
      </p>
      <CodeBlock
        language="tsx"
        filename="app/[locale]/command-menu.tsx"
        code={`function RouteCommands() {
  const { locale } = useParams<{ locale: string }>()
  const commands = useMemo(() => sitemapToCommands(sitemap, { params: { locale } }), [locale])
  useCommandRegister(commands)
  return null
}`}
      />
      <p>
        <code>params</code> values are inserted as given. Pass <code>&apos;&apos;</code> to drop the
        segment, for a default locale served without a prefix or a router that adds the prefix
        itself. Ids keep the placeholder (<code>locale--billing</code>), so frecency and Recent are
        shared across locales.
      </p>

      <h2>Pages Router</h2>
      <p>
        Scan with <code>--framework nextjs-pages</code>, render the provider in{' '}
        <code>pages/_app.tsx</code>, and navigate with <code>useRouter</code> from{' '}
        <code>next/router</code>. The Pages Router needs no <code>&apos;use client&apos;</code>.
      </p>
    </>
  )
}
