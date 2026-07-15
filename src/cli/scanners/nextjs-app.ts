import { readdirSync, statSync, realpathSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import type { SitemapRoute } from '../../core/types'
import { pathToLabel, pathToGroup, pathToId } from '../../core/utils'
import { deduplicateRoutes, isIgnoredDir, toSource } from './shared'

const PAGE_FILE_RE = /^page\.(?:[mc]?[jt]s|[jt]sx|mdx?)$/

/**
 * Scan a Next.js app/ directory for routes.
 *
 * Convention: Each directory with a page.tsx/page.jsx/page.ts/page.js = route.
 * Path from directory structure:
 * - app/dashboard/page.tsx → /dashboard
 * - app/billing/overview/page.tsx → /billing/overview
 * - app/(auth)/login/page.tsx → /login (groups are stripped)
 * - app/[id]/page.tsx → /:id (dynamic segments)
 */
export function scanNextJsAppDir(dir: string): SitemapRoute[] {
  const routes: SitemapRoute[] = []
  walkAppDir(dir, dir, routes)
  return deduplicateRoutes(routes)
}

function walkAppDir(
  currentDir: string,
  baseDir: string,
  routes: SitemapRoute[],
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

    // Skip dynamic route segments for command palette (they need params)
    if (!routePath.includes(':') && !routePath.includes('*')) {
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
        walkAppDir(fullPath, baseDir, routes, visited)
      }
    } catch {
      // Skip inaccessible directories
    }
  }
}

/**
 * Convert a directory path to a route path.
 * Handles Next.js conventions: route groups (), dynamic [params], catch-all [...params].
 */
function dirToRoutePath(dirPath: string): string {
  if (!dirPath) return '/'

  const segments = dirPath.split(sep).filter(Boolean)
  const routeSegments: string[] = []

  for (const segment of segments) {
    // Skip route groups: (auth), (marketing), etc.
    if (segment.startsWith('(') && segment.endsWith(')')) continue

    // Skip private folders: _components, _lib, etc.
    if (segment.startsWith('_')) continue

    // Convert dynamic segments: [id] → :id
    if (segment.startsWith('[') && segment.endsWith(']')) {
      const param = segment.slice(1, -1)
      if (param.startsWith('...')) {
        routeSegments.push(`*${param.slice(3)}`)
      } else if (param.startsWith('[') && param.endsWith(']')) {
        // Optional catch-all: [[...slug]]
        routeSegments.push(`*${param.slice(4, -1)}`)
      } else {
        routeSegments.push(`:${param}`)
      }
      continue
    }

    // Intercept routes: (.)photo, (..)shop — skip these
    if (segment.startsWith('(.)') || segment.startsWith('(..)')) continue

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
