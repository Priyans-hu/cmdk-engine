import { readdirSync, readFileSync, statSync, realpathSync } from 'node:fs'
import { join } from 'node:path'
import type { SitemapRoute } from '../../core/types'
import { pathToLabel, pathToGroup, pathToId } from '../../core/utils'
import { SOURCE_FILE_RE, isIgnoredDir, deduplicateRoutes, toSource, stripComments } from './shared'

/**
 * Scan a directory for React Router route definitions.
 *
 * Looks for:
 * - Route objects with `path` properties
 * - `handle.command` metadata
 * - createBrowserRouter / createRoutesFromElements patterns
 *
 * Note: relative child paths inside nested `children` arrays are not composed
 * into full paths (a known limitation of the regex-based scanner) — declare
 * such routes with absolute `path` values to have them discovered.
 */
export function scanReactRouterFiles(dir: string): SitemapRoute[] {
  const files = findSourceFiles(dir)
  const routes: SitemapRoute[] = []

  for (const file of files) {
    const content = readFileSync(file, 'utf-8')
    routes.push(...extractRoutes(content, file))
  }

  return deduplicateRoutes(routes)
}

function findSourceFiles(dir: string, files: string[] = [], visited = new Set<string>()): string[] {
  try {
    // Guard against symlink loops by tracking real paths already visited.
    const real = realpathSync(dir)
    if (visited.has(real)) return files
    visited.add(real)

    for (const entry of readdirSync(dir)) {
      if (isIgnoredDir(entry)) continue

      const fullPath = join(dir, entry)
      const stat = statSync(fullPath)
      if (stat.isDirectory()) {
        findSourceFiles(fullPath, files, visited)
      } else if (SOURCE_FILE_RE.test(entry)) {
        files.push(fullPath)
      }
    }
  } catch {
    // Directory doesn't exist or no permission
  }

  return files
}

/**
 * Extract route paths from a source file using regex patterns.
 * This is an AST-light approach — covers common patterns without a full parser.
 */
function extractRoutes(content: string, filePath: string): SitemapRoute[] {
  const routes: SitemapRoute[] = []
  const source = toSource(filePath)
  // Strip comments so commented-out route definitions aren't scanned in.
  const cleaned = stripComments(content)

  // Pattern 1: { path: '/...' } in route objects
  const pathRegex = /path\s*:\s*['"`]([^'"`]+)['"`]/g
  let match

  while ((match = pathRegex.exec(cleaned)) !== null) {
    const path = match[1]
    if (!path.startsWith('/')) continue // Skip relative child paths (see note above)
    if (path === '*' || path === '404') continue // Skip catch-all

    const route = createRoute(path, source)

    // Try to find handle.command metadata near this path
    const metadata = extractMetadataNear(cleaned, match.index)
    if (metadata) {
      if (metadata.label) route.label = metadata.label
      if (metadata.keywords) route.keywords = [...route.keywords, ...metadata.keywords]
      if (metadata.group) route.group = metadata.group
    }

    routes.push(route)
  }

  // Pattern 2: <Route path="/..." /> JSX routes
  const jsxRouteRegex = /<Route\s[^>]*path\s*=\s*['"`]([^'"`]+)['"`]/g

  while ((match = jsxRouteRegex.exec(cleaned)) !== null) {
    const path = match[1]
    if (!path.startsWith('/')) continue
    if (path === '*') continue

    routes.push(createRoute(path, source))
  }

  return routes
}

function createRoute(path: string, source: string): SitemapRoute {
  return {
    id: pathToId(path),
    path,
    label: pathToLabel(path),
    keywords: generateKeywords(path),
    group: pathToGroup(path),
    source,
  }
}

function generateKeywords(path: string): string[] {
  // Split path into segments and create keywords from each
  return path
    .split('/')
    .filter(Boolean)
    .filter((seg) => !seg.startsWith(':') && !seg.startsWith('*'))
    .map((seg) => seg.toLowerCase().replace(/[-_]/g, ' '))
}

/**
 * Try to extract handle.command metadata near a path definition.
 */
function extractMetadataNear(
  content: string,
  pathIndex: number,
): { label?: string; keywords?: string[]; group?: string } | null {
  // Look for handle.command within 500 chars after path
  const nearby = content.slice(pathIndex, pathIndex + 500)
  const handleMatch = nearby.match(/handle\s*:\s*\{[\s\S]*?command\s*:\s*\{([\s\S]*?)\}/)

  if (!handleMatch) return null

  const commandBlock = handleMatch[1]
  const result: { label?: string; keywords?: string[]; group?: string } = {}

  const labelMatch = commandBlock.match(/label\s*:\s*['"`]([^'"`]+)['"`]/)
  if (labelMatch) result.label = labelMatch[1]

  const groupMatch = commandBlock.match(/group\s*:\s*['"`]([^'"`]+)['"`]/)
  if (groupMatch) result.group = groupMatch[1]

  const keywordsMatch = commandBlock.match(/keywords\s*:\s*\[([\s\S]*?)\]/)
  if (keywordsMatch) {
    result.keywords = keywordsMatch[1]
      .split(',')
      .map((s) => s.trim().replace(/['"`]/g, ''))
      .filter(Boolean)
  }

  return Object.keys(result).length > 0 ? result : null
}
