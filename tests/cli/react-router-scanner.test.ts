import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { scanReactRouterFiles } from '../../src/cli/scanners/react-router'
import type { ScanOptions } from '../../src/cli/scanners/shared'

const TEMP_DIR = resolve('.test-temp-rr-scanner')

function scan(source: string, file = 'routes.tsx', options?: ScanOptions) {
  writeFileSync(join(TEMP_DIR, file), source)
  return scanReactRouterFiles(TEMP_DIR, options)
}

const byPath = (routes: ReturnType<typeof scan>) =>
  Object.fromEntries(
    routes.map(({ path, label, keywords, group }) => [path, { label, keywords, group }]),
  )

beforeEach(() => {
  mkdirSync(TEMP_DIR, { recursive: true })
})

afterEach(() => {
  rmSync(TEMP_DIR, { recursive: true, force: true })
})

describe('React Router CLI scan: metadata belongs to its own route', () => {
  it('does not copy handle.command onto neighbouring routes', () => {
    const routes = scan(`
      export const routes = [
        { path: '/alpha', element: <Alpha /> },
        { path: '/beta', element: <Beta /> },
        {
          path: '/gamma',
          element: <Gamma />,
          handle: { command: { label: 'Gamma Label', keywords: ['gk1', 'gk2'], group: 'G' } },
        },
        { path: '/delta', element: <Delta /> },
      ]
    `)

    expect(byPath(routes)).toEqual({
      '/alpha': { label: 'Alpha', keywords: ['alpha'], group: undefined },
      '/beta': { label: 'Beta', keywords: ['beta'], group: undefined },
      '/gamma': { label: 'Gamma Label', keywords: ['gamma', 'gk1', 'gk2'], group: 'G' },
      '/delta': { label: 'Delta', keywords: ['delta'], group: undefined },
    })
  })

  it('reads a handle declared before the path, and never a child route handle', () => {
    const routes = scan(`
      export const routes = [
        { handle: { command: { label: 'Reports Home' } }, path: '/reports' },
        {
          path: '/parent',
          children: [{ path: '/parent/child', handle: { command: { label: 'Child' } } }],
        },
      ]
    `)

    expect(byPath(routes)['/reports'].label).toBe('Reports Home')
    expect(byPath(routes)['/parent'].label).toBe('Parent')
    expect(byPath(routes)['/parent/child'].label).toBe('Child')
  })

  it('reads handle={{ command }} on <Route> elements', () => {
    const routes = scan(`
      <Route path="/billing" handle={{ command: { label: 'Billing Home', keywords: ['money'] } }} />
    `)

    expect(byPath(routes)['/billing']).toEqual({
      label: 'Billing Home',
      keywords: ['billing', 'money'],
      group: undefined,
    })
  })
})

describe('React Router CLI scan: no lost routes', () => {
  it('keeps the routes after a /* path when a block comment follows', () => {
    const routes = scan(`
      export const routes = [
        { path: '/docs/*', element: <Docs /> },
        { path: '/alpha', element: <Alpha /> },
        { path: '/beta', element: <Beta /> },
      ]
      /** A JSDoc block later in the file */
      export function helper() {}
    `)

    expect(routes.map((r) => r.path)).toEqual(expect.arrayContaining(['/alpha', '/beta']))
  })

  it('reads <Route> attributes in any order', () => {
    const routes = scan(`
      export function App() {
        return (
          <Routes>
            <Route element={<Layout />} path="/x" />
            <Route path={'/y'} element={<Y />} />
          </Routes>
        )
      }
    `)

    expect(routes.map((r) => r.path)).toEqual(['/x', '/y'])
  })

  it('is not confused by URLs, comment-like strings, regexes, JSX text or generics', () => {
    const routes = scan(`
      const url = 'https://example.com/x' // a comment with 'quotes'
      const notAComment = "/* not a comment */"
      const quote = /['"]/g
      const half = total / 2 / 3
      export function Page() {
        const [value] = useState<string>('')
        return <p>Don't panic, it's fine // not a comment {value}</p>
      }
      export const routes = [
        { path: '/one', element: <p>Don't</p> },
        { path: '/two', element: <span>it's {\`template \${'x'}\`}</span> },
        { path: '/three' as const },
        { path: '/four' } satisfies RouteObject,
      ]
    `)

    expect(routes.map((r) => r.path)).toEqual(['/one', '/two', '/three', '/four'])
  })

  it('reads .ts files without JSX, where <T> is a type', () => {
    const routes = scan(
      `const element = <Element>value
       export const routes: Array<RouteObject> = [{ path: '/ts' }]`,
      'routes.ts',
    )

    expect(routes.map((r) => r.path)).toEqual(['/ts'])
  })

  it('warns, naming the file and line, and keeps the routes before an unterminated string', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const routes = scan(`export const routes = [{ path: '/kept' }]\nconst broken = 'oops\n`)

      expect(routes.map((r) => r.path)).toEqual(['/kept'])
      expect(warn).toHaveBeenCalledWith(expect.stringMatching(/routes\.tsx:2: unterminated string/))
    } finally {
      warn.mockRestore()
    }
  })
})

