export const metadata = { title: 'Getting Started' }

export default function GettingStarted() {
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '2rem', lineHeight: 1.7 }}>
      <h1>Getting Started</h1>

      <h2>Installation</h2>
      <pre style={{ background: '#f6f8fa', padding: '1rem', borderRadius: '6px', overflow: 'auto' }}>
        {`npm install cmdk-engine cmdk react react-dom`}
      </pre>

      <h2>1. Add the Provider</h2>
      <p>
        Wrap your app with <code>CommandEngineProvider</code>. This initializes the command registry,
        search engine, and frecency tracker.
      </p>
      <pre style={{ background: '#f6f8fa', padding: '1rem', borderRadius: '6px', overflow: 'auto' }}>
{`import { CommandEngineProvider } from 'cmdk-engine/react'

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
      </pre>

      <h2>2. Register Commands</h2>
      <p>
        Use <code>useCommandRegister</code> to register commands from any component.
        Commands are automatically cleaned up when the component unmounts.
      </p>
      <pre style={{ background: '#f6f8fa', padding: '1rem', borderRadius: '6px', overflow: 'auto' }}>
{`import { useCommandRegister } from 'cmdk-engine/react'

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
      </pre>

      <h2>3. Add the Command Palette</h2>
      <p>Use the pre-wired cmdk adapter or build your own UI with hooks.</p>
      <pre style={{ background: '#f6f8fa', padding: '1rem', borderRadius: '6px', overflow: 'auto' }}>
{`import { CommandPalette } from 'cmdk-engine/adapters/cmdk'

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
      </pre>

      <h2>4. Add Keyboard Shortcut</h2>
      <pre style={{ background: '#f6f8fa', padding: '1rem', borderRadius: '6px', overflow: 'auto' }}>
{`import { useCommandPaletteShortcut } from 'cmdk-engine/adapters/cmdk'

function App() {
  useCommandPaletteShortcut('k') // Cmd+K / Ctrl+K
  return <YourApp />
}`}
      </pre>

      <h2>Next Steps</h2>
      <ul>
        <li><a href="/cmdk-engine/docs/api">API Reference</a></li>
        <li><a href="/cmdk-engine/docs/examples">Examples</a></li>
        <li><a href="https://github.com/Priyans-hu/cmdk-engine">GitHub Repository</a></li>
      </ul>
    </div>
  )
}
