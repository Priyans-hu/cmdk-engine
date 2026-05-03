import type { ReactNode } from 'react'
import type { CommandItem, RouteCommandMeta, SitemapRoute, Sitemap } from '../../core/types'

/**
 * A single Next.js route entry the adapter understands.
 *
 * This is intentionally permissive so it accepts:
 * - The `SitemapRoute` shape produced by `cmdk-engine scan`
 * - Hand-authored routes that look like `{ path, label?, meta? }`
 * - Routes enriched with `RouteCommandMeta` via `meta`
 */
export interface NextRouteLike {
  /** Route path, e.g. `/billing/overview` */
  path: string
  /** Optional explicit ID (defaults to derived) */
  id?: string
  /** Optional display label */
  label?: string
  /** Optional description */
  description?: string
  /** Optional keywords */
  keywords?: string[]
  /** Optional group name */
  group?: string
  /** Optional icon */
  icon?: ReactNode
  /** Optional priority */
  priority?: number
  /** Optional permissions */
  permissions?: string[]
  /** Hidden flag */
  hidden?: boolean
  /** Inline command metadata override */
  meta?: RouteCommandMeta
}

/**
 * Anything `useNextCommandRoutes` accepts as input:
 * - Array of `NextRouteLike` (most common — straight from `command-routes.json`)
 * - Full `Sitemap` object (`{ routes: [...] }`)
 * - Array of `SitemapRoute` (CLI scanner output)
 */
export type NextRoutesInput =
  | NextRouteLike[]
  | SitemapRoute[]
  | Sitemap
  | { routes: NextRouteLike[] }

/** Options for `useNextCommandRoutes` */
export interface UseNextCommandRoutesOptions {
  /**
   * Prefetch each route's underlying page on mount. Useful when the
   * palette is opened lazily and you want navigation to feel instant.
   * Default: `false`
   */
  prefetchOnMount?: boolean
  /**
   * Default group fallback when a route has no group.
   */
  defaultGroup?: string
  /**
   * Transform a route entry into a partial `CommandItem` before the
   * adapter wires up the navigation `action` and `prefetch`. Use this
   * to attach icons, custom keywords, etc.
   */
  transform?: (route: NextRouteLike) => Partial<CommandItem>
}

/** A function that performs an App-Router navigation */
export type NextNavigateFn = (
  href: string,
  options?: { scroll?: boolean; replace?: boolean },
) => void

/** A function that prefetches a route */
export type NextPrefetchFn = (href: string) => void
