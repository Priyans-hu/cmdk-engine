import { useEffect, useRef } from 'react'
import type { CommandItem } from '../core/types'
import { useEngineContext } from './context'

/**
 * Register commands from within a component.
 * Commands are automatically unregistered when the component unmounts.
 *
 * @param commands - Commands to register
 * @param deps - Dependency array (re-registers when deps change)
 *
 * @example
 * ```tsx
 * function BillingPage() {
 *   useCommandRegister([
 *     { id: 'buy-credits', label: 'Buy Credits', action: () => openModal() },
 *   ])
 *   return <div>...</div>
 * }
 * ```
 */
export function useCommandRegister(
  commands: CommandItem[],
  deps: unknown[] = [],
): void {
  const { registry } = useEngineContext()
  const cleanupRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    // Clean up previous registration
    cleanupRef.current?.()

    // Register new commands
    cleanupRef.current = registry.registerMany(commands)

    // Cleanup on unmount or dep change
    return () => {
      cleanupRef.current?.()
      cleanupRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}
