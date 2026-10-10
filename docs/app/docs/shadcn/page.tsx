import { CodeBlock } from '@/components/code-block'
import { SITE } from '@/lib/constants'

export const metadata = { title: 'shadcn/ui' }

const REGISTRY = 'https://priyans-hu.github.io/cmdk-engine/r'
const EXAMPLE = `${SITE.github}/tree/main/examples/shadcn`
const STACKBLITZ = 'https://stackblitz.com/github/Priyans-hu/cmdk-engine/tree/main/examples/shadcn'

export default function Shadcn() {
  return (
    <>
      <h1>shadcn/ui</h1>
      <p>
        A shadcn registry item adds a Cmd+K command palette in your shadcn theme. It renders
        cmdk-engine&apos;s cmdk adapter with your theme&apos;s tokens (popover, accent, muted), so
        it follows light and dark mode, and the file is yours to edit like any shadcn component. It
        needs cmdk-engine 0.6.0 or later, which the install adds.
      </p>

      <h2>Install</h2>
      <CodeBlock language="bash" code={`npx shadcn@latest add ${REGISTRY}/command-palette.json`} />
      <p>
        This writes <code>components/command-palette.tsx</code> and installs{' '}
        <code>cmdk-engine</code> and <code>cmdk</code>. To render it with Base UI instead of cmdk,
        add the Base UI item:
      </p>
      <CodeBlock
        language="bash"
        code={`npx shadcn@latest add ${REGISTRY}/command-palette-base-ui.json`}
      />
      <p>
        It writes <code>components/command-palette-base-ui.tsx</code> with the same{' '}
        <code>CommandPalette</code> export and installs <code>@base-ui/react</code>. Give your
        app&apos;s root element <code>isolation: isolate</code> so the dialog stays on top.
      </p>

      <h2>Use it</h2>
      <p>
        Render the palette once inside <code>CommandEngineProvider</code>, and register commands
        anywhere under it:
      </p>
      <CodeBlock
        language="tsx"
        filename="App.tsx"
        code={`import { CommandEngineProvider, useCommandRegister } from 'cmdk-engine/react'
import { CommandPalette } from '@/components/command-palette'

// Define config once, outside the component.
const config = { onNavigate: (href: string) => window.location.assign(href) }

function Commands() {
  useCommandRegister([
    { id: 'home', label: 'Home', href: '/' },
    { id: 'billing', label: 'Billing', href: '/billing', keywords: ['invoices'] },
  ])
  return null
}

export default function App() {
  return (
    <CommandEngineProvider config={config}>
      <Commands />
      <CommandPalette />
      {/* your app */}
    </CommandEngineProvider>
  )
}`}
      />
      <p>
        Cmd+K (Ctrl+K on Windows and Linux) opens it. To open it from a button, call{' '}
        <code>usePaletteState().setIsOpen(true)</code> from <code>cmdk-engine/react</code>. In a
        Next.js App Router project, put the provider and the palette in a{' '}
        <code>&apos;use client&apos;</code> file and pass <code>router.push</code> as{' '}
        <code>onNavigate</code>.
      </p>

      <h2>Example</h2>
      <p>
        The <a href={EXAMPLE}>shadcn example</a> is a Vite app set up with <code>shadcn init</code>{' '}
        that uses both items. Open it in <a href={STACKBLITZ}>StackBlitz</a>.
      </p>
    </>
  )
}
