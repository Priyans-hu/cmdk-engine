import { Command } from 'commander'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { loadConfig } from '../config-loader'

export const validateCommand = new Command('validate')
  .description('Validate the cmdk-engine config file')
  .option('-c, --config <path>', 'Path to config file', 'cmdk-engine.config.ts')
  .action(async (options) => {
    try {
      const configPath = resolve(options.config)

      if (!existsSync(configPath)) {
        console.error(`Config file not found: ${configPath}`)
        console.error('Run `npx cmdk-engine init` to create one.')
        process.exit(1)
      }

      const config = await loadConfig(options.config)
      const errors: string[] = []

      // Validate framework
      const validFrameworks = ['react-router', 'nextjs-app', 'nextjs-pages', 'custom']
      if (config.framework && !validFrameworks.includes(config.framework)) {
        errors.push(
          `Invalid framework "${config.framework}". Must be one of: ${validFrameworks.join(', ')}`,
        )
      }

      // Validate routesDir exists
      if (config.routesDir && !existsSync(resolve(config.routesDir))) {
        errors.push(`Routes directory not found: ${config.routesDir}`)
      }

      // Validate overrides format
      if (config.overrides) {
        for (const [path, meta] of Object.entries(config.overrides)) {
          if (!path.startsWith('/')) {
            errors.push(`Override path must start with "/": ${path}`)
          }
          if (meta.keywords && !Array.isArray(meta.keywords)) {
            errors.push(`Override keywords must be an array for path: ${path}`)
          }
          if (meta.permissions && !Array.isArray(meta.permissions)) {
            errors.push(`Override permissions must be an array for path: ${path}`)
          }
        }
      }

      // Validate exclude patterns
      if (config.exclude) {
        if (!Array.isArray(config.exclude)) {
          errors.push('Exclude must be an array of strings')
        }
      }

      // Validate synonyms
      if (config.synonyms) {
        for (const [key, values] of Object.entries(config.synonyms)) {
          if (!Array.isArray(values)) {
            errors.push(`Synonym values must be an array for key: ${key}`)
          }
        }
      }

      if (errors.length > 0) {
        console.error('Validation errors:')
        errors.forEach((e) => console.error(`  - ${e}`))
        process.exit(1)
      }

      console.log('Config is valid.')
    } catch (error) {
      console.error('Validation failed:', (error as Error).message)
      process.exit(1)
    }
  })
