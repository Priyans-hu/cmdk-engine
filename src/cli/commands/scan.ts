import { Command } from 'commander'
import { resolve, dirname } from 'node:path'
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs'
import { loadConfig } from '../config-loader'
import { scanReactRouterFiles } from '../scanners/react-router'
import { scanNextJsAppDir } from '../scanners/nextjs-app'
import { scanNextJsPagesDir } from '../scanners/nextjs-pages'
import { generateSitemap, sortRoutes } from '../generators/sitemap'
import type { ScanOptions } from '../scanners/shared'
import type { CmdkEngineConfig, Sitemap, SitemapRoute } from '../../core/types'
import {
  DEFAULT_EXCLUDE,
  matchesExcludePattern,
  type ExcludePattern,
} from '../../core/route-defaults'

export const scanCommand = new Command('scan')
  .description('Scan project routes and generate a command sitemap')
  .option('-c, --config <path>', 'Path to config file', 'cmdk-engine.config.ts')
  .option('-o, --output <path>', 'Output file path (overrides config)')
  .option('-f, --format <format>', 'Output format: json or ts', 'json')
  .option('--framework <framework>', 'Framework: react-router, nextjs-app, nextjs-pages')
  .option('--routes-dir <dir>', 'Directory to scan for routes')
  .option('--allow-empty', 'Write output even when no routes are found')
  .option(
    '--no-default-exclude',
    'Skip the default exclusion list (auth/error routes like /login, /signup, /404 are normally excluded)',
  )
  .option(
    '--include-dynamic [names...]',
    'Keep routes with these :param segments, e.g. locale (every :param when no name is given)',
  )
  .action(async (options, command: Command) => {
    try {
      // Validate --format up front so a typo doesn't silently produce JSON.
      if (options.format !== 'json' && options.format !== 'ts') {
        console.error(`Invalid --format "${options.format}". Use "json" or "ts".`)
        process.exit(1)
      }

      // An explicitly-passed --config must exist (a typo shouldn't silently
      // fall back to full auto-detection).
      if (
        command.getOptionValueSource('config') === 'cli' &&
        !existsSync(resolve(options.config))
      ) {
        console.error(`Config file not found: ${options.config}`)
        process.exit(1)
      }

      const config = await loadConfig(options.config)
      const framework = options.framework ?? config.framework ?? detectFramework()
      const routesDir = options.routesDir ?? config.routesDir ?? detectRoutesDir(framework)
      const outputPath = options.output ?? config.output ?? 'src/generated/command-routes.json'

      const resolvedRoutesDir = resolve(routesDir)
      if (!existsSync(resolvedRoutesDir)) {
        console.error(`Routes directory not found: ${routesDir}`)
        process.exit(1)
      }

      // The flag wins over the config; `--include-dynamic a,b` and `a b` both work
      const scanOptions: ScanOptions = {
        includeDynamic:
          command.getOptionValueSource('includeDynamic') === 'cli'
            ? options.includeDynamic === true ||
              (options.includeDynamic as string[])
                .flatMap((names) => names.split(','))
                .map((name) => name.trim())
                .filter(Boolean)
            : config.includeDynamic,
      }

      console.log(`Scanning ${framework} routes in ${routesDir}...`)

      let routes: SitemapRoute[] = []

      switch (framework) {
        case 'react-router':
          routes = scanReactRouterFiles(resolvedRoutesDir, scanOptions)
          break
        case 'nextjs-app':
          routes = scanNextJsAppDir(resolvedRoutesDir, scanOptions)
          break
        case 'nextjs-pages':
          routes = scanNextJsPagesDir(resolvedRoutesDir, scanOptions)
          break
        default:
          console.error(
            `Unknown framework: ${framework}. Use react-router, nextjs-app, or nextjs-pages.`,
          )
          process.exit(1)
      }

      // Apply overrides from config
      if (config.overrides) {
        routes = applyOverrides(routes, config.overrides)
      }

      // Apply default exclusions (auth/error routes) — matches the runtime
      // adapter behavior. Opt out via --no-default-exclude.
      if (options.defaultExclude !== false) {
        routes = applyDefaultExclusions(routes)
      }

      // Apply user exclusions
      if (config.exclude) {
        routes = applyExclusions(routes, config.exclude)
      }

      routes = uniqueIds(routes)

      // Refuse to silently overwrite good output with an empty sitemap (a
      // mistyped --routes-dir/--framework is a common cause of 0 routes).
      if (routes.length === 0 && !options.allowEmpty) {
        console.error(
          `No routes found in ${routesDir}. Check --framework / --routes-dir, ` +
            `or pass --allow-empty to write an empty sitemap. Left ${outputPath} untouched.`,
        )
        process.exit(1)
      }

      const targetPath = resolve(
        options.format === 'ts' ? outputPath.replace(/\.json$/, '.ts') : outputPath,
      )

      // Reuse the previous timestamp when the routes are unchanged so committed
      // output stays diff-clean (idempotent scans).
      const generatedAt =
        options.format === 'json'
          ? reusePriorTimestamp(targetPath, routes, framework)
          : new Date().toISOString()
      const sitemap = generateSitemap(routes, framework, generatedAt)

      const outputDir = dirname(targetPath)
      if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true })
      }

      if (options.format === 'ts') {
        const tsOutput = `// Auto-generated by cmdk-engine scan\n// Do not edit manually\n\nimport type { Sitemap } from 'cmdk-engine'\n\nexport const commandRoutes: Sitemap = ${JSON.stringify(sitemap, null, 2)}\n`
        writeFileSync(targetPath, tsOutput, 'utf-8')
      } else {
        writeFileSync(targetPath, JSON.stringify(sitemap, null, 2) + '\n', 'utf-8')
      }

      console.log(`Found ${routes.length} routes`)
      console.log(`Written to ${outputPath}`)
    } catch (error) {
      console.error('Scan failed:', (error as Error).message)
      process.exit(1)
    }
  })

