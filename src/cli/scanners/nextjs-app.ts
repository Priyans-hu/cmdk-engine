import { readdirSync, statSync, realpathSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import type { SitemapRoute } from '../../core/types'
import { pathToLabel, pathToGroup, pathToId } from '../../core/utils'
import {
  allowsDynamicPath,
  deduplicateRoutes,
  isIgnoredDir,
  toSource,
  type ScanOptions,
} from './shared'

const PAGE_FILE_RE = /^page\.(?:[mc]?[jt]s|[jt]sx|mdx?)$/

/**
 * Scan a Next.js app/ directory for routes.
 *
 * Convention: Each directory with a page.tsx/page.jsx/page.ts/page.js = route.
 * Path from directory structure:
 * - app/dashboard/page.tsx → /dashboard
 * - app/billing/overview/page.tsx → /billing/overview
 * - app/(auth)/login/page.tsx → /login (groups are stripped)
 * - app/[id]/page.tsx → /:id (dynamic: kept only with `includeDynamic`)
 * - app/shop/[[...slug]]/page.tsx → /shop (the optional catch-all's own URL)
 * - app/feed/(..)photo/page.tsx → skipped (an intercepting route renders another route's page)
 */
export function scanNextJsAppDir(dir: string, options: ScanOptions = {}): SitemapRoute[] {
  const routes: SitemapRoute[] = []
  walkAppDir(dir, dir, routes, options)
  return deduplicateRoutes(routes)
}

function walkAppDir(
  currentDir: string,
  baseDir: string,
  routes: SitemapRoute[],
  options: ScanOptions,
  visited = new Set<string>(),
): void {
  let entries: string[]
  try {
    const real = realpathSync(currentDir)
    if (visited.has(real)) return
    visited.add(real)
    entries = readdirSync(currentDir)
  } catch {
    return
  }

  // Check if this directory has a page file
  const pageFile = entries.find((e) => PAGE_FILE_RE.test(e))

  if (pageFile) {
    const relativePath = relative(baseDir, currentDir)
    const routePath = dirToRoutePath(relativePath)

    // Dynamic routes need params: keep only those `includeDynamic` names
    if (routePath !== null && allowsDynamicPath(routePath, options.includeDynamic)) {
      routes.push({
        id: pathToId(routePath || '/'),
        path: routePath || '/',
        label: routePath ? pathToLabel(routePath) : 'Home',
        keywords: generateKeywords(routePath),
        group: routePath ? pathToGroup(routePath) : undefined,
        source: toSource(join(currentDir, pageFile)),
      })
    }
  }

  // Recurse into subdirectories
  for (const entry of entries) {
    if (isIgnoredDir(entry)) continue
    // Only the top-level app/api holds Next.js route handlers; a nested folder
    // named "api" (e.g. app/dashboard/api/page.tsx) is a real UI route.
    if (entry === 'api' && currentDir === baseDir) continue

    const fullPath = join(currentDir, entry)
    try {
      if (statSync(fullPath).isDirectory()) {
        walkAppDir(fullPath, baseDir, routes, options, visited)
      }
    } catch {
      // Skip inaccessible directories
    }
  }
}

/**
 * Convert a directory path to a route path, or null for a page that has no URL of
 * its own. Handles Next.js conventions: route groups (), dynamic [params],
 * catch-all [...params], optional catch-all [[...params]], intercepting (.)routes.
 */
function dirToRoutePath(dirPath: string): string | null {
  if (!dirPath) return '/'

  const segments = dirPath.split(sep).filter(Boolean)
  const routeSegments: string[] = []

  for (const segment of segments) {
    // Intercepting routes, (.)photo, (..)shop, (...)x: they render another
    // route's page in place, so they are not a URL of their own
    if (/^\(\.{1,3}\)/.test(segment)) return null

    // Skip route groups: (auth), (marketing), etc.
    if (segment.startsWith('(') && segment.endsWith(')')) continue

    // Skip private folders: _components, _lib, etc.
    if (segment.startsWith('_')) continue

    // Convert dynamic segments: [id] → :id
    if (segment.startsWith('[') && segment.endsWith(']')) {
      const param = segment.slice(1, -1)
      if (param.startsWith('...')) {
        routeSegments.push(`*${param.slice(3)}`)
      } else if (!param.startsWith('[')) {
        routeSegments.push(`:${param}`)
      }
      // An optional catch-all, [[...slug]], also matches its parent's URL: no segment
      continue
    }

    // Parallel routes: @modal, @sidebar — skip these
    if (segment.startsWith('@')) continue

    routeSegments.push(segment)
  }

  return '/' + routeSegments.join('/')
}

function generateKeywords(path: string): string[] {
  return path
    .split('/')
    .filter(Boolean)
    .filter((seg) => !seg.startsWith(':') && !seg.startsWith('*'))
    .map((seg) => seg.toLowerCase().replace(/[-_]/g, ' '))
}
