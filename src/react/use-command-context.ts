import { useEngineContext } from './context'
import type { CommandContext } from '../core/types'

/**
 * Hook to access context-related engine features.
 * Returns the current context config and the context engine for custom boosting.
 *
 * Note: To update context, pass it via the `config.context` prop on
 * `<CommandEngineProvider>`. This hook provides read access.
 */
export function useCommandContext(): {
  context: CommandContext | undefined
  boostWeight: number | undefined
} {
  const { config } = useEngineContext()

  return {
    context: config.context,
    boostWeight: config.contextBoostWeight,
  }
}
