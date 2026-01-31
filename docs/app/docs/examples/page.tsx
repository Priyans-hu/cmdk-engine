export const metadata = { title: 'Examples' }

export default function Examples() {
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '2rem', lineHeight: 1.7 }}>
      <h1>Examples</h1>

      <h2>React Router Integration</h2>
      <pre style={{ background: '#f6f8fa', padding: '1rem', borderRadius: '6px', overflow: 'auto' }}>
{`import { CommandEngineProvider, useCommandRegister } from 'cmdk-engine/react'
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
const commands = scanRoutes(routes)

function App() {
  return (
    <CommandEngineProvider>
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
      </pre>

      <h2>With RBAC</h2>
      <pre style={{ background: '#f6f8fa', padding: '1rem', borderRadius: '6px', overflow: 'auto' }}>
{`import { createSimpleAccessProvider } from 'cmdk-engine'
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
      </pre>

      <h2>Custom UI (without cmdk)</h2>
      <pre style={{ background: '#f6f8fa', padding: '1rem', borderRadius: '6px', overflow: 'auto' }}>
{`import { useCommandPalette } from 'cmdk-engine/react'

function CustomPalette() {
  const { search, setSearch, results, isOpen, toggle, recordUsage } =
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
        <ul>
          {results.map(({ item, score }) => (
            <li
              key={item.id}
              onClick={() => {
                recordUsage(item.id)
                item.action?.()
                toggle()
              }}
            >
              <span>{item.label}</span>
              {item.description && (
                <span className="desc">{item.description}</span>
              )}
            </li>
          ))}
        </ul>
        {results.length === 0 && (
          <p className="empty">No results</p>
        )}
      </div>
    </div>
  )
}`}
      </pre>

      <h2>CLI: Pre-commit Hook</h2>
      <pre style={{ background: '#f6f8fa', padding: '1rem', borderRadius: '6px', overflow: 'auto' }}>
{`# Install husky
npx husky install

# Add pre-commit hook
npx husky add .husky/pre-commit "npx cmdk-engine scan && git add src/generated/command-routes.json"

# Or with lint-staged in package.json:
{
  "lint-staged": {
    "src/routes/**/*.{ts,tsx}": [
      "npx cmdk-engine scan",
      "git add src/generated/command-routes.json"
    ]
  }
}`}
      </pre>
    </div>
  )
}
