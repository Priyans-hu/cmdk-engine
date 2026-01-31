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
        search engine, and frecency tracker.
      </p>
      <CodeBlock
        language="tsx"
        filename="App.tsx"
        code={`import { CommandEngineProvider } from 'cmdk-engine/react'

function App() {
  return (
    <CommandEngineProvider config={{
      synonyms: {
        billing: ['money', 'payment', 'credits'],
      },
    }}>
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

function BillingPage() {
  useCommandRegister([{
    id: 'billing-overview',
    label: 'Billing Overview',
    href: '/billing/overview',
    keywords: ['balance', 'credits'],
    group: 'Billing',
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
  return (
    <CommandPalette
      dialog
      placeholder="Search commands..."
      onSelect={(item) => {
        if (item.href) navigate(item.href)
      }}
    />
  )
}`}
      />

      <h2>4. Add Keyboard Shortcut</h2>
      <CodeBlock
        language="tsx"
        code={`import { useCommandPaletteShortcut } from 'cmdk-engine/adapters/cmdk'

function App() {
  useCommandPaletteShortcut('k') // Cmd+K / Ctrl+K
  return <YourApp />
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
