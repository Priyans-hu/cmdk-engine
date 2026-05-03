import { useCallback } from 'react'
import type { MouseEvent } from 'react'
import { useNextPrefetch } from './use-next-navigate'

/**
 * Returns an `onMouseEnter` handler factory that prefetches a route.
 *
 * @example
 * ```tsx
 * const onHover = usePrefetchOnHover()
 * <button onMouseEnter={onHover('/billing')}>Billing</button>
 * ```
 */
export function usePrefetchOnHover() {
  const prefetch = useNextPrefetch()

  return useCallback(
    (href: string) => (_e: MouseEvent<HTMLElement>) => {
      prefetch(href)
    },
    [prefetch],
  )
}
