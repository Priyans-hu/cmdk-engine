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

/** Options for scanRoutes */
export interface ScanRoutesOptions {
  /** Route paths to exclude from command discovery */
  exclude?: string[]
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
  const excludeSet = options.exclude ? new Set(options.exclude) : null

  for (const route of routes) {
    const fullPath = buildPath(parentPath, route.path)

    // Only create commands for routes with paths (skip layout routes)
    if (route.path !== undefined && route.path !== '') {
      // Skip excluded paths
      if (excludeSet?.has(fullPath)) {
        // Still recurse into children — only this path is excluded
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
