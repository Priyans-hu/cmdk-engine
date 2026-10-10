// @vitest-environment node
// Runs the BUILT CLI (dist/cli/index.cjs) with Node, the way `npx cmdk-engine` does.
// vitest's own module loader cannot stand in here: it resolves import() its own way.
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const CLI = resolve(__dirname, '../dist/cli/index.cjs')

// A space and a '#' in the path: a raw path passed to import() is read as a URL,
// so '#' starts a fragment (the same bug as a Windows C:\ path)
let dir: string

function cli(...args: string[]): string {
  return execFileSync(process.execPath, [CLI, ...args], { cwd: dir, encoding: 'utf-8' })
}

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'cmdk cli #'))
  mkdirSync(join(dir, 'src', 'routes'), { recursive: true })
  writeFileSync(
    join(dir, 'src', 'routes', 'routes.tsx'),
    `export const routes = [{ path: '/billing' }, { path: '/admin' }]`,
  )
  writeFileSync(
    join(dir, 'cmdk-engine.config.mjs'),
    `export default { framework: 'react-router', routesDir: 'src/routes', exclude: ['/admin'] }`,
  )
})

afterAll(() => {
  rmSync(dir, { recursive: true, force: true })
})

describe('built CLI: a .mjs config in a directory with a space and a #', () => {
  it('validates it', () => {
    expect(cli('validate', '-c', join(dir, 'cmdk-engine.config.mjs'))).toContain('Config is valid.')
  })

  it('scans with it', () => {
    cli('scan', '-c', 'cmdk-engine.config.mjs', '-o', 'out.json')
    const sitemap = JSON.parse(readFileSync(join(dir, 'out.json'), 'utf-8'))

    expect(sitemap.routes.map((route: { path: string }) => route.path)).toEqual(['/billing'])
  })
})
