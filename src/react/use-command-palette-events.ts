import { useContext, useEffect, useRef } from 'react'
import type { CommandItem, CommandPaletteEvent } from '../core/types'
import { useEngineContext, usePaletteState } from './context'
import type { EngineInternals } from './context'
import { ASYNC_SOURCE, AsyncSourcesContext } from './async-sources'

type Handler = (event: CommandPaletteEvent) => void

/**
 * Report palette events to `onEvent`, for analytics such as how often the
 * palette opens or which queries find nothing. See `CommandPaletteEvent`.
 *
 * Call it once, in any component inside `<CommandEngineProvider>`; without it,
 * no events are reported. The latest `onEvent` is always called, so it can be
 * an inline function. It never changes what the palette does: an error thrown
 * by `onEvent` is rethrown on a timer, where it reaches the console and error
 * trackers, while the palette carries on.
 *
 * @example
 * ```tsx
 * function PaletteAnalytics() {
 *   useCommandPaletteEvents((event) => {
 *     if (event.type === 'search' && event.resultCount === 0) {
 *       analytics.track('palette_no_results', { query: event.query })
 *     }
 *   })
 *   return null
 * }
 * ```
 */
export function useCommandPaletteEvents(onEvent: Handler): void {
  const { observer } = useEngineContext('useCommandPaletteEvents') as EngineInternals
  const { isOpen, search } = usePaletteState()
  const { isLoading, errors } = useContext(AsyncSourcesContext)
  const handler = useRef(onEvent)
  handler.current = onEvent
  const seen = useRef({ isOpen, query: '', errors })
  const emit = (event: CommandPaletteEvent) => report(handler.current, event)

  useEffect(() => {
    observer.onSelected = (item: CommandItem, query: string) =>
      emit({
        type: 'select',
        item,
        query,
        sourceId: (item as { [ASYNC_SOURCE]?: string })[ASYNC_SOURCE],
      })
    return () => {
      observer.onSelected = undefined
    }
  }, [observer])

  // Compares with what was last reported, so a re-render reports nothing new.
  useEffect(() => {
    const last = seen.current
    if (last.isOpen !== isOpen) {
      last.isOpen = isOpen
      emit({ type: isOpen ? 'open' : 'close' })
    }
    // A query is reported once its results have settled (no source loading).
    const query = search.trim()
    if (!isLoading && last.query !== query) {
      last.query = query
      if (query) {
        emit({ type: 'search', query, resultCount: observer.count ?? 0 })
      }
    }
    for (const id in errors) {
      if (errors[id] !== last.errors[id]) {
        emit({ type: 'asyncError', sourceId: id, error: errors[id] })
      }
    }
    last.errors = errors
  })
}

function report(handler: Handler, event: CommandPaletteEvent): void {
  try {
    handler(event)
  } catch (error) {
    setTimeout(() => {
      throw error
    })
  }
}
