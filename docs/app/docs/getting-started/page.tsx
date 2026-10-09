import { CodeBlock } from '@/components/code-block'

export const metadata = { title: 'Getting Started' }

export default function GettingStarted() {
  return (
    <>
      <h1>Getting Started</h1>
      <p>Get cmdk-engine running in your React project in under 5 minutes.</p>

      <h2>Installation</h2>
      <CodeBlock
        code="npm install cmdk-engine cmdk react react-dom"
        language="bash"
      />
      <p>
        Or with other package managers:
      </p>
      <CodeBlock
        code={`bun add cmdk-engine cmdk
pnpm add cmdk-engine cmdk
yarn add cmdk-engine cmdk`}
        language="bash"
      />

      <h2>1. Add the Provider</h2>
      <p>
        Wrap your app with <code>CommandEngineProvider</code>. This initializes the command registry,
        search engine, and frecency tracker. Define <code>config</code> once, outside the component:
        a new object on every render rebuilds the engine.
      </p>
      <CodeBlock
        language="tsx"
        filename="App.tsx"
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

function App() {
  return (
    <CommandEngineProvider config={config}>
      <YourApp />
    </CommandEngineProvider>
  )
}`}
      />

      <h2>2. Register Commands</h2>
      <p>
        Use <code>useCommandRegister</code> to register commands from any component.
        Commands are automatically cleaned up when the component unmounts.
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
        Call <code>useCommandPaletteShortcut</code> in a component inside the provider, such as
        the <code>CommandMenu</code> from step 3. Calling it in the <code>App</code> that renders
        the provider throws, because that component sits outside it.
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

      <h2>Next Steps</h2>
      <ul>
        <li>Read the <a href="/docs/api">API Reference</a> for all exports</li>
        <li>See <a href="/docs/examples">Examples</a> for common patterns</li>
        <li>Explore the <a href="https://github.com/Priyans-hu/cmdk-engine">source code on GitHub</a></li>
      </ul>
    </>
  )
}
