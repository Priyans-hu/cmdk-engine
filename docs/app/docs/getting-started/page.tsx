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

      <h2>5. Style the Palette</h2>
      <p>
        <code>CommandPalette</code> ships no styles. Style cmdk&apos;s <code>[cmdk-*]</code> parts and the
        adapter&apos;s <code>data-cmdk-engine-*</code> attributes from any global stylesheet:
      </p>
      <CodeBlock
        language="css"
        filename="palette.css"
        code={`[cmdk-overlay] { position: fixed; inset: 0; z-index: 50; background: rgb(0 0 0 / 0.4); }
[cmdk-dialog] {
  position: fixed; top: 15vh; left: 50%; z-index: 50; transform: translateX(-50%);
  width: min(560px, calc(100vw - 32px));
}
[cmdk-root] {
  overflow: hidden; border: 1px solid #e5e7eb; border-radius: 12px;
  background: #fff; color: #111827; font: 14px/1.4 system-ui, sans-serif;
  box-shadow: 0 16px 48px rgb(0 0 0 / 0.2);
}
[cmdk-input] {
  box-sizing: border-box; width: 100%; padding: 14px 16px; border: 0;
  border-bottom: 1px solid #e5e7eb; font: inherit; font-size: 16px; outline: none;
}
[cmdk-list] { max-height: 320px; overflow-y: auto; padding: 8px; }
[cmdk-group-heading] { padding: 8px 8px 4px; font-size: 12px; color: #6b7280; }
[cmdk-item] { padding: 8px; border-radius: 8px; cursor: pointer; }
[cmdk-item][data-selected='true'] { background: #f3f4f6; }
[cmdk-item][data-disabled='true'] { opacity: 0.5; cursor: default; }
[data-cmdk-engine-item] { display: flex; align-items: center; gap: 8px; }
[data-cmdk-engine-item-content] { display: flex; flex: 1; flex-direction: column; }
[data-cmdk-engine-item-description] { font-size: 12px; color: #6b7280; }
[data-cmdk-engine-item-shortcut] kbd {
  margin-left: 4px; padding: 0 6px; border: 1px solid #e5e7eb; border-radius: 4px;
  font: inherit; font-size: 12px;
}
[data-cmdk-engine-empty],
[data-cmdk-engine-loading] { padding: 16px; text-align: center; color: #6b7280; }`}
      />
      <p>
        With Tailwind (v3 or v4), <code>@apply</code> the same utilities to the same selectors in your
        main CSS file:
      </p>
      <CodeBlock
        language="css"
        code={`[cmdk-overlay] { @apply fixed inset-0 z-50 bg-black/40; }
[cmdk-dialog] { @apply fixed left-1/2 top-[15vh] z-50 w-[min(560px,calc(100vw-32px))] -translate-x-1/2; }
[cmdk-root] { @apply overflow-hidden rounded-xl border border-gray-200 bg-white text-sm text-gray-900 shadow-2xl; }
[cmdk-input] { @apply w-full border-0 border-b border-gray-200 px-4 py-3.5 text-base outline-none; }
[cmdk-list] { @apply max-h-80 overflow-y-auto p-2; }
[cmdk-group-heading] { @apply px-2 pb-1 pt-2 text-xs text-gray-500; }
[cmdk-item] { @apply cursor-pointer rounded-lg p-2 data-[selected=true]:bg-gray-100 data-[disabled=true]:opacity-50; }
[data-cmdk-engine-item] { @apply flex items-center gap-2; }
[data-cmdk-engine-item-content] { @apply flex flex-1 flex-col; }
[data-cmdk-engine-item-description] { @apply text-xs text-gray-500; }
[data-cmdk-engine-item-shortcut] kbd { @apply ml-1 rounded border border-gray-200 px-1.5 font-sans text-xs; }
[data-cmdk-engine-empty], [data-cmdk-engine-loading] { @apply p-4 text-center text-gray-500; }`}
      />
      <p>
        To style per instance instead, <code>CommandPalette</code> passes <code>className</code>,{' '}
        <code>overlayClassName</code>, <code>contentClassName</code>, <code>inputClassName</code>,{' '}
        <code>listClassName</code>, <code>groupClassName</code>, <code>itemClassName</code> and{' '}
        <code>emptyClassName</code> to those parts. cmdk documents its parts in{' '}
        <a href="https://github.com/dip/cmdk#parts-and-styling">Parts and styling</a> and has{' '}
        <a href="https://github.com/dip/cmdk/tree/main/website/styles/cmdk">drop-in stylesheets</a>.
      </p>

      <h2>Next Steps</h2>
      <ul>
        <li>Read the <a href="/docs/api">API Reference</a> for all exports</li>
        <li>See <a href="/docs/examples">Examples</a> for common patterns</li>
        <li>Explore the <a href="https://github.com/Priyans-hu/cmdk-engine">source code on GitHub</a></li>
      </ul>
    </>
  )
}
