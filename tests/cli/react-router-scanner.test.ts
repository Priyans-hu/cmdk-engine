import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { scanReactRouterFiles } from '../../src/cli/scanners/react-router'

const TEMP_DIR = resolve('.test-temp-rr-scanner')

function scan(source: string, file = 'routes.tsx') {
  writeFileSync(join(TEMP_DIR, file), source)
  return scanReactRouterFiles(TEMP_DIR)
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

describe('React Router CLI scan: metadata belongs to its own route (QA-6)', () => {
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

describe('React Router CLI scan: no lost routes (QA-7)', () => {
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

describe('React Router CLI scan: quoted values (QA-9)', () => {
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
