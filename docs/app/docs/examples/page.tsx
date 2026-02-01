import { CodeBlock } from '@/components/code-block'

export const metadata = { title: 'Examples' }

export default function Examples() {
  return (
    <>
      <h1>Examples</h1>
      <p>Common patterns and integration examples for cmdk-engine.</p>

      <h2>React Router Integration</h2>
      <p>Auto-discover routes from your React Router config and register them as commands.</p>
      <CodeBlock
        language="tsx"
        filename="App.tsx"
        code={`import { CommandEngineProvider, useCommandRegister } from 'cmdk-engine/react'
import { CommandPalette } from 'cmdk-engine/adapters/cmdk'
import { scanRoutes } from 'cmdk-engine/adapters/react-router'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'

const routes = [
  {
    path: '/dashboard',
    element: <Dashboard />,
    handle: {
      command: { label: 'Dashboard', group: 'Navigation' }
    }
  },
  {
    path: '/billing',
    element: <Billing />,
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

function App() {
  return (
    <CommandEngineProvider config={{
      onSelect: (item) => {
        if (item.href) navigate(item.href)
      },
      frecency: { showRecent: true },
    }}>
      <RegisterRoutes />
      <CommandPalette dialog />
      <RouterProvider router={router} />
    </CommandEngineProvider>
  )
}

function RegisterRoutes() {
  useCommandRegister(commands)
  return null
}`}
      />

      <h2>With RBAC</h2>
      <p>Filter commands based on user permissions. Commands with restricted permissions are automatically hidden.</p>
      <CodeBlock
        language="tsx"
        code={`import { createSimpleAccessProvider } from 'cmdk-engine'
import { CommandEngineProvider } from 'cmdk-engine/react'

// User permissions from your auth system
const userPermissions = ['billing.read', 'settings.read']

function App() {
  return (
    <CommandEngineProvider config={{
      accessControl: createSimpleAccessProvider(userPermissions),
      accessCheckMode: 'any',
    }}>
      <YourApp />
    </CommandEngineProvider>
  )
}

// Register a command that requires admin permission
useCommandRegister([{
  id: 'admin-panel',
  label: 'Admin Panel',
  permissions: ['admin.access'], // hidden from non-admin users
  href: '/admin',
}])`}
      />

      <h2>Custom UI (without cmdk)</h2>
      <p>Build a fully custom command palette UI using only the headless hooks. Use <code>groupedResults</code> for pre-grouped items and <code>select()</code> as a one-call handler.</p>
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
      <p>Auto-scan routes on every commit to keep your command sitemap up to date.</p>
      <CodeBlock
        language="bash"
        code={`# Install husky
npx husky install

# Add pre-commit hook
npx husky add .husky/pre-commit "npx cmdk-engine scan && git add src/generated/command-routes.json"`}
      />
      <p>Or with lint-staged in <code>package.json</code>:</p>
      <CodeBlock
        language="json"
        filename="package.json"
        code={`{
  "lint-staged": {
    "src/routes/**/*.{ts,tsx}": [
      "npx cmdk-engine scan",
      "git add src/generated/command-routes.json"
    ]
  }
}`}
      />
    </>
  )
}
