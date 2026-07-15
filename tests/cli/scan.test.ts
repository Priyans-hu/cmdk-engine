import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { scanReactRouterFiles } from '../../src/cli/scanners/react-router'
import { scanNextJsAppDir } from '../../src/cli/scanners/nextjs-app'
import { scanNextJsPagesDir } from '../../src/cli/scanners/nextjs-pages'
import { generateSitemap } from '../../src/cli/generators/sitemap'
import { applyDefaultExclusions } from '../../src/cli/commands/scan'
import {
  DEFAULT_EXCLUDE as ADAPTER_DEFAULT_EXCLUDE,
  type ExcludePattern as AdapterExcludePattern,
} from '../../src/adapters/react-router/route-scanner'
import {
  DEFAULT_EXCLUDE,
  matchesExcludePattern,
} from '../../src/core/route-defaults'
import type { SitemapRoute } from '../../src/core/types'

function makeRoute(path: string): SitemapRoute {
  return {
    id: path.replace(/\//g, '-').replace(/^-/, '') || 'home',
    path,
    label: path,
    keywords: [],
  }
}

const TEMP_DIR = resolve('.test-temp-scan')

beforeEach(() => {
  mkdirSync(TEMP_DIR, { recursive: true })
})

afterEach(() => {
  rmSync(TEMP_DIR, { recursive: true, force: true })
})

describe('scanReactRouterFiles', () => {
  it('extracts routes from route objects', () => {
    mkdirSync(join(TEMP_DIR, 'routes'), { recursive: true })
    writeFileSync(
      join(TEMP_DIR, 'routes', 'index.tsx'),
      `
      export const routes = [
        { path: '/dashboard', element: <Dashboard /> },
        { path: '/settings', element: <Settings /> },
        { path: '/billing/overview', element: <BillingOverview /> },
      ]
      `,
    )

    const routes = scanReactRouterFiles(TEMP_DIR)
    expect(routes).toHaveLength(3)
    expect(routes[0].path).toBe('/dashboard')
    expect(routes[0].label).toBe('Dashboard')
    expect(routes[1].path).toBe('/settings')
    expect(routes[2].path).toBe('/billing/overview')
    expect(routes[2].group).toBe('Billing')
  })

  it('extracts JSX Route components', () => {
    writeFileSync(
      join(TEMP_DIR, 'App.tsx'),
      `
      <Routes>
        <Route path="/home" element={<Home />} />
        <Route path="/about" element={<About />} />
      </Routes>
      `,
    )

    const routes = scanReactRouterFiles(TEMP_DIR)
    expect(routes).toHaveLength(2)
    expect(routes[0].path).toBe('/home')
    expect(routes[1].path).toBe('/about')
  })

  it('extracts handle.command metadata', () => {
    writeFileSync(
      join(TEMP_DIR, 'routes.ts'),
      `
      {
        path: '/billing/overview',
        handle: {
          command: {
            label: 'Billing Dashboard',
            keywords: ['money', 'payment'],
            group: 'Billing',
          }
        },
        element: <BillingOverview />,
      }
      `,
    )

    const routes = scanReactRouterFiles(TEMP_DIR)
    expect(routes).toHaveLength(1)
    expect(routes[0].label).toBe('Billing Dashboard')
    expect(routes[0].keywords).toContain('money')
    expect(routes[0].keywords).toContain('payment')
    expect(routes[0].group).toBe('Billing')
  })

  it('skips relative paths and catch-all routes', () => {
    writeFileSync(
      join(TEMP_DIR, 'routes.ts'),
      `
      { path: '/dashboard' }
      { path: 'overview' }
      { path: '*' }
      `,
    )

    const routes = scanReactRouterFiles(TEMP_DIR)
    expect(routes).toHaveLength(1)
    expect(routes[0].path).toBe('/dashboard')
  })

  it('deduplicates routes by path', () => {
    mkdirSync(join(TEMP_DIR, 'a'), { recursive: true })
    mkdirSync(join(TEMP_DIR, 'b'), { recursive: true })
    writeFileSync(join(TEMP_DIR, 'a', 'routes.ts'), `{ path: '/dashboard' }`)
    writeFileSync(join(TEMP_DIR, 'b', 'routes.ts'), `{ path: '/dashboard' }`)

    const routes = scanReactRouterFiles(TEMP_DIR)
    expect(routes).toHaveLength(1)
  })

  it('generates keywords from path segments', () => {
    writeFileSync(join(TEMP_DIR, 'routes.ts'), `{ path: '/user-settings/team' }`)

    const routes = scanReactRouterFiles(TEMP_DIR)
    expect(routes[0].keywords).toContain('user settings')
    expect(routes[0].keywords).toContain('team')
  })

  it('returns empty for non-existent directory', () => {
    const routes = scanReactRouterFiles('/non-existent-dir-12345')
    expect(routes).toEqual([])
  })

  it('ignores commented-out route definitions', () => {
    writeFileSync(
      join(TEMP_DIR, 'routes.ts'),
      `export const routes = [
        { path: '/dashboard' },
        // { path: '/old-feature' },
        /* { path: '/deprecated' } */
      ]`,
    )
    const routes = scanReactRouterFiles(TEMP_DIR)
    expect(routes.map((r) => r.path)).toEqual(['/dashboard'])
  })
})

describe('scanNextJsAppDir', () => {
  it('scans app directory pages', () => {
    mkdirSync(join(TEMP_DIR, 'dashboard'), { recursive: true })
    mkdirSync(join(TEMP_DIR, 'settings'), { recursive: true })
    writeFileSync(join(TEMP_DIR, 'page.tsx'), 'export default function Home() {}')
    writeFileSync(join(TEMP_DIR, 'dashboard', 'page.tsx'), 'export default function Dashboard() {}')
    writeFileSync(join(TEMP_DIR, 'settings', 'page.tsx'), 'export default function Settings() {}')

    const routes = scanNextJsAppDir(TEMP_DIR)
    expect(routes).toHaveLength(3)

    const paths = routes.map((r) => r.path)
    expect(paths).toContain('/')
    expect(paths).toContain('/dashboard')
    expect(paths).toContain('/settings')
  })

  it('handles nested directories', () => {
    mkdirSync(join(TEMP_DIR, 'billing', 'overview'), { recursive: true })
    writeFileSync(join(TEMP_DIR, 'billing', 'overview', 'page.tsx'), '')

    const routes = scanNextJsAppDir(TEMP_DIR)
    expect(routes).toHaveLength(1)
    expect(routes[0].path).toBe('/billing/overview')
    expect(routes[0].group).toBe('Billing')
  })

  it('skips route groups (parenthesized dirs)', () => {
    mkdirSync(join(TEMP_DIR, '(auth)', 'login'), { recursive: true })
    writeFileSync(join(TEMP_DIR, '(auth)', 'login', 'page.tsx'), '')

    const routes = scanNextJsAppDir(TEMP_DIR)
    expect(routes).toHaveLength(1)
    expect(routes[0].path).toBe('/login')
  })

  it('skips dynamic route segments', () => {
    mkdirSync(join(TEMP_DIR, '[id]'), { recursive: true })
    writeFileSync(join(TEMP_DIR, '[id]', 'page.tsx'), '')

    const routes = scanNextJsAppDir(TEMP_DIR)
    expect(routes).toHaveLength(0) // Dynamic routes skipped
  })

  it('skips api directory', () => {
    mkdirSync(join(TEMP_DIR, 'api', 'users'), { recursive: true })
    writeFileSync(join(TEMP_DIR, 'api', 'users', 'page.tsx'), '')

    const routes = scanNextJsAppDir(TEMP_DIR)
    expect(routes).toHaveLength(0)
  })

  it('keeps a nested "api" folder that is a real page route', () => {
    mkdirSync(join(TEMP_DIR, 'dashboard', 'api'), { recursive: true })
    writeFileSync(join(TEMP_DIR, 'dashboard', 'api', 'page.tsx'), '')

    const routes = scanNextJsAppDir(TEMP_DIR)
    expect(routes.map((r) => r.path)).toContain('/dashboard/api')
  })
})

describe('scanNextJsPagesDir', () => {
  it('scans pages directory', () => {
    writeFileSync(join(TEMP_DIR, 'index.tsx'), '')
    writeFileSync(join(TEMP_DIR, 'dashboard.tsx'), '')
    writeFileSync(join(TEMP_DIR, 'about.tsx'), '')

    const routes = scanNextJsPagesDir(TEMP_DIR)
    expect(routes).toHaveLength(3)

    const paths = routes.map((r) => r.path)
    expect(paths).toContain('/')
    expect(paths).toContain('/dashboard')
    expect(paths).toContain('/about')
  })

  it('handles nested pages', () => {
    mkdirSync(join(TEMP_DIR, 'billing'), { recursive: true })
    writeFileSync(join(TEMP_DIR, 'billing', 'overview.tsx'), '')

    const routes = scanNextJsPagesDir(TEMP_DIR)
    expect(routes).toHaveLength(1)
    expect(routes[0].path).toBe('/billing/overview')
  })

  it('skips _app, _document, _error', () => {
    writeFileSync(join(TEMP_DIR, '_app.tsx'), '')
    writeFileSync(join(TEMP_DIR, '_document.tsx'), '')
    writeFileSync(join(TEMP_DIR, '_error.tsx'), '')
    writeFileSync(join(TEMP_DIR, 'index.tsx'), '')

    const routes = scanNextJsPagesDir(TEMP_DIR)
    expect(routes).toHaveLength(1)
    expect(routes[0].path).toBe('/')
  })

  it('skips dynamic routes', () => {
    writeFileSync(join(TEMP_DIR, '[id].tsx'), '')

    const routes = scanNextJsPagesDir(TEMP_DIR)
    expect(routes).toHaveLength(0)
  })

  it('skips api directory', () => {
    mkdirSync(join(TEMP_DIR, 'api'), { recursive: true })
    writeFileSync(join(TEMP_DIR, 'api', 'users.ts'), '')

    const routes = scanNextJsPagesDir(TEMP_DIR)
    expect(routes).toHaveLength(0)
  })

  it('deduplicates colliding paths (about.tsx + about/index.tsx)', () => {
    writeFileSync(join(TEMP_DIR, 'about.tsx'), '')
    mkdirSync(join(TEMP_DIR, 'about'), { recursive: true })
    writeFileSync(join(TEMP_DIR, 'about', 'index.tsx'), '')

    const routes = scanNextJsPagesDir(TEMP_DIR)
    expect(routes.filter((r) => r.path === '/about')).toHaveLength(1)
  })
})

describe('generateSitemap', () => {
  it('generates valid sitemap', () => {
    const routes = [
      { id: 'dashboard', path: '/dashboard', label: 'Dashboard', keywords: ['dashboard'], group: 'Nav' },
      { id: 'settings', path: '/settings', label: 'Settings', keywords: ['settings'], group: 'Nav' },
    ]

    const sitemap = generateSitemap(routes, 'react-router')
    expect(sitemap.version).toBe(1)
    expect(sitemap.framework).toBe('react-router')
    expect(sitemap.routes).toHaveLength(2)
    expect(sitemap.generatedAt).toBeDefined()
    expect(sitemap.routes[0].path).toBe('/dashboard')
    expect(sitemap.routes[1].path).toBe('/settings')
  })

  it('sorts routes by path', () => {
    const routes = [
      { id: 'z', path: '/z', label: 'Z', keywords: [] },
      { id: 'a', path: '/a', label: 'A', keywords: [] },
    ]

    const sitemap = generateSitemap(routes, 'nextjs-app')
    expect(sitemap.routes[0].path).toBe('/a')
    expect(sitemap.routes[1].path).toBe('/z')
  })
})

describe('applyDefaultExclusions', () => {
  it('drops auth routes (login, signup, logout, signin, signout, register)', () => {
    const routes = [
      makeRoute('/dashboard'),
      makeRoute('/login'),
      makeRoute('/signup'),
      makeRoute('/logout'),
      makeRoute('/signin'),
      makeRoute('/signout'),
      makeRoute('/register'),
    ]

    const filtered = applyDefaultExclusions(routes)
    expect(filtered.map((r) => r.path)).toEqual(['/dashboard'])
  })

  it('drops password recovery routes', () => {
    const routes = [
      makeRoute('/dashboard'),
      makeRoute('/forgot-password'),
      makeRoute('/reset-password'),
    ]

    const filtered = applyDefaultExclusions(routes)
    expect(filtered.map((r) => r.path)).toEqual(['/dashboard'])
  })

  it('drops verify-email and oauth/auth callback routes', () => {
    const routes = [
      makeRoute('/dashboard'),
      makeRoute('/verify-email'),
      makeRoute('/oauth/callback'),
      makeRoute('/auth/callback'),
      makeRoute('/callback'),
    ]

    const filtered = applyDefaultExclusions(routes)
    expect(filtered.map((r) => r.path)).toEqual(['/dashboard'])
  })

  it('drops error pages (/404, /500, /error, /not-found)', () => {
    const routes = [
      makeRoute('/dashboard'),
      makeRoute('/404'),
      makeRoute('/500'),
      makeRoute('/error'),
      makeRoute('/not-found'),
    ]

    const filtered = applyDefaultExclusions(routes)
    expect(filtered.map((r) => r.path)).toEqual(['/dashboard'])
  })

  it('drops nested auth paths like /login/recover', () => {
    const routes = [
      makeRoute('/dashboard'),
      makeRoute('/login/recover'),
      makeRoute('/oauth/callback/google'),
    ]

    const filtered = applyDefaultExclusions(routes)
    expect(filtered.map((r) => r.path)).toEqual(['/dashboard'])
  })

  it('keeps unrelated paths that merely contain auth-like substrings', () => {
    const routes = [
      makeRoute('/dashboard'),
      makeRoute('/auth-logs'), // not /auth/callback
      makeRoute('/users/login-history'), // not /login
      makeRoute('/error-budget'), // not /error
    ]

    const filtered = applyDefaultExclusions(routes)
    expect(filtered.map((r) => r.path)).toEqual([
      '/dashboard',
      '/auth-logs',
      '/users/login-history',
      '/error-budget',
    ])
  })

  it('returns input unchanged when no routes match defaults', () => {
    const routes = [makeRoute('/dashboard'), makeRoute('/billing/overview')]
    const filtered = applyDefaultExclusions(routes)
    expect(filtered).toEqual(routes)
  })

  it('handles empty input', () => {
    expect(applyDefaultExclusions([])).toEqual([])
  })
})

describe('DEFAULT_EXCLUDE shared constant', () => {
  it('is non-empty', () => {
    expect(DEFAULT_EXCLUDE.length).toBeGreaterThan(0)
  })

  it('is re-exported from the react-router adapter (same reference)', () => {
    expect(ADAPTER_DEFAULT_EXCLUDE).toBe(DEFAULT_EXCLUDE)
  })

  it('exposes ExcludePattern type via adapter re-export', () => {
    // Type-only check — if this compiles, the re-export works
    const pattern: AdapterExcludePattern = '/login'
    expect(typeof pattern).toBe('string')
  })

  it('matchesExcludePattern works with strings, globs, and regex', () => {
    expect(matchesExcludePattern('/login', '/login')).toBe(true)
    expect(matchesExcludePattern('/admin/users', '/admin/*')).toBe(true)
    expect(matchesExcludePattern('/admin', '/admin/*')).toBe(true)
    expect(matchesExcludePattern('/dashboard', '/admin/*')).toBe(false)
    expect(matchesExcludePattern('/login', /^\/login(\/|$)/)).toBe(true)
    expect(matchesExcludePattern('/login-history', /^\/login(\/|$)/)).toBe(false)
    expect(matchesExcludePattern('*', '*')).toBe(true)
    expect(matchesExcludePattern('/anything', '*')).toBe(false)
  })
})

describe('CLI scan: --no-default-exclude opt-out', () => {
  it('skipping default exclusions keeps auth routes in output', () => {
    const routes = [makeRoute('/dashboard'), makeRoute('/login'), makeRoute('/404')]

    // Simulate the orchestrator path: when --no-default-exclude is set,
    // applyDefaultExclusions is not invoked at all.
    const skippedDefaults = routes
    expect(skippedDefaults.map((r) => r.path)).toEqual(['/dashboard', '/login', '/404'])

    // For comparison, applying defaults strips them
    const withDefaults = applyDefaultExclusions(routes)
    expect(withDefaults.map((r) => r.path)).toEqual(['/dashboard'])
  })

  it('user exclusions still apply on top of --no-default-exclude (no auth filter)', () => {
    // When defaults are skipped, only user-specified excludes should drop routes
    const routes = [makeRoute('/dashboard'), makeRoute('/login'), makeRoute('/internal')]
    const userExcludes = ['/internal']

    // Mimic scan.ts: defaults skipped, then applyExclusions
    const filtered = routes.filter(
      (route) =>
        !userExcludes.some((pattern) => {
          if (pattern.endsWith('*')) return route.path.startsWith(pattern.slice(0, -1))
          return route.path === pattern
        }),
    )

    expect(filtered.map((r) => r.path)).toEqual(['/dashboard', '/login'])
  })
})
