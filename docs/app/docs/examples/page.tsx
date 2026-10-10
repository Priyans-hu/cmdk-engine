import Link from 'next/link'
import { ApiTable } from '@/components/api-table'
import { CodeBlock } from '@/components/code-block'
import { SITE } from '@/lib/constants'

const EXAMPLES = `${SITE.github}/tree/main/examples`
const STACKBLITZ = 'https://stackblitz.com/github/Priyans-hu/cmdk-engine/tree/main/examples'

export const metadata = { title: 'Examples' }

export default function Examples() {
  return (
    <>
      <h1>Examples</h1>
      <p>Common patterns and integration examples for cmdk-engine.</p>

      <h2>Runnable apps</h2>
      <p>
        The <a href={EXAMPLES}>examples folder</a> has three apps. Each one installs{' '}
        <code>cmdk-engine</code> from npm, so you can copy it out of the repo or open it in
        StackBlitz.
      </p>
      <ApiTable
        head={['Example', 'What it shows', 'Try it']}
        rows={[
          [
            <a key="vite" href={`${EXAMPLES}/vite-react-router`}>
              Vite + React Router
            </a>,
            <>
              Commands from the route tree with <code>scanRoutes</code>, the provider inside the
              router, the CSS from <Link href="/docs/styling">Styling</Link>, and the same palette
              on Base UI with <code>?adapter=base-ui</code>.
            </>,
            <a key="vite-sb" href={`${STACKBLITZ}/vite-react-router?file=src/layout.tsx`}>
              StackBlitz
            </a>,
          ],
          [
            <a key="next" href={`${EXAMPLES}/nextjs-app-router`}>
              Next.js App Router
            </a>,
            <>
              A <code>&apos;use client&apos;</code> provider file under a server layout,{' '}
              <code>router.push</code> as <code>onNavigate</code>, and <code>[locale]</code> pages
              found by <code>cmdk-engine scan --include-dynamic locale</code> and filled in with{' '}
              <code>sitemapToCommands</code>. See the <Link href="/docs/nextjs">Next.js</Link>{' '}
              guide.
            </>,
            <a
              key="next-sb"
              href={`${STACKBLITZ}/nextjs-app-router?file=components/command-menu.tsx`}
            >
              StackBlitz
            </a>,
          ],
          [
            <a key="shadcn" href={`${EXAMPLES}/shadcn`}>
              shadcn/ui
            </a>,
            <>
              Both registry items from the <Link href="/docs/shadcn">shadcn/ui</Link> page, in an
              app set up with <code>shadcn init</code>, in light and dark mode.
            </>,
            <a key="shadcn-sb" href={`${STACKBLITZ}/shadcn?file=src/App.tsx`}>
              StackBlitz
            </a>,
          ],
        ]}
      />

      <h2>React Router Integration</h2>
      <p>Auto-discover routes from your React Router config and register them as commands.</p>
      <CodeBlock
        language="tsx"
        filename="App.tsx"
        code={`import { CommandEngineProvider, useCommandRegister } from 'cmdk-engine/react'
import { CommandPalette, useCommandPaletteShortcut } from 'cmdk-engine/adapters/cmdk'
import { scanRoutes } from 'cmdk-engine/adapters/react-router'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'

const routes = [
  {
    path: '/dashboard',
    element: <h1>Dashboard</h1>,
    handle: {
      command: { label: 'Dashboard', group: 'Navigation' }
    }
  },
  {
    path: '/billing',
    element: <h1>Billing</h1>,
    handle: {
      command: {
        label: 'Billing',
        keywords: ['payment', 'invoice'],
        group: 'Navigation'
      }
    }
  },
]

const router = createBrowserRouter(routes)
// Scan with options — exclude paths, skip dynamic routes by default
const commands = scanRoutes(routes, {
  exclude: ['/admin/*'],  // string, glob, or regex
})

// The provider sits outside RouterProvider, so navigate with the router
// object (useNavigate() only works inside the router).
const config = {
  onNavigate: (href: string) => router.navigate(href),
  frecency: { showRecent: true },
}

function App() {
  return (
    <CommandEngineProvider config={config}>
      <RegisterRoutes />
      <CommandMenu />
      <RouterProvider router={router} />
    </CommandEngineProvider>
  )
}

function RegisterRoutes() {
  useCommandRegister(commands)
  return null
}

function CommandMenu() {
  useCommandPaletteShortcut() // Cmd+K / Ctrl+K
  return <CommandPalette dialog />
}`}
      />
      <p>
        On React Router 8 there is no <code>react-router-dom</code>: import{' '}
        <code>createBrowserRouter</code> from <code>react-router</code> and{' '}
        <code>RouterProvider</code> from <code>react-router/dom</code>.
      </p>

      <h2>With RBAC</h2>
      <p>
        Filter commands based on user permissions. Commands with restricted permissions are
        automatically hidden.
      </p>
      <CodeBlock
        language="tsx"
        code={`import { createSimpleAccessProvider } from 'cmdk-engine'
import { CommandEngineProvider, useCommandRegister } from 'cmdk-engine/react'

// User permissions from your auth system. Build the provider once, outside
// the component (or useMemo it per user): a new object on every render
// rebuilds the engine.
const userPermissions = ['billing.read', 'settings.read']
const config = {
  accessControl: createSimpleAccessProvider(userPermissions),
  accessCheckMode: 'any' as const,
}

export function Providers({ children }: { children: React.ReactNode }) {
  return <CommandEngineProvider config={config}>{children}</CommandEngineProvider>
}

// A command that requires admin permission
export function AdminCommands() {
  useCommandRegister([{
    id: 'admin-panel',
    label: 'Admin Panel',
    permissions: ['admin.access'], // hidden from non-admin users
    href: '/admin',
  }])
  return null
}`}
      />
      <p>
        Hiding a command is a UI concern, not a security boundary. Always enforce permissions on the
        server.
      </p>

      <h2>Custom UI (without cmdk)</h2>
      <p>
        Build a fully custom command palette UI using only the headless hooks. Use{' '}
        <code>groupedResults</code> for pre-grouped items and <code>select()</code> as a one-call
        handler.
      </p>
      <CodeBlock
        language="tsx"
        code={`import { useCommandPalette } from 'cmdk-engine/react'

function CustomPalette() {
  const { search, setSearch, groupedResults, isOpen, toggle, select } =
    useCommandPalette()

  if (!isOpen) return null

  return (
    <div className="palette-overlay" onClick={() => toggle()}>
      <div className="palette-content" onClick={e => e.stopPropagation()}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search..."
          autoFocus
        />
        {groupedResults.map(({ group, items }) => (
          <div key={group.id}>
            <h3>{group.label}</h3>
            <ul>
              {items.map(({ item }) => (
                <li key={item.id} onClick={() => select(item)}>
                  {item.icon && <span>{item.icon}</span>}
                  <span>{item.label}</span>
                  {item.description && (
                    <span className="desc">{item.description}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
        {groupedResults.length === 0 && (
          <p className="empty">No results</p>
        )}
      </div>
    </div>
  )
}`}
      />

      <h2>CLI: Pre-commit Hook</h2>
      <p>
        Auto-scan routes on every commit to keep your command sitemap up to date. With husky 9, run{' '}
        <code>npx husky init</code>, then put the command in <code>.husky/pre-commit</code>:
      </p>
      <CodeBlock
        language="bash"
        filename=".husky/pre-commit"
        code={`npx cmdk-engine scan && git add src/generated/command-routes.json`}
      />
      <p>
        Or with lint-staged. Use a function task: a plain command string would get the staged file
        names appended, and <code>scan</code> takes no file arguments.
      </p>
      <CodeBlock
        language="js"
        filename="lint-staged.config.mjs"
        code={`export default {
  'src/routes/**/*.{ts,tsx}': () => [
    'npx cmdk-engine scan',
    'git add src/generated/command-routes.json',
  ],
}`}
      />

      <h2>Testing</h2>
      <p>
        jsdom lacks two browser APIs that cmdk uses, so tests that render the cmdk adapter need
        stubs. Without them the first render throws <code>ResizeObserver is not defined</code>. The
        Base UI adapter needs no stubs.
      </p>
      <CodeBlock
        language="tsx"
        filename="palette.test.tsx"
        code={`import { beforeAll, expect, test } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { CommandEngineProvider, useCommandRegister } from 'cmdk-engine/react'
import { CommandPalette, useCommandPaletteShortcut } from 'cmdk-engine/adapters/cmdk'

// jsdom lacks these two browser APIs, which cmdk uses
beforeAll(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Element.prototype.scrollIntoView = () => {}
})

function Commands() {
  useCommandRegister([{ id: 'billing', label: 'Billing Overview', href: '/billing' }])
  return null
}

function Palette() {
  useCommandPaletteShortcut()
  return <CommandPalette dialog />
}

test('Cmd+K opens the palette', async () => {
  render(
    <CommandEngineProvider>
      <Commands />
      <Palette />
    </CommandEngineProvider>,
  )
  expect(screen.queryByText('Billing Overview')).toBeNull()
  fireEvent.keyDown(document, { key: 'k', metaKey: true })
  expect(await screen.findByText('Billing Overview')).toBeTruthy()
})`}
      />
      <p>
        Frecency and search history persist to <code>localStorage</code> (<code>cmdk-frecency</code>{' '}
        and <code>cmdk-search-history</code>). Clear them between tests, or pass{' '}
        <code>frecency.storage</code>, so one test&apos;s selections do not rank the next
        test&apos;s results. The Base UI dialog stays in the DOM for a moment after Escape, so use{' '}
        <code>waitFor</code> before asserting that it is gone.
      </p>
    </>
  )
}
