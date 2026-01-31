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
})