/** Reuse the prior output's timestamp when the route set is unchanged. */
function reusePriorTimestamp(
  targetPath: string,
  routes: SitemapRoute[],
  framework: string,
): string {
  try {
    if (existsSync(targetPath)) {
      const prev = JSON.parse(readFileSync(targetPath, 'utf-8')) as Sitemap
      const nextRoutes = JSON.stringify(generateSitemap(routes, framework, '').routes)
      if (JSON.stringify(prev.routes) === nextRoutes && typeof prev.generatedAt === 'string') {
        return prev.generatedAt
      }
    }
  } catch {
    // Ignore malformed/absent prior output — fall through to a fresh timestamp.
  }
  return new Date().toISOString()
}

function detectFramework(): string {
  if (
    existsSync('next.config.ts') ||
    existsSync('next.config.js') ||
    existsSync('next.config.mjs') ||
    existsSync('next.config.cjs')
  ) {
    // Check if using app router
    if (existsSync('app') || existsSync('src/app')) {
      return 'nextjs-app'
    }
    return 'nextjs-pages'
  }

  // Check for React Router by looking for route files
  if (existsSync('src/routes') || existsSync('src/router.tsx') || existsSync('src/router.ts')) {
    return 'react-router'
  }

  return 'react-router' // default
}

function detectRoutesDir(framework: string): string {
  switch (framework) {
    case 'nextjs-app':
      return existsSync('src/app') ? 'src/app' : 'app'
    case 'nextjs-pages':
      return existsSync('src/pages') ? 'src/pages' : 'pages'
    case 'react-router':
      return existsSync('src/routes') ? 'src/routes' : 'src'
    default:
      return 'src'
  }
}

function applyOverrides(
  routes: SitemapRoute[],
  overrides: NonNullable<CmdkEngineConfig['overrides']>,
): SitemapRoute[] {
  return routes.map((route) => {
    const override = overrides[route.path]
    if (!override) return route

    return {
      ...route,
      label: override.label ?? route.label,
      keywords: override.keywords
        ? [...new Set([...route.keywords, ...override.keywords])]
        : route.keywords,
      group: override.group ?? route.group,
    }
  })
}

/**
 * Filter out routes matching user-supplied exclude patterns, with the matcher the
 * runtime React Router adapter shares: exact strings, globs (`*` within a path
 * segment, `**` across segments) and RegExp.
 */
function applyExclusions(routes: SitemapRoute[], exclude: ExcludePattern[]): SitemapRoute[] {
  return routes.filter(
    (route) => !exclude.some((pattern) => matchesExcludePattern(route.path, pattern)),
  )
}

/**
 * Make route ids unique. Ids keep only letters, digits and '-', so `/a_b` and
 * `/ab` share `ab`. A registry keeps the last command registered with an id, so
 * in path order the last of them keeps it (and the frecency and Recent history
 * stored under it), and the others get `-2`, `-3`, ..., skipping ids in use.
 * Exported for direct testing.
 */
export function uniqueIds(routes: SitemapRoute[]): SitemapRoute[] {
  const sorted = sortRoutes(routes)
  const taken = new Set(sorted.map((route) => route.id))
  const owner = new Map(sorted.map((route) => [route.id, route]))

  return sorted.map((route) => {
    const kept = owner.get(route.id)
    if (kept === route) return route
    let n = 2
    while (taken.has(`${route.id}-${n}`)) n++
    const id = `${route.id}-${n}`
    taken.add(id)
    console.warn(
      `Warning: ${route.path} and ${kept?.path} share the id "${route.id}"; ${route.path} gets "${id}".`,
    )
    return { ...route, id }
  })
}

/**
 * Filter out routes that match the default exclusion list (auth/error pages).
 * Mirrors the runtime React Router adapter so CLI output matches.
 *
 * Exported for direct testing — also imported by the scan command above.
 */
export function applyDefaultExclusions(routes: SitemapRoute[]): SitemapRoute[] {
  return routes.filter(
    (route) => !DEFAULT_EXCLUDE.some((pattern) => matchesExcludePattern(route.path, pattern)),
  )
}
