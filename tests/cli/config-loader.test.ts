import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { loadConfig } from '../../src/cli/config-loader'
import { scanCommand } from '../../src/cli/commands/scan'
import { validateCommand } from '../../src/cli/commands/validate'
import { legacyParseTypeScriptConfig } from './legacy-config-loader'

const TEMP_DIR = resolve('.test-temp-config-loader')

function write(name: string, content: string): string {
  const path = join(TEMP_DIR, name)
  writeFileSync(path, content)
  return path
}

beforeEach(() => {
  mkdirSync(TEMP_DIR, { recursive: true })
})

afterEach(() => {
  rmSync(TEMP_DIR, { recursive: true, force: true })
})

// TS configs the 0.5.1 parser accepted: the validate tests' fixtures, and more forms
const ACCEPTED: Record<string, string> = {
  'define-config': `import { defineConfig } from 'cmdk-engine'

export default defineConfig({
  framework: 'nextjs-app',
  routesDir: './app',
  output: './src/generated/routes.json',
  exclude: ['/404', '/500'],
})`,
  'export-default': `export default {
  framework: 'react-router',
  routesDir: './src/routes',
}`,
  apostrophes: `import { defineConfig } from 'cmdk-engine'
export default defineConfig({
  overrides: {
    '/help': { keywords: ["don't panic", "user's guide"], group: 'Help' },
  },
})`,
  urls: `export default {
  overrides: {
    '/faq': { keywords: ['faq: frequently asked', 'https://example.com/docs'] },
  },
}`,
  comments: `import { defineConfig } from 'cmdk-engine'
export default defineConfig({
  /* block comment { framework: 'nextjs-app' } */
  framework: 'react-router', // line comment
  exclude: ['/404'],
})`,
  satisfies: `import type { CmdkEngineConfig } from 'cmdk-engine'
export default { framework: 'react-router', exclude: ['/admin/*'] } satisfies CmdkEngineConfig`,
  'const-export': `import { defineConfig } from 'cmdk-engine'
const config = defineConfig({ framework: 'react-router', exclude: ['/admin/*'] })
export default config`,
  'as-const': `export default { framework: 'react-router', output: './out.json' } as const`,
  'module-exports': `const { defineConfig } = require('cmdk-engine')
module.exports = defineConfig({ framework: 'nextjs-pages' })`,
  everything: `export default {
  framework: 'react-router',
  routesDir: "./src/routes",
  output: './src/generated/command-routes.json',
  overrides: {
    '/billing': {
      label: 'Billing "home"',
      keywords: ['money', 'it\\'s', "tab\\there"],
      group: 'Billing',
      priority: 10,
      hidden: false,
    },
    "/x": { permissions: [] },
  },
  exclude: ['/404', '/_*',],
  synonyms: { billing: ['money', 'payment', 'credits'], 'résumé': ['cv'] },
}`,
}

describe('TS config: same result as the 0.5.1 parser for every config it accepted', () => {
  for (const [name, source] of Object.entries(ACCEPTED)) {
    it(`${name}, and its .json, .mjs, .cjs and .js forms`, async () => {
      const file = write(`${name}.ts`, source)
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const legacy = legacyParseTypeScriptConfig(file)
      expect(warn).not.toHaveBeenCalled()
      warn.mockRestore()
      expect(Object.keys(legacy).length).toBeGreaterThan(0)

      expect(await loadConfig(file)).toEqual(legacy)

      const json = JSON.stringify(legacy)
      const forms = {
        json,
        mjs: `export default ${json}`,
        cjs: `module.exports = ${json}`,
        js: `export default ${json}`,
      }
      for (const [ext, body] of Object.entries(forms)) {
        expect(await loadConfig(write(`${name}-form.${ext}`, body))).toEqual(legacy)
      }
    })
  }
})

