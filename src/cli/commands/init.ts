import { Command } from 'commander'
import { existsSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const CONFIG_TEMPLATE = `import { defineConfig } from 'cmdk-engine'

export default defineConfig({
  // Framework detection (auto-detected if not set)
  // framework: 'react-router',

  // Where to scan for routes
  // routesDir: './src/routes',

  // Output file for generated route map
  output: './src/generated/command-routes.json',

  // Custom keywords/overrides (merged with auto-discovered)
  overrides: {
    // '/billing': { keywords: ['money', 'payment', 'invoice'], group: 'Billing' },
    // '/settings': { keywords: ['preferences', 'config'], group: 'Settings' },
  },

  // Routes to exclude from scanning
  exclude: ['/404', '/500', '/_*'],

  // Synonym dictionary
  synonyms: {
    // billing: ['money', 'payment', 'credits', 'recharge'],
    // settings: ['preferences', 'config', 'options'],
  },
})
`

export const initCommand = new Command('init')
  .description('Create a cmdk-engine.config.ts file')
  .option('-c, --config <path>', 'Config file path to create', 'cmdk-engine.config.ts')
  .option('-f, --force', 'Overwrite existing config file')
  .action((options) => {
    try {
      const configPath = resolve(options.config)

      if (existsSync(configPath) && !options.force) {
        console.error(`Config file already exists: ${options.config}. Use --force to overwrite.`)
        process.exit(1)
      }

      writeFileSync(configPath, CONFIG_TEMPLATE, 'utf-8')
      console.log(`Created ${options.config}`)
      console.log('')
      console.log('Next steps:')
      console.log('  1. Edit the config file to match your project')
      console.log('  2. Run `npx cmdk-engine scan` to generate routes')
    } catch (error) {
      console.error('Init failed:', (error as Error).message)
      process.exit(1)
    }
  })
