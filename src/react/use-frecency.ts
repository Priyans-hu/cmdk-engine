import { useCallback } from 'react'
import { useEngineContext } from './context'

/**
 * Hook to interact with the frecency engine directly.
 *
 * @returns Object with recordUsage, getScore, and clear functions
 */
export function useFrecency() {
  const { frecency } = useEngineContext()

  const recordUsage = useCallback(
    (commandId: string) => frecency.recordUsage(commandId),
    [frecency],
  )

  const getScore = useCallback(
    (commandId: string) => frecency.getScore(commandId),
    [frecency],
  )

  const clear = useCallback(() => frecency.clear(), [frecency])

  return { recordUsage, getScore, clear }
}
