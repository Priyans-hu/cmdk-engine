import { useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { CommandItem } from '../../core/types'
import { pathToId, pathToLabel, pathToGroup } from '../../core/utils'
import { useCommandRegister } from '../../react/use-command-register'
import type { NextRouteLike, NextRoutesInput, UseNextCommandRoutesOptions } from './types'

/**
 * Normalize the various input shapes into a flat `NextRouteLike[]`.
 *
 * Accepts:
 *  - `NextRouteLike[]`
 *  - `Sitemap` (`{ routes: SitemapRoute[] }`)
 *  - Anything else with a `.routes` property
 */
function normalizeRoutes(input: NextRoutesInput): NextRouteLike[] {
  if (Array.isArray(input)) return input as NextRouteLike[]
  if (input && typeof input === 'object' && Array.isArray((input as { routes: unknown }).routes)) {
    return (input as { routes: NextRouteLike[] }).routes
  }
  return []
}

/**
 * Convert a single `NextRouteLike` into a `CommandItem` by deriving
 * label/group/id from the path when not explicitly provided. The
 * route's `meta` (RouteCommandMeta) takes precedence.
 *
 * The returned item has no `action` yet — that is wired up by the
 * hook below so it can capture the live `router` instance.
 */
function routeToCommand(
  route: NextRouteLike,
  defaults: { defaultGroup?: string },
): CommandItem {
  const meta = route.meta
  const path = route.path

  return {
    id: route.id ?? pathToId(path),
    label: meta?.label ?? route.label ?? pathToLabel(path),
    description: meta?.description ?? route.description,
    keywords: meta?.keywords ?? route.keywords,
    group: meta?.group ?? route.group ?? pathToGroup(path) ?? defaults.defaultGroup,
    icon: meta?.icon ?? route.icon,
    permissions: meta?.permissions ?? route.permissions,
    priority: meta?.priority ?? route.priority,
    hidden: meta?.hidden ?? route.hidden,
    href: path,
  }
}

/**
 * Register an array of Next.js routes as command items.
 *
 * Each command's `action` calls `router.push(href)`. When the palette
 * is hovered over an item with `prefetchOnMount`, the underlying page
 * is prefetched on mount so navigation feels instant.
 *
 * Pair this with the CLI: run `cmdk-engine scan` to generate a
 * `command-routes.json`, then import it and pass it here.
 *
 * @example
 * ```tsx
 * 'use client'
 * import { useNextCommandRoutes } from 'cmdk-engine/nextjs'
 * import sitemap from '@/generated/command-routes.json'
 *
 * export function CommandRoutes() {
 *   useNextCommandRoutes(sitemap)
 *   return null
 * }
 * ```
 */
export function useNextCommandRoutes(
  input: NextRoutesInput,
  options: UseNextCommandRoutesOptions = {},
): void {
  const router = useRouter()
  const { prefetchOnMount = false, defaultGroup, transform } = options

  const commands = useMemo<CommandItem[]>(() => {
    const routes = normalizeRoutes(input)
    return routes.map((route) => {
      const base = routeToCommand(route, { defaultGroup })
      const overrides = transform?.(route)
      const merged: CommandItem = { ...base, ...overrides }

      // Wire up the action — this is the whole point of the adapter.
      // We capture `router` from the closure, so caller doesn't have
      // to glue navigation into every command manually.
      const href = merged.href ?? base.href
      merged.action = () => {
        if (href) router.push(href)
      }

      return merged
    })
  }, [input, defaultGroup, transform, router])

  // Optionally prefetch every route once on mount. For lots of
  // routes this can be expensive — opt-in only.
  useEffect(() => {
    if (!prefetchOnMount) return
    for (const cmd of commands) {
      if (cmd.href) router.prefetch(cmd.href)
    }
  }, [prefetchOnMount, commands, router])

  useCommandRegister(commands, [commands])
}
