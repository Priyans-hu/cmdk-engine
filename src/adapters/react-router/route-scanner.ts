import type { ReactNode } from 'react'
import type { CommandItem, RouteCommandMeta } from '../../core/types'
import { pathToLabel, pathToGroup, pathToId } from '../../core/utils'

/**
 * A React Router route object shape (compatible with v6 and v7).
 * We only use the fields we need for scanning.
 */
export interface RouteObject {
  path?: string
  children?: RouteObject[]
  handle?: {
    command?: RouteCommandMeta
    [key: string]: unknown
  }
  [key: string]: unknown
}

/** An exclude pattern — exact string, glob with *, or RegExp */
type ExcludePattern = string | RegExp

/** Paths that are almost never useful as commands */
const DEFAULT_EXCLUDE: ExcludePattern[] = [
  /^\/(login|logout|signin|signout|signup|register)(\/|$)/,
  /^\/(forgot|reset)-password(\/|$)/,
  /^\/verify-email(\/|$)/,
  /^\/(oauth|auth)\/callback(\/|$)/,
  '/callback',
  '/404',
  '/500',
  '/error',
  '/not-found',
  '*',
]

/** Options for scanRoutes */
export interface ScanRoutesOptions {
  /**
   * Patterns to exclude from command discovery (merged with defaults).
   * Supports exact strings, globs with * (e.g. '/admin/*'), and RegExp.
   */
  exclude?: ExcludePattern[]
  /** Set to true to skip the default exclude list */
  noDefaultExclude?: boolean
  /** Include routes with dynamic segments like :id or [id] (default: false) */
  includeDynamic?: boolean
}

/** Check if a path matches an exclude pattern */
function matchesExclude(path: string, pattern: ExcludePattern): boolean {
  if (pattern instanceof RegExp) {
    return pattern.test(path)
  }
  // Glob: '/admin/*' matches '/admin/anything' and '/admin/deep/nested'
  if (pattern.includes('*')) {
    const prefix = pattern.replace(/\/?\*.*$/, '')
    return path === prefix || path.startsWith(prefix + '/')
  }
  // Exact match
  return path === pattern
}

/**
 * Scan a React Router route tree and extract command items.
 *
 * Walks the route tree recursively. For each route with a path,
 * creates a CommandItem. If the route has `handle.command` metadata,
 * uses it to enrich the item.
 *
 * @param routes - React Router route objects
 * @param options - Scan options (exclude paths, etc.)
 * @returns Array of discovered command items
 */
export function scanRoutes(
  routes: RouteObject[],
  options?: ScanRoutesOptions | string,
): CommandItem[] {
  // Support legacy signature: scanRoutes(routes, parentPath)
  const opts: ScanRoutesOptions = typeof options === 'string' ? {} : (options ?? {})
  const parentPath = typeof options === 'string' ? options : ''

  return scanRoutesInternal(routes, parentPath, opts)
}

function scanRoutesInternal(
  routes: RouteObject[],
  parentPath: string,
  options: ScanRoutesOptions,
): CommandItem[] {
  const commands: CommandItem[] = []
  const excludePatterns: ExcludePattern[] = options.noDefaultExclude
    ? (options.exclude ?? [])
    : [...DEFAULT_EXCLUDE, ...(options.exclude ?? [])]

  for (const route of routes) {
    const fullPath = buildPath(parentPath, route.path)

    // Only create commands for routes with paths (skip layout routes)
    if (route.path !== undefined && route.path !== '') {
      // Skip dynamic routes (:id, [id]) unless explicitly included or has handle.command
      const hasDynamic = /[:[\*]/.test(fullPath)
      const hasCommandMeta = !!route.handle?.command

      // Check if path matches any exclude pattern
      const isExcluded = excludePatterns.some(
        (p) => matchesExclude(fullPath, p) || matchesExclude(route.path ?? '', p),
      )

      if (isExcluded) {
        // Still recurse into children — only this path is excluded
      } else if (hasDynamic && !options.includeDynamic && !hasCommandMeta) {
        // Skip dynamic routes — can't navigate to /billing/:uuid without a real ID
        // Unless the route explicitly declares handle.command (user opted in)
      } else {
        const meta = route.handle?.command

        commands.push({
          id: pathToId(fullPath),
          label: meta?.label ?? (route.title as string) ?? pathToLabel(fullPath),
          description: meta?.description,
          keywords: meta?.keywords,
          group: meta?.group ?? pathToGroup(fullPath),
          icon: meta?.icon ?? (route.icon as ReactNode),
          permissions: meta?.permissions,
          priority: meta?.priority,
          hidden: meta?.hidden,
          href: fullPath,
        })
      }
    }

    // Recurse into children
    if (route.children) {
      commands.push(...scanRoutesInternal(route.children, fullPath, options))
    }
  }

  return commands
}

/**
 * Build a full path from parent + child segments.
 */
function buildPath(parent: string, child?: string): string {
  if (!child) return parent
  if (child.startsWith('/')) return child

  const base = parent.endsWith('/') ? parent : parent + '/'
  return base + child
}
