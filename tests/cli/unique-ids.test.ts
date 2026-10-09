import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { scanCommand, uniqueIds } from '../../src/cli/commands/scan'
import { pathToId } from '../../src/core/utils'
import type { SitemapRoute } from '../../src/core/types'

const TEMP_DIR = resolve('.test-temp-unique-ids')

const route = (path: string): SitemapRoute => ({
  id: pathToId(path),
  path,
  label: path,
  keywords: [],
})

let warn: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  mkdirSync(TEMP_DIR, { recursive: true })
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  warn.mockRestore()
  rmSync(TEMP_DIR, { recursive: true, force: true })
})

describe('uniqueIds', () => {
  it('keeps the id on the last route in path order and loops past ids in use', () => {
    const ids = uniqueIds([route('/ab-2'), route('/ab'), route('/a_b')]).map((r) => [r.path, r.id])

    expect(ids).toEqual([
      ['/a_b', 'ab-3'],
      ['/ab', 'ab'],
      ['/ab-2', 'ab-2'],
    ])
    expect(warn).toHaveBeenCalledWith('Warning: /a_b and /ab share the id "ab"; /a_b gets "ab-3".')
  })

  it('leaves routes without a shared id alone', () => {
    const routes = [route('/billing'), route('/settings/team')]

    expect(uniqueIds(routes)).toEqual(routes)
    expect(warn).not.toHaveBeenCalled()
  })
})

describe('scan: every route keeps a unique id (QA-5)', () => {
  it('writes unique ids for routes whose ids collide, non-ASCII paths included', async () => {
    const app = join(TEMP_DIR, 'app')
    for (const dir of ['', '設定', '配置', '설정', 'a_b', 'ab']) {
      mkdirSync(join(app, dir), { recursive: true })
      writeFileSync(join(app, dir, 'page.tsx'), 'export default function Page() {}')
    }
    const out = join(TEMP_DIR, 'out.json')

    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    try {
      await scanCommand.parseAsync(
        ['--framework', 'nextjs-app', '--routes-dir', app, '--output', out],
        { from: 'user' },
      )
    } finally {
      log.mockRestore()
    }

    const routes: SitemapRoute[] = JSON.parse(readFileSync(out, 'utf-8')).routes
    expect(routes.map((r) => r.path)).toEqual(['/', '/a_b', '/ab', '/設定', '/配置', '/설정'])
    expect(new Set(routes.map((r) => r.id)).size).toBe(routes.length)
  })
})
