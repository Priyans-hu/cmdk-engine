import { describe, it, expect, afterEach } from 'vitest'
import { writeFileSync, rmSync, existsSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { loadConfig } from '../../src/cli/config-loader'

const TEMP_DIR = resolve('.test-temp-validate')

afterEach(() => {
  if (existsSync(TEMP_DIR)) {
    rmSync(TEMP_DIR, { recursive: true, force: true })
  }
})

describe('loadConfig', () => {
  it('returns empty config when file does not exist', async () => {
    const config = await loadConfig('/nonexistent/path/config.ts')
    expect(config).toEqual({})
  })

  it('loads JSON config', async () => {
    mkdirSync(TEMP_DIR, { recursive: true })
    const configPath = resolve(TEMP_DIR, 'config.json')
    writeFileSync(
      configPath,
      JSON.stringify({
        framework: 'react-router',
        routesDir: './src/routes',
        output: './generated/routes.json',
      }),
    )

    const config = await loadConfig(configPath)
    expect(config.framework).toBe('react-router')
    expect(config.routesDir).toBe('./src/routes')
    expect(config.output).toBe('./generated/routes.json')
  })

  it('loads TS config with defineConfig', async () => {
    mkdirSync(TEMP_DIR, { recursive: true })
    const configPath = resolve(TEMP_DIR, 'config.ts')
    writeFileSync(
      configPath,
      `
      import { defineConfig } from 'cmdk-engine'

      export default defineConfig({
        framework: 'nextjs-app',
        routesDir: './app',
        output: './src/generated/routes.json',
        exclude: ['/404', '/500'],
      })
      `,
    )

    const config = await loadConfig(configPath)
    expect(config.framework).toBe('nextjs-app')
    expect(config.routesDir).toBe('./app')
    expect(config.exclude).toEqual(['/404', '/500'])
  })

  it('loads TS config with export default', async () => {
    mkdirSync(TEMP_DIR, { recursive: true })
    const configPath = resolve(TEMP_DIR, 'config.ts')
    writeFileSync(
      configPath,
      `
      export default {
        framework: 'react-router',
        routesDir: './src/routes',
      }
      `,
    )

    const config = await loadConfig(configPath)
    expect(config.framework).toBe('react-router')
  })

  it('handles config with synonyms', async () => {
    mkdirSync(TEMP_DIR, { recursive: true })
    const configPath = resolve(TEMP_DIR, 'config.json')
    writeFileSync(
      configPath,
      JSON.stringify({
        synonyms: {
          billing: ['money', 'payment'],
          settings: ['preferences', 'config'],
        },
      }),
    )

    const config = await loadConfig(configPath)
    expect(config.synonyms?.billing).toEqual(['money', 'payment'])
    expect(config.synonyms?.settings).toEqual(['preferences', 'config'])
  })

  it('handles config with overrides', async () => {
    mkdirSync(TEMP_DIR, { recursive: true })
    const configPath = resolve(TEMP_DIR, 'config.json')
    writeFileSync(
      configPath,
      JSON.stringify({
        overrides: {
          '/billing': { keywords: ['money', 'payment'], group: 'Billing' },
        },
      }),
    )

    const config = await loadConfig(configPath)
    expect(config.overrides?.['/billing']?.keywords).toEqual(['money', 'payment'])
  })

  it('preserves apostrophes in TS config string values', async () => {
    mkdirSync(TEMP_DIR, { recursive: true })
    const configPath = resolve(TEMP_DIR, 'config.ts')
    writeFileSync(
      configPath,
      `import { defineConfig } from 'cmdk-engine'
      export default defineConfig({
        overrides: {
          '/help': { keywords: ["don't panic", "user's guide"], group: 'Help' },
        },
      })`,
    )
    const config = await loadConfig(configPath)
    expect(config.overrides?.['/help']?.keywords).toEqual(["don't panic", "user's guide"])
    expect(config.overrides?.['/help']?.group).toBe('Help')
  })

  it('preserves colons/URLs in TS config values (not treated as comments)', async () => {
    mkdirSync(TEMP_DIR, { recursive: true })
    const configPath = resolve(TEMP_DIR, 'config.ts')
    writeFileSync(
      configPath,
      `export default {
        overrides: {
          '/faq': { keywords: ['faq: frequently asked', 'https://example.com/docs'] },
        },
      }`,
    )
    const config = await loadConfig(configPath)
    expect(config.overrides?.['/faq']?.keywords).toEqual([
      'faq: frequently asked',
      'https://example.com/docs',
    ])
  })

  it('ignores block and line comments in TS config', async () => {
    mkdirSync(TEMP_DIR, { recursive: true })
    const configPath = resolve(TEMP_DIR, 'config.ts')
    writeFileSync(
      configPath,
      `import { defineConfig } from 'cmdk-engine'
      export default defineConfig({
        /* block comment { framework: 'nextjs-app' } */
        framework: 'react-router', // line comment
        exclude: ['/404'],
      })`,
    )
    const config = await loadConfig(configPath)
    expect(config.framework).toBe('react-router')
    expect(config.exclude).toEqual(['/404'])
  })

  it('strips a UTF-8 BOM from JSON configs', async () => {
    mkdirSync(TEMP_DIR, { recursive: true })
    const configPath = resolve(TEMP_DIR, 'config.json')
    writeFileSync(configPath, String.fromCharCode(0xfeff) + JSON.stringify({ framework: 'react-router' }))
    const config = await loadConfig(configPath)
    expect(config.framework).toBe('react-router')
  })
})
