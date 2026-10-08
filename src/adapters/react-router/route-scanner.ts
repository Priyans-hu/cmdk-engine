import type { ReactNode } from 'react'
import type { CommandItem, RouteCommandMeta } from '../../core/types'
import { pathToLabel, pathToGroup, pathToId } from '../../core/utils'
import {
  DEFAULT_EXCLUDE,
  matchesExcludePattern,
  type ExcludePattern,
} from '../../core/route-defaults'

// Re-export so existing imports from this module keep working
export { DEFAULT_EXCLUDE }
export type { ExcludePattern }

/**
 * A React Router route object shape (compatible with v6, v7 and v8).
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
 * The fields scanRoutes reads, without an index signature, so React Router's
 * own route types and app-defined route interfaces are accepted as they are.
 */
interface ScannableRoute {
  path?: string | undefined
  index?: boolean | undefined
  children?: readonly ScannableRoute[] | undefined
  // `object &` lets a handle without a `command` key through TypeScript's weak-type check
  handle?: (object & { command?: RouteCommandMeta | undefined }) | undefined
}

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

/**
 * Scan a React Router route tree and extract command items.
 *
 * Walks the route tree recursively. For each route with a path,
 * creates a CommandItem. If the route has `handle.command` metadata,
 * uses it to enrich the item.
 *
 * An index route resolves to its parent's URL (`/` for a pathless root). Its
 * `handle.command` is merged over the item for that URL (the index route
 * wins), and it gets its own item only when no other route has that URL.
 * A `handle` returned by `lazy()` is not read.
 *
 * @param routes - React Router route objects (v6, v7 or v8) or your own route type
 * @param options - Scan options (exclude paths, etc.)
 * @returns Array of discovered command items
 */
export function scanRoutes(
  routes: readonly (RouteObject | ScannableRoute)[],
  options?: ScanRoutesOptions | string,
): CommandItem[] {
  // Support legacy signature: scanRoutes(routes, parentPath)
  const opts: ScanRoutesOptions = typeof options === 'string' ? {} : (options ?? {})
  const parentPath = typeof options === 'string' ? options : ''

  // RouteObject's index signature is the loosest view of every accepted shape
  const indexMeta: IndexMeta = new Map()
  const commands = scanRoutesInternal(
    routes as readonly RouteObject[],
    parentPath,
    opts,
    false,
    indexMeta,
  )
  return mergeIndexRoutes(commands, indexMeta)
}

/** Items created for index routes, with each index route's own handle.command */
type IndexMeta = Map<CommandItem, RouteCommandMeta | undefined>

function scanRoutesInternal(
  routes: readonly RouteObject[],
  parentPath: string,
  options: ScanRoutesOptions,
  // Whether the nearest ancestor with a path was excluded (index routes share its URL)
  parentExcluded: boolean,
  indexMeta: IndexMeta,
): CommandItem[] {
  const commands: CommandItem[] = []
  const excludePatterns: ExcludePattern[] = options.noDefaultExclude
    ? (options.exclude ?? [])
    : [...DEFAULT_EXCLUDE, ...(options.exclude ?? [])]

  for (const route of routes) {
    const fullPath = buildPath(parentPath, route.path)
    let excluded = parentExcluded

    // Only create commands for routes with paths (skip layout routes)
    if (route.path !== undefined && route.path !== '') {
      // Skip dynamic routes (:id, [id]) unless explicitly included or has handle.command
      const hasDynamic = /[:[\*]/.test(fullPath)
      const hasCommandMeta = !!route.handle?.command

      // Check if path matches any exclude pattern
      const isExcluded = excludePatterns.some(
        (p) =>
          matchesExcludePattern(fullPath, p) || matchesExcludePattern(route.path ?? '', p),
      )
      excluded = isExcluded

      if (isExcluded) {
        // Still recurse into children — only this path is excluded
      } else if (hasDynamic && !options.includeDynamic && !hasCommandMeta) {
        // Skip dynamic routes — can't navigate to /billing/:uuid without a real ID
        // Unless the route explicitly declares handle.command (user opted in)
      } else {
        commands.push(toCommand(fullPath, route))
      }
    } else if (route.index === true) {
      // An index route renders at its parent's URL ('/' at the root), so it follows
      // the parent's exclusion; mergeIndexRoutes folds it into that URL's item
      const href = fullPath || '/'
      const meta = route.handle?.command
      const isExcluded =
        parentExcluded || excludePatterns.some((p) => matchesExcludePattern(href, p))
      const isSkippedDynamic = /[:[\*]/.test(href) && !options.includeDynamic && !meta

      if (!isExcluded && !isSkippedDynamic) {
        const item = toCommand(href, route)
        indexMeta.set(item, meta)
        commands.push(item)
      }
    }

    // Recurse into children
    if (route.children) {
      commands.push(...scanRoutesInternal(route.children, fullPath, options, excluded, indexMeta))
    }
  }

  return commands
}

function toCommand(fullPath: string, route: RouteObject): CommandItem {
  const meta = route.handle?.command

  return {
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
  }
}

/** handle.command fields, each copied onto the CommandItem field of the same name */
const COMMAND_META_KEYS = [
  'label',
  'description',
  'keywords',
  'group',
  'icon',
  'permissions',
  'priority',
  'hidden',
] as const satisfies readonly (keyof RouteCommandMeta)[]

// Compile-time only: the `satisfies` above rejects an unknown key, and this check
// (applied where the keys are used) names any RouteCommandMeta key the list misses
type MissingCommandMetaKey = Exclude<keyof RouteCommandMeta, (typeof COMMAND_META_KEYS)[number]>
type CommandMetaKeysCheck = [MissingCommandMetaKey] extends [never]
  ? unknown
  : { missingKey: MissingCommandMetaKey }

/**
 * Fold each index route into the item for its URL, wherever that item sits in
 * the tree, so the result does not depend on route order. The index route's
 * handle.command wins; it keeps its own item only when no other route has its URL.
 */
function mergeIndexRoutes(commands: CommandItem[], indexMeta: IndexMeta): CommandItem[] {
  if (indexMeta.size === 0) return commands

  const byHref = new Map<string | undefined, CommandItem>()
  for (const item of commands) {
    if (!indexMeta.has(item)) byHref.set(item.href, item)
  }

  const folded = new Set<CommandItem>()
  for (const [item, meta] of indexMeta) {
    const target = byHref.get(item.href)
    if (!target) {
      byHref.set(item.href, item)
      continue
    }
    folded.add(item)
    for (const key of COMMAND_META_KEYS satisfies CommandMetaKeysCheck) {
      if (meta?.[key] !== undefined) Object.assign(target, { [key]: meta[key] })
    }
  }

  return commands.filter((item) => !folded.has(item))
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
