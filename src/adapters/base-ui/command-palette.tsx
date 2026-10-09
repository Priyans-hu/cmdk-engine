import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { Autocomplete } from '@base-ui/react/autocomplete'
import { Dialog } from '@base-ui/react/dialog'
import { useCommandPalette } from '../../react/use-command-palette'
import { useEngineContext, usePaletteState } from '../../react/context'
import type { CommandItem, ScoredItem, CommandGroup } from '../../core/types'
import type { GroupedResult } from '../../core/grouping'

// ============================================================
// Types
// ============================================================

/**
 * Same props as the cmdk adapter's `CommandPalette`, so switching adapters is an
 * import-path change. `vimBindings` is left out: Base UI has no vim keys.
 */
export interface CommandPaletteProps {
  /** Render function for each command item */
  renderItem?: (item: CommandItem, score: number) => ReactNode
  /** Render function for empty state */
  renderEmpty?: () => ReactNode
  /** Render function for the loading state while async sources load (default: `palette.loading`) */
  renderLoading?: () => ReactNode
  /** Render function for group heading */
  renderGroupHeading?: (group: CommandGroup) => ReactNode
  /** Render function for breadcrumbs (nested commands) */
  renderBreadcrumbs?: (crumbs: CommandItem[], onBack: () => void) => ReactNode
  /** Callback when a command is selected */
  onSelect?: (item: CommandItem) => void
  /** Enable keyboard loop navigation */
  loop?: boolean
  /** Accessible label for the command menu */
  label?: string
  /** Placeholder text for the search input (defaults to i18n value) */
  placeholder?: string
  /** Additional className for the wrapper element */
  className?: string
  /** Additional className for the input element */
  inputClassName?: string
  /** Additional className for the list element */
  listClassName?: string
  /** Additional className for individual items */
  itemClassName?: string
  /** Additional className for group elements */
  groupClassName?: string
  /** Additional className for empty state */
  emptyClassName?: string
  /** Whether to show as dialog (with overlay) */
  dialog?: boolean
  /** Dialog overlay className */
  overlayClassName?: string
  /** Dialog content className */
  contentClassName?: string
  /** Portal container for dialog mode */
  container?: HTMLElement
  /** Disable pointer-based selection */
  disablePointerSelection?: boolean
  /** Footer content rendered below the list */
  footer?: ReactNode
}

// ============================================================
// Default renderers (same markup as the cmdk adapter)
// ============================================================

function DefaultItem({ item }: { item: CommandItem }) {
  const hasChildren = item.children && item.children.length > 0
  return (
    <div data-cmdk-engine-item="">
      {item.icon && (
        <span data-cmdk-engine-icon="" aria-hidden="true">
          {item.icon}
        </span>
      )}
      <div data-cmdk-engine-item-content="">
        <span data-cmdk-engine-item-label="">{item.label}</span>
        {item.description && <span data-cmdk-engine-item-description="">{item.description}</span>}
      </div>
      {item.shortcut && (
        <span data-cmdk-engine-item-shortcut="">
          {item.shortcut.map((key, i) => (
            <kbd key={i}>{key}</kbd>
          ))}
        </span>
      )}
      {hasChildren && (
        <span data-cmdk-engine-item-chevron="" aria-hidden="true">
          ›
        </span>
      )}
    </div>
  )
}

function DefaultBreadcrumbs({
  crumbs,
  onBack,
  backLabel,
}: {
  crumbs: CommandItem[]
  onBack: () => void
  backLabel: string
}) {
  return (
    <div data-cmdk-engine-breadcrumbs="">
      <button
        data-cmdk-engine-breadcrumb-back=""
        onClick={onBack}
        type="button"
        aria-label={backLabel}
      >
        ‹
      </button>
      {crumbs.map((crumb, i) => (
        <span key={crumb.id} data-cmdk-engine-breadcrumb="">
          {i > 0 && (
            <span data-cmdk-engine-breadcrumb-separator="" aria-hidden="true">
              /
            </span>
          )}
          {crumb.label}
        </span>
      ))}
    </div>
  )
}

// Layout effects warn during server rendering on React 18; they never run there.
const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

const visuallyHidden: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
  border: 0,
}

// ============================================================
// CommandPalette Component
// ============================================================

/**
 * Pre-wired command palette component using Base UI's Autocomplete
 * (`mode="none"`, so cmdk-engine owns all filtering, sorting and ranking) and,
 * in dialog mode, Base UI's Dialog.
 *
 * Must be used within a `<CommandEngineProvider>`.
 */