describe('TS config: static values the 0.5.1 parser ignored (QA-8)', () => {
  it('loads the README example, RegExp included', async () => {
    const file = write(
      'readme.config.ts',
      `// cmdk-engine.config.ts
import { defineConfig } from 'cmdk-engine'

export default defineConfig({
  framework: 'react-router', // or 'nextjs-app', 'nextjs-pages'
  routesDir: './src/routes',
  output: './src/generated/command-routes.json',
  overrides: {
    '/billing': { keywords: ['money', 'payment'], group: 'Billing' },
  },
  exclude: ['/_*', '/admin/*', /^\\/debug\\//], // strings, globs, or RegExp
  synonyms: {
    billing: ['money', 'payment', 'credits'],
  },
})
`,
    )

    expect(await loadConfig(file)).toEqual({
      framework: 'react-router',
      routesDir: './src/routes',
      output: './src/generated/command-routes.json',
      overrides: { '/billing': { keywords: ['money', 'payment'], group: 'Billing' } },
      exclude: ['/_*', '/admin/*', /^\/debug\//],
      synonyms: { billing: ['money', 'payment', 'credits'] },
    })
  })

  it('loads typed consts, spreads, shorthands, `as const` and generic `satisfies`', async () => {
    const file = write(
      'typed.config.ts',
      `import type { CmdkEngineConfig } from 'cmdk-engine'
const exclude = ['/admin/*', /^\\/internal/i] as const
const base: Partial<CmdkEngineConfig> = { framework: 'nextjs-app', includeDynamic: ['locale'] }
const config: import('cmdk-engine').CmdkEngineConfig = {
  ...base,
  exclude: [...exclude, '/old'],
  overrides: { '/a': { priority: -1 } } satisfies Record<string, { priority: number }>,
}
export default config
`,
    )

    expect(await loadConfig(file)).toEqual({
      framework: 'nextjs-app',
      includeDynamic: ['locale'],
      exclude: ['/admin/*', /^\/internal/i, '/old'],
      overrides: { '/a': { priority: -1 } },
    })
  })

  it.each([
    ['process.env', "output: process.env.OUT ?? 'out.json'", 3, 'process.env.OUT'],
    ['a function call', 'exclude: getExcludes()', 3, 'getExcludes()'],
    ['a template with ${}', 'output: `${dir}/out.json`', 3, '`${dir}/out.json`'],
    ['an unknown name', 'exclude: EXCLUDES', 3, 'EXCLUDES'],
  ])('throws with the file, line and value for %s', async (_, line, lineNumber, snippet) => {
    const file = write(
      'computed.config.ts',
      `export default {\n  framework: 'react-router',\n  ${line},\n}\n`,
    )

    await expect(loadConfig(file)).rejects.toThrow(`computed.config.ts:${lineNumber}: \`${snippet}`)
    await expect(loadConfig(file)).rejects.toThrow(
      /put computed config in cmdk-engine\.config\.mjs/,
    )
  })

  it('throws when the file has no export default', async () => {
    const file = write('none.config.ts', `export const config = { framework: 'react-router' }`)

    await expect(loadConfig(file)).rejects.toThrow('no `export default` found')
  })
})

describe('scan and validate exit 1 on a TS config they cannot read', () => {
  async function run(command: typeof scanCommand, args: string[]) {
    const exit = vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`exit ${code}`)
    }) as typeof process.exit)
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    try {
      await expect(command.parseAsync(args, { from: 'user' })).rejects.toThrow('exit 1')
      return error.mock.calls.map((call) => call.join(' ')).join('\n')
    } finally {
      exit.mockRestore()
      error.mockRestore()
      log.mockRestore()
    }
  }

  it('validate', async () => {
    const file = write('cmdk-engine.config.ts', `export default { exclude: getExcludes() }`)

    expect(await run(validateCommand, ['-c', file])).toMatch(
      /Validation failed: .*cmdk-engine\.config\.ts:1: `getExcludes\(\)/,
    )
  })

  it('validate, for an exclude entry that is not a string or RegExp', async () => {
    const file = write('cmdk-engine.config.json', JSON.stringify({ exclude: ['/ok', 42] }))

    expect(await run(validateCommand, ['-c', file])).toContain(
      'Exclude patterns must be strings or RegExp: 42',
    )
  })

  it('scan', async () => {
    mkdirSync(join(TEMP_DIR, 'routes'))
    write('routes/r.tsx', `export const routes = [{ path: '/a' }]`)
    const file = write('cmdk-engine.config.ts', `export default { exclude: getExcludes() }`)

    expect(
      await run(scanCommand, [
        ...['-c', file, '--routes-dir', join(TEMP_DIR, 'routes')],
        ...['-o', join(TEMP_DIR, 'out.json')],
      ]),
    ).toMatch(/Scan failed: .*cmdk-engine\.config\.ts:1: `getExcludes\(\)/)
  })
})
