import Link from 'next/link'
import { CodeBlock } from '@/components/code-block'

export const metadata = { title: 'Getting Started' }

export default function GettingStarted() {
  return (
    <>
      <h1>Getting Started</h1>
      <p>Get cmdk-engine running in your React project in under 5 minutes.</p>

      <h2>Installation</h2>
      <CodeBlock code="npm install cmdk-engine cmdk react react-dom" language="bash" />
      <p>Or with other package managers:</p>
      <CodeBlock
        code={`bun add cmdk-engine cmdk
pnpm add cmdk-engine cmdk
yarn add cmdk-engine cmdk`}
        language="bash"
      />
      <p>
        Prefer Base UI? Install <code>@base-ui/react</code> instead of <code>cmdk</code> and import
        the palette from <code>cmdk-engine/adapters/base-ui</code>. See{' '}
        <Link href="/docs/adapters">Adapters</Link>.
      </p>

      <h3>Requirements</h3>
      <ul>
        <li>
          <strong>React</strong> 18 or 19.
        </li>
        <li>
          <strong>A UI adapter:</strong> <code>cmdk</code> ^1 for the cmdk adapter, or{' '}
          <code>@base-ui/react</code> ^1.1 for the Base UI adapter. Or build your own UI with the
          hooks.
        </li>
        <li>
          <strong>Optional:</strong> <code>react-router</code> 6, 7 or 8 for the route scanner, and{' '}
          <code>match-sorter</code> 7 or 8 for the match-sorter search backend.
        </li>
        <li>
          <strong>Node.js</strong> 20 or later, needed by the CLI only. The library runs in the
          browser and during SSR.
        </li>
      </ul>
      <p>
        <strong>Support:</strong> the latest minor release gets fixes. While the version is 0.x, a
        minor release can change behavior; each such change is listed as a &quot;Behavior
        change&quot; in the{' '}
        <a href="https://github.com/Priyans-hu/cmdk-engine/blob/main/CHANGELOG.md">changelog</a>.
      </p>

      <h2>1. Add the Provider</h2>
      <p>
        Wrap your app with <code>CommandEngineProvider</code>, for example in a{' '}
        <code>Providers</code> component rendered once near the root. It initializes the command
        registry, search engine, and frecency tracker. Define <code>config</code> once, outside the
        component: a new object on every render rebuilds the engine.
      </p>
      <CodeBlock
        language="tsx"
        filename="Providers.tsx"
        code={`import { CommandEngineProvider } from 'cmdk-engine/react'

const config = {
  synonyms: {
    billing: ['money', 'payment', 'credits'],
  },
  // Runs for commands with an href and no action. With a React Router
  // data router, use (href) => router.navigate(href) to skip the reload.
  onNavigate: (href: string) => window.location.assign(href),
  frecency: { showRecent: true },
}

export function Providers({ children }: { children: React.ReactNode }) {
  return <CommandEngineProvider config={config}>{children}</CommandEngineProvider>
}`}
      />

      <h2>2. Register Commands</h2>
      <p>
        Use <code>useCommandRegister</code> to register commands from any component under the
        provider. Commands are removed when the component unmounts, so register app-wide navigation
        in a layout that stays mounted, and page-specific commands in the page.
      </p>
      <CodeBlock
        language="tsx"
        filename="BillingPage.tsx"
        code={`import { useCommandRegister } from 'cmdk-engine/react'
import { CreditCard } from 'lucide-react'

function BillingPage() {
  useCommandRegister([{
    id: 'billing-overview',
    label: 'Billing Overview',
    href: '/billing/overview',
    keywords: ['balance', 'credits'],
    group: 'Billing',
    icon: <CreditCard size={16} />,
  }])

  return <div>...</div>
}`}
      />

      <h2>3. Add the Command Palette</h2>
      <p>Use the pre-wired cmdk adapter or build your own UI with hooks.</p>
      <CodeBlock
        language="tsx"
        filename="CommandMenu.tsx"
        code={`import { CommandPalette } from 'cmdk-engine/adapters/cmdk'

function CommandMenu() {
  return <CommandPalette dialog placeholder="Search commands..." />
}`}
      />

      <h2>4. Add Keyboard Shortcut</h2>
      <p>
        Call <code>useCommandPaletteShortcut</code> in a component inside the provider, such as the{' '}
        <code>CommandMenu</code> from step 3. Calling it in the component that renders the provider
        throws, because that component sits outside it.
      </p>
      <CodeBlock
        language="tsx"
        filename="CommandMenu.tsx"
        code={`import { CommandPalette, useCommandPaletteShortcut } from 'cmdk-engine/adapters/cmdk'

function CommandMenu() {
  useCommandPaletteShortcut('k') // Cmd+K / Ctrl+K
  return <CommandPalette dialog placeholder="Search commands..." />
}`}
      />

      <h2>5. Style the Palette</h2>
      <p>
        <code>CommandPalette</code> ships no styles, so it looks unstyled until you add some. Copy
        the starter stylesheet (plain CSS or Tailwind) from the{' '}
        <Link href="/docs/styling">Styling</Link> page, then press Cmd+K (Ctrl+K on Windows and
        Linux).
      </p>

      <h2>Troubleshooting</h2>
      <h3>
        <code>... must be used within a &lt;CommandEngineProvider&gt;</code>
      </h3>
      <p>
        A cmdk-engine hook or component ran outside the provider. The message starts with the name
        of the hook that failed, such as <code>useCommandRegister</code>, and lists the usual
        causes:
      </p>
      <ul>
        <li>
          The hook is called in the component that renders <code>CommandEngineProvider</code>. Move
          it into a child component.
        </li>
        <li>
          Two copies of <code>cmdk-engine</code> are installed (in a monorepo, or at mismatched
          versions), so the component and the provider use different contexts. Make sure one copy
          resolves.
        </li>
        <li>
          A bundler or test alias maps <code>cmdk-engine/react</code> or an adapter path but not{' '}
          <code>cmdk-engine</code>. The entries import each other by package name, so map them all.
        </li>
      </ul>
      <h3>The dialog never opens</h3>
      <p>
        A palette with <code>dialog</code> opens only when something toggles it. Call{' '}
        <code>useCommandPaletteShortcut()</code> in a component inside the provider, or call{' '}
        <code>toggle()</code> from <code>useCommandPalette()</code>.
      </p>
      <h3>Next.js: &quot;Event handlers cannot be passed to Client Component props&quot;</h3>
      <p>
        Put <code>&apos;use client&apos;</code> at the top of the file that renders the provider. A
        Server Component cannot pass functions such as <code>onNavigate</code> to it.
      </p>

      <h2>Next Steps</h2>
      <ul>
        <li>
          Read the <Link href="/docs/api">API Reference</Link> for all exports
        </li>
        <li>
          Pick an adapter, or switch to Base UI, on the <Link href="/docs/adapters">Adapters</Link>{' '}
          page
        </li>
        <li>
          Use shadcn/ui or Next.js? Follow the <Link href="/docs/shadcn">shadcn/ui</Link> or{' '}
          <Link href="/docs/nextjs">Next.js</Link> guide
        </li>
        <li>
          See <Link href="/docs/examples">Examples</Link> for common patterns and runnable apps
        </li>
        <li>
          Explore the <a href="https://github.com/Priyans-hu/cmdk-engine">source code on GitHub</a>
        </li>
      </ul>
    </>
  )
}