export function CommandPalette({
  renderItem,
  renderEmpty,
  renderLoading,
  renderGroupHeading,
  renderBreadcrumbs,
  onSelect,
  loop = true,
  label,
  placeholder,
  className,
  inputClassName,
  listClassName,
  itemClassName,
  groupClassName,
  emptyClassName,
  dialog = false,
  overlayClassName,
  contentClassName,
  container,
  disablePointerSelection = false,
  footer,
}: CommandPaletteProps) {
  const {
    search,
    setSearch,
    results,
    isOpen,
    close,
    isLoading,
    breadcrumbs,
    depth,
    drillUp,
    select,
    groupedResults,
  } = useCommandPalette()
  const { t } = useEngineContext()
  const inputRef = useRef<HTMLInputElement>(null)

  // Use i18n for defaults
  const resolvedLabel = label ?? t('palette.label')
  const resolvedPlaceholder = placeholder ?? t('palette.placeholder')
  const resolvedRenderEmpty =
    renderEmpty ?? (() => <div data-cmdk-engine-empty="">{t('palette.empty')}</div>)
  const resolvedRenderLoading =
    renderLoading ?? (() => <div data-cmdk-engine-loading="">{t('palette.loading')}</div>)
  const showEmpty = results.length === 0 && !isLoading

  // Base UI keeps the highlighted index when the items change, so each depth gets
  // a fresh Autocomplete (key={depth}) that starts on its first item. The remount
  // replaces the input: refocus the new one after a real depth change (not on
  // mount, so StrictMode never steals focus), unless the dialog is closing.
  const prevDepth = useRef(depth)
  useIsomorphicLayoutEffect(() => {
    if (prevDepth.current !== depth && (isOpen || !dialog)) inputRef.current?.focus()
    prevDepth.current = depth
  }, [depth])

  const body = (
    <div className={className}>
      {depth > 0 &&
        (renderBreadcrumbs ? (
          renderBreadcrumbs(breadcrumbs, drillUp)
        ) : (
          <DefaultBreadcrumbs
            crumbs={breadcrumbs}
            onBack={drillUp}
            backLabel={t('breadcrumbs.back')}
          />
        ))}
      <Autocomplete.Root
        key={depth}
        items={groupedResults}
        value={search}
        // Only typing writes the query; item presses, Escape and clears never do.
        onValueChange={(value, { reason }) => {
          if (reason === 'input-change') setSearch(value)
        }}
        open
        inline
        mode="none"
        autoHighlight="always"
        keepHighlight
        highlightItemOnHover={!disablePointerSelection}
        loopFocus={loop}
        itemToStringValue={(scored) => scored.item.label}
      >
        <Autocomplete.Input
          ref={inputRef}
          aria-label={resolvedLabel}
          placeholder={resolvedPlaceholder}
          className={inputClassName}
          onKeyDown={(e) => {
            // Backspace on an empty query goes up one level
            if (e.key === 'Backspace' && search === '' && depth > 0) {
              e.preventDefault()
              drillUp()
            }
          }}
        />
        {/* Live regions: Empty and Status stay mounted, only their content changes.
            emptyClassName follows the content, as on the cmdk adapter's Empty. */}
        <Autocomplete.Empty className={showEmpty ? emptyClassName : undefined}>
          {showEmpty && resolvedRenderEmpty()}
        </Autocomplete.Empty>
        <Autocomplete.List className={listClassName}>
          {({ group, items }: GroupedResult) => (
            <Autocomplete.Group key={group.id} items={items} className={groupClassName}>
              <Autocomplete.GroupLabel>
                {renderGroupHeading ? renderGroupHeading(group) : group.label}
              </Autocomplete.GroupLabel>
              <Autocomplete.Collection>
                {(scored: ScoredItem) => (
                  <Autocomplete.Item
                    key={scored.item.id}
                    value={scored}
                    disabled={scored.item.disabled}
                    className={itemClassName}
                    onClick={(e) => {
                      // The hook's select() drills down or runs the command and
                      // closes; skip Base UI's own item press.
                      e.preventBaseUIHandler()
                      select(scored.item, { onSelect })
                    }}
                  >
                    {renderItem ? (
                      renderItem(scored.item, scored.score)
                    ) : (
                      <DefaultItem item={scored.item} />
                    )}
                  </Autocomplete.Item>
                )}
              </Autocomplete.Collection>
            </Autocomplete.Group>
          )}
        </Autocomplete.List>
        {/* After the list, so results don't shift while sources load */}
        <Autocomplete.Status>{isLoading && resolvedRenderLoading()}</Autocomplete.Status>
      </Autocomplete.Root>
      {footer}
    </div>
  )

  if (dialog) {
    return (
      <Dialog.Root
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) close()
        }}
      >
        <Dialog.Portal container={container}>
          <Dialog.Backdrop className={overlayClassName} />
          <Dialog.Popup
            aria-label={resolvedLabel}
            className={contentClassName}
            initialFocus={inputRef}
          >
            {body}
            {/* Modal popups need a close button for touch screen reader users */}
            <Dialog.Close style={visuallyHidden}>{t('palette.close')}</Dialog.Close>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    )
  }

  return body
}

// Cmd or Ctrl plus `key`. A letter also matches with Caps Lock on (no Shift) and,
// on non-Latin layouts (a non-ASCII key), by its physical key, but not with Alt:
// AltGr+key types a character on some layouts.
function matchesShortcut(e: KeyboardEvent, key: string) {
  return (
    (e.metaKey || e.ctrlKey) &&
    (e.key === key ||
      (!e.shiftKey &&
        (e.key.toLowerCase() === key ||
          (!e.altKey && e.key > '~' && e.code === 'Key' + key.toUpperCase()))))
  )
}

/**
 * Hook to control the command palette open/close state.
 * Binds Cmd+K / Ctrl+K to toggle it.
 *
 * `shortcut` is the key pressed with Cmd or Ctrl (default `'k'`). It also works
 * with Caps Lock on and on non-Latin keyboard layouts, and holding the keys
 * toggles only once.
 *
 * Must be used within a `<CommandEngineProvider>`.
 */
export function useCommandPaletteShortcut(shortcut = 'k') {
  // Palette state only: the results pipeline runs once, in the palette.
  const { isOpen, setIsOpen, setSearch: setSearchQuery, setActivePath } = usePaletteState()
  // The same toggle as useCommandPalette()'s.
  const toggle = useCallback(() => {
    // Clear query/path when closing; keep setState updaters side-effect free.
    if (isOpen) {
      setSearchQuery('')
      setActivePath([])
    }
    setIsOpen((prev) => !prev)
  }, [isOpen, setIsOpen, setSearchQuery, setActivePath])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (matchesShortcut(e, shortcut)) {
        // Repeats too, or a held Ctrl+K reaches the browser's own shortcut
        e.preventDefault()
        if (!e.repeat) toggle()
      }
    }

    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [shortcut, toggle])

  return { isOpen, toggle }
}
