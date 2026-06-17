/**
 * Next.js (App Router) adapter for cmdk-engine.
 *
 * Wires `next/navigation`'s `useRouter` into the command engine
 * so routes scanned by the CLI (`cmdk-engine scan`) become
 * navigable command items with optional hover prefetch.
 *
 * Usage:
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

export { useNextNavigate, useNextPrefetch } from './use-next-navigate'
export { useNextCommandRoutes } from './use-next-command-routes'
export { usePrefetchOnHover } from './use-prefetch-on-hover'
export { NextCommandRoutes } from './next-command-routes'
export type { NextCommandRoutesProps } from './next-command-routes'
export type {
  NextRouteLike,
  NextRoutesInput,
  NextNavigateFn,
  NextPrefetchFn,
  UseNextCommandRoutesOptions,
} from './types'
