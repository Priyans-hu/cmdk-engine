import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { NextNavigateFn, NextPrefetchFn } from './types'

/**
 * Hook that returns a memoized navigate function bound to the
 * Next.js App Router. Use this inside command `action` callbacks
 * for SPA navigation that participates in App Router caching.
 *
 * @example
 * ```tsx
 * 'use client'
 * import { useNextNavigate } from 'cmdk-engine/nextjs'
 *
 * function CommandsBootstrap() {
 *   const navigate = useNextNavigate()
 *   useCommandRegister([
 *     {
 *       id: 'go-billing',
 *       label: 'Billing',
 *       action: () => navigate('/billing'),
 *     },
 *   ])
 *   return null
 * }
 * ```
 */
export function useNextNavigate(): NextNavigateFn {
  const router = useRouter()

  return useCallback<NextNavigateFn>(
    (href, options) => {
      if (options?.replace) {
        router.replace(href, { scroll: options.scroll })
      } else {
        router.push(href, { scroll: options?.scroll })
      }
    },
    [router],
  )
}

/**
 * Hook that returns a memoized prefetch function for the App Router.
 * Useful for hover-prefetch on command items so navigation feels
 * instant when the user actually selects a command.
 *
 * @example
 * ```tsx
 * const prefetch = useNextPrefetch()
 * <button onMouseEnter={() => prefetch('/billing')}>Billing</button>
 * ```
 */
export function useNextPrefetch(): NextPrefetchFn {
  const router = useRouter()

  return useCallback<NextPrefetchFn>(
    (href) => {
      router.prefetch(href)
    },
    [router],
  )
}
