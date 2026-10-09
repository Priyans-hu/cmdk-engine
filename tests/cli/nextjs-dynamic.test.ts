import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { scanNextJsAppDir } from '../../src/cli/scanners/nextjs-app'
import { scanNextJsPagesDir } from '../../src/cli/scanners/nextjs-pages'
import { scanCommand } from '../../src/cli/commands/scan'

const TEMP_DIR = resolve('.test-temp-nextjs-dynamic')

/** Create app/<dirs>/page.tsx under TEMP_DIR */
function appPage(dirs: string): void {
  const dir = join(TEMP_DIR, ...dirs.split('/').filter(Boolean))
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'page.tsx'), 'export default function Page() {}')
}

/** Create a pages-router file under TEMP_DIR */
function pagesFile(path: string): void {
  const file = join(TEMP_DIR, ...path.split('/'))
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, 'export default function Page() {}')
}

const paths = (routes: { path: string }[]) => routes.map((r) => r.path).sort()

beforeEach(() => {
  mkdirSync(TEMP_DIR, { recursive: true })
})

afterEach(() => {
  rmSync(TEMP_DIR, { recursive: true, force: true })
})

describe('Next.js App Router scan: includeDynamic', () => {
  beforeEach(() => {
    for (const dir of [
      '[locale]',
      '[locale]/billing',
      '[locale]/settings/team',
      '[locale]/users/[id]',
    ]) {
      appPage(dir)
    }
  })

  it('skips every route under a dynamic segment by default', () => {
    expect(scanNextJsAppDir(TEMP_DIR)).toEqual([])
  })

  it('keeps routes whose dynamic segments are all named, with placeholder ids', () => {
    const routes = scanNextJsAppDir(TEMP_DIR, { includeDynamic: ['locale'] })

    expect(routes.map(({ path, id, label, group }) => ({ path, id, label, group }))).toEqual([
      { path: '/:locale', id: 'locale', label: 'Home', group: undefined },
      { path: '/:locale/billing', id: 'locale--billing', label: 'Billing', group: undefined },
      {
        path: '/:locale/settings/team',
        id: 'locale--settings--team',
        label: 'Team',
        group: 'Settings',
      },
    ])
  })

  it('keeps every :param route with includeDynamic: true', () => {
    expect(paths(scanNextJsAppDir(TEMP_DIR, { includeDynamic: true }))).toEqual([
      '/:locale',
      '/:locale/billing',
      '/:locale/settings/team',
      '/:locale/users/:id',
    ])
  })

  it('never keeps catch-all routes, even when named', () => {
    appPage('[locale]/docs/[...slug]')

    expect(paths(scanNextJsAppDir(TEMP_DIR, { includeDynamic: ['locale', 'slug'] }))).not.toContain(
      '/:locale/docs/*slug',
    )
    expect(
      scanNextJsAppDir(TEMP_DIR, { includeDynamic: true }).some((r) => r.path.includes('*')),
    ).toBe(false)
  })
})

describe('Next.js App Router scan: special folders', () => {
  it('emits the URL of an optional catch-all, [[...slug]], itself', () => {
    appPage('shop/[[...slug]]')

    expect(paths(scanNextJsAppDir(TEMP_DIR))).toEqual(['/shop'])
  })

  it('skips intercepting routes instead of emitting their parent', () => {
    appPage('feed/(..)settings')
    appPage('@modal/(.)photo')
    appPage('settings')

    expect(paths(scanNextJsAppDir(TEMP_DIR))).toEqual(['/settings'])
  })
})

describe('Next.js Pages Router scan', () => {
  it('keeps [locale] routes with includeDynamic and emits optional catch-all roots', () => {
    pagesFile('[locale]/billing.tsx')
    pagesFile('[locale]/users/[id].tsx')
    pagesFile('shop/[[...slug]].tsx')
    pagesFile('docs/[...slug].tsx')

    expect(paths(scanNextJsPagesDir(TEMP_DIR))).toEqual(['/shop'])
    expect(paths(scanNextJsPagesDir(TEMP_DIR, { includeDynamic: ['locale'] }))).toEqual([
      '/:locale/billing',
      '/shop',
    ])
    expect(paths(scanNextJsPagesDir(TEMP_DIR, { includeDynamic: true }))).toEqual([
      '/:locale/billing',
      '/:locale/users/:id',
      '/shop',
    ])
  })
})

describe('scan command: --include-dynamic', () => {
  async function scan(config: object, args: string[]): Promise<string[]> {
    const appDir = join(TEMP_DIR, 'app')
    for (const dir of ['app/[locale]/billing', 'app/[org]/settings', 'app/about']) appPage(dir)
    const configPath = join(TEMP_DIR, 'cmdk-engine.config.json')
    writeFileSync(
      configPath,
      JSON.stringify({ framework: 'nextjs-app', routesDir: appDir, ...config }),
    )
    const out = join(TEMP_DIR, 'out.json')

    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    try {
      await scanCommand.parseAsync(['-c', configPath, '-o', out, ...args], { from: 'user' })
    } finally {
      log.mockRestore()
    }
    return paths(JSON.parse(readFileSync(out, 'utf-8')).routes)
  }

  it('reads includeDynamic from the config file', async () => {
    expect(await scan({ includeDynamic: ['locale'] }, [])).toEqual(['/:locale/billing', '/about'])
  })

  it('lets the flag override the config, with names or comma lists', async () => {
    expect(await scan({ includeDynamic: false }, ['--include-dynamic', 'locale'])).toEqual([
      '/:locale/billing',
      '/about',
    ])
    expect(await scan({}, ['--include-dynamic', 'locale, org'])).toEqual([
      '/:locale/billing',
      '/:org/settings',
      '/about',
    ])
  })

  it('keeps every :param route when the flag has no names', async () => {
    expect(await scan({ includeDynamic: ['locale'] }, ['--include-dynamic'])).toEqual([
      '/:locale/billing',
      '/:org/settings',
      '/about',
    ])
  })
})