describe('React Router CLI scan: quoted values', () => {
  it('keeps quotes and commas inside labels and keywords', () => {
    const routes = scan(`
      export const routes = [
        {
          path: '/panic',
          handle: { command: { label: "Don't Panic", keywords: ['a, b', "it's", \`tpl\`] } },
        },
      ]
    `)

    expect(byPath(routes)['/panic']).toEqual({
      label: "Don't Panic",
      keywords: ['panic', 'a, b', "it's", 'tpl'],
      group: undefined,
    })
  })
})

describe('React Router CLI scan: dynamic routes, like the runtime scanner', () => {
  const routes = `
    export const routes = [
      { path: '/users' },
      { path: '/users/:id' },
      { path: '/users/:id/edit', handle: { command: { label: 'Edit user' } } },
      { path: '/:org/settings' },
      { path: '/:org/users/:id' },
      { path: '/files/:name', handle: { command: undefined } },
      { path: '/docs/*', handle: { command: { label: 'Docs' } } },
    ]
    export const team = <Route path="/teams/:team" handle={{ command: { label: 'Team' } }} />
  `
  const paths = (options?: ScanOptions) => scan(routes, 'routes.tsx', options).map((r) => r.path)

  it('skips :param routes unless they declare their own handle.command', () => {
    expect(paths()).toEqual(['/users', '/users/:id/edit', '/teams/:team'])
  })

  it('keeps :param routes whose params includeDynamic names, or all of them with true', () => {
    expect(paths({ includeDynamic: ['org'] })).toEqual([
      '/users',
      '/users/:id/edit',
      '/:org/settings',
      '/teams/:team',
    ])
    expect(paths({ includeDynamic: true })).toEqual([
      '/users',
      '/users/:id',
      '/users/:id/edit',
      '/:org/settings',
      '/:org/users/:id',
      '/files/:name',
      '/teams/:team',
    ])
  })

  it('never keeps catch-all routes, even with handle.command or includeDynamic', () => {
    expect(paths({ includeDynamic: true })).not.toContain('/docs/*')
  })
})

describe('React Router CLI scan: relative child paths', () => {
  it('joins children paths to their parent route, through pathless layouts', () => {
    const routes = scan(`
      export const router = createBrowserRouter([
        {
          path: '/',
          element: <Root />,
          children: [
            { index: true, element: <Home /> },
            { path: 'dashboard', element: <Dashboard /> },
            { path: 'billing', children: [{ path: 'overview' }, { path: '/absolute' }] },
            { element: <Layout />, children: [{ path: 'settings' }] },
            { path: '/teams/', children: [{ path: 'members' }] },
          ],
        },
      ])
    `)

    expect(routes.map((r) => r.path)).toEqual([
      '/',
      '/dashboard',
      '/billing',
      '/billing/overview',
      '/absolute',
      '/settings',
      '/teams/',
      '/teams/members',
    ])
    expect(byPath(routes)['/billing/overview']).toMatchObject({
      label: 'Overview',
      group: 'Billing',
    })
  })

  it('joins nested <Route> paths to their parent element', () => {
    const routes = scan(`
      const router = createBrowserRouter(
        createRoutesFromElements(
          <Route path="/" element={<Root />}>
            <Route index element={<Home />} />
            <Route path="reports" element={<Reports />}>
              <Route path="weekly" element={<Weekly />} />
            </Route>
            <Route element={<Layout />}>
              <Route path="profile" element={<Profile />} />
            </Route>
          </Route>,
        ),
      )
    `)

    expect(routes.map((r) => r.path)).toEqual(['/', '/reports', '/reports/weekly', '/profile'])
  })

  it('skips relative paths whose parent is not in the same route tree', () => {
    const routes = scan(`
      const orphans = [{ path: 'orphan' }]
      export const routes = [{ path: '/admin', children: adminRoutes }]
      export function Admin() {
        return (
          <Routes>
            <Route path="descendant" element={<Page />} />
          </Routes>
        )
      }
    `)

    expect(routes.map((r) => r.path)).toEqual(['/admin'])
  })

  it('applies the dynamic-route rule to the joined path', () => {
    const source = `
      export const routes = [
        {
          path: '/:org',
          children: [
            { path: 'settings' },
            { path: 'users/:id', handle: { command: { label: 'User' } } },
          ],
        },
      ]
    `

    expect(scan(source).map((r) => r.path)).toEqual(['/:org/users/:id'])
    expect(scan(source, 'routes.tsx', { includeDynamic: ['org'] }).map((r) => r.path)).toEqual([
      '/:org',
      '/:org/settings',
      '/:org/users/:id',
    ])
  })
})
