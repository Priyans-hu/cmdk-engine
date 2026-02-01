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

/**
 * Scan a React Router route tree and extract command items.
 *
 * Walks the route tree recursively. For each route with a path,
 * creates a CommandItem. If the route has `handle.command` metadata,
 * uses it to enrich the item.
 *
 * @param routes - React Router route objects
 * @param parentPath - Parent path for building full paths
 * @returns Array of discovered command items
 */
export function scanRoutes(routes: RouteObject[], parentPath = ''): CommandItem[] {
  const commands: CommandItem[] = []

  for (const route of routes) {
    const fullPath = buildPath(parentPath, route.path)

    // Only create commands for routes with paths (skip layout routes)
    if (route.path !== undefined && route.path !== '') {
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

    // Recurse into children
    if (route.children) {
      commands.push(...scanRoutes(route.children, fullPath))
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
