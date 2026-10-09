import { useCallback, useEffect, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react'
import { Command as Cmdk } from 'cmdk'
import { useCommandPalette } from '../../react/use-command-palette'
import { useEngineContext, usePaletteState } from '../../react/context'
import type { CommandItem, ScoredItem, CommandGroup } from '../../core/types'

// ============================================================
// Types
// ============================================================

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
  /** Additional className for the root Command element */
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
  /** Enable vim-style keybindings (ctrl+n/p/j/k) */
  vimBindings?: boolean
  /** Footer content rendered below the list */
  footer?: ReactNode
}

// ============================================================
// Default renderers
// ============================================================

function DefaultItem({ item }: { item: CommandItem }) {
  const hasChildren = item.children && item.children.length > 0
  return (
    <div data-cmdk-engine-item="">
      {item.icon && <span data-cmdk-engine-icon="" aria-hidden="true">{item.icon}</span>}
      <div data-cmdk-engine-item-content="">
        <span data-cmdk-engine-item-label="">{item.label}</span>
        {item.description && (
          <span data-cmdk-engine-item-description="">{item.description}</span>
        )}
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

// ============================================================
// CommandPalette Component
// ============================================================

/**
 * Pre-wired command palette component using cmdk.
 *
 * Sets `shouldFilter={false}` to let cmdk-engine own all filtering,
 * sorting, and ranking. Solves cmdk issues #264, #280, #375.
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
  vimBindings = true,
  footer,
}: CommandPaletteProps) {
  const {
    search, setSearch, results, isOpen, close, isLoading,
    breadcrumbs, depth, drillUp, select, groupedResults,
  } = useCommandPalette()
  const { t } = useEngineContext()

  // Use i18n for defaults
  const resolvedLabel = label ?? t('palette.label')
  const resolvedPlaceholder = placeholder ?? t('palette.placeholder')
  // Names the results listbox. A `t` without a string for the key, which echoes
  // it (`dictionary[key] ?? key`) or returns '', keeps today's "Suggestions".
  const listLabel = t('palette.list')
  const resolvedListLabel = (listLabel !== 'palette.list' && listLabel) || 'Suggestions'
  const resolvedRenderEmpty = renderEmpty ?? (() => (
    <div data-cmdk-engine-empty="">{t('palette.empty')}</div>
  ))
  const resolvedRenderLoading = renderLoading ?? (() => (
    <div data-cmdk-engine-loading="">{t('palette.loading')}</div>
  ))

  // Handle backspace for nested navigation
  const handleKeyDown = useCallback(
    (e: ReactKeyboardEvent) => {
      if (e.key === 'Backspace' && search === '' && depth > 0) {
        e.preventDefault()
        drillUp()
      }
    },
    [search, depth, drillUp],
  )

  // Auto-select the first enabled item in rendered (grouped) order (solves
  // cmdk #280). Controlled value: snap to firstEnabledId when results change,
  // but allow arrow-key / pointer navigation to update it.
  const rendered = groupedResults.flatMap((g) => g.items)
  const firstEnabledId = rendered.find((r) => !r.item.disabled)?.item.id
  const [activeValue, setActiveValue] = useState<string | undefined>(firstEnabledId)

  // A dialog that (re)opens starts on the first enabled item, not on the last
  // highlight. Adjusted during render (not in an effect) so the old highlight
  // never shows. It also notes what has focus, before the dialog takes it.
  const [wasOpen, setWasOpen] = useState(isOpen)
  const returnFocusTo = useRef<HTMLElement | null>(null)
  if (dialog && isOpen !== wasOpen) {
    setWasOpen(isOpen)
    if (isOpen) {
      setActiveValue(firstEnabledId)
      returnFocusTo.current = document.activeElement as HTMLElement | null
    }
  }

  // cmdk's Dialog has no Radix trigger to return focus to on close, so give it
  // back to what had it before, unless something outside took it meanwhile.
  const dialogRootRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const focused = document.activeElement
    if (!isOpen && (focused === document.body || dialogRootRef.current?.contains(focused))) {
      returnFocusTo.current?.focus({ preventScroll: true })
    }
  }, [isOpen])

  // Fall back to the first enabled item whenever the active id is no longer
  // rendered (e.g. the previously-highlighted item was filtered out mid-list)
  // or is disabled. Computed during render so cmdk always receives a value
  // that exists, or '' when no item is enabled (an undefined value would let
  // cmdk keep its own stale highlight). cmdk trims item values, and with them
  // the values it reports, so ids are compared trimmed.
  const activeValueValid =
    activeValue !== undefined &&
    results.some(
      (r) => String(r.item.id).trim() === String(activeValue).trim() && !r.item.disabled,
    )
  const effectiveValue = (activeValueValid ? activeValue : firstEnabledId) ?? ''

  useEffect(() => {
    if (!activeValueValid) setActiveValue(firstEnabledId)
  }, [activeValueValid, firstEnabledId])

  // groupedResults comes memoized from the hook (was recomputed here on every
  // keystroke / arrow-key render).

  const renderItems = (items: ScoredItem[]) =>
    items.map(({ item, score }) => (
      <Cmdk.Item
        key={item.id}
        value={item.id}
        disabled={item.disabled}
        // The hook's select() drills into children, records frecency and search
        // history, applies onSelect/action/onNavigate/href, and closes. Bound to
        // the item: cmdk reports values trimmed, so they cannot look it up.
        onSelect={() => select(item, { onSelect })}
        className={itemClassName}
        keywords={item.keywords}
      >
        {renderItem ? renderItem(item, score) : <DefaultItem item={item} />}
      </Cmdk.Item>
    ))

  const content = (
    <>
      {depth > 0 && (
        renderBreadcrumbs
          ? renderBreadcrumbs(breadcrumbs, drillUp)
          : <DefaultBreadcrumbs crumbs={breadcrumbs} onBack={drillUp} backLabel={t('breadcrumbs.back')} />
      )}
      <Cmdk.Input
        value={search}
        onValueChange={setSearch}
        placeholder={resolvedPlaceholder}
        className={inputClassName}
        onKeyDown={handleKeyDown}
      />
      <Cmdk.List className={listClassName} label={resolvedListLabel}>
        {results.length === 0 && !isLoading && (
          <Cmdk.Empty className={emptyClassName}>{resolvedRenderEmpty()}</Cmdk.Empty>
        )}
        {groupedResults.map(({ group, items }) => (
          <Cmdk.Group
            key={group.id}
            heading={renderGroupHeading ? renderGroupHeading(group) : group.label}
            value={group.id}
            forceMount
            className={groupClassName}
          >
            {renderItems(items)}
          </Cmdk.Group>
        ))}
        {/* After the groups, so results don't shift while sources load */}
        {isLoading && (
          <Cmdk.Loading label={t('palette.loading')}>{resolvedRenderLoading()}</Cmdk.Loading>
        )}
      </Cmdk.List>
      {footer}
    </>
  )

  if (dialog) {
    return (
      <Cmdk.Dialog
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) close()
        }}
        shouldFilter={false}
        loop={loop}
        label={resolvedLabel}
        className={className}
        disablePointerSelection={disablePointerSelection}
        vimBindings={vimBindings}
        overlayClassName={overlayClassName}
        contentClassName={contentClassName}
        container={container}
        value={effectiveValue}
        onValueChange={setActiveValue}
        ref={dialogRootRef}
      >
        {content}
      </Cmdk.Dialog>
    )
  }

  return (
    <Cmdk
      shouldFilter={false}
      loop={loop}
      label={resolvedLabel}
      className={className}
      disablePointerSelection={disablePointerSelection}
      vimBindings={vimBindings}
      value={effectiveValue}
      onValueChange={setActiveValue}
    >
      {content}
    </Cmdk>
  )
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
 * with Caps Lock on and on non-Latin keyboard layouts. Or pass a function that
 * decides the match itself, modifiers included, such as `(e) => e.key === '/'`.
 * Define it outside the component: a new function re-binds the listener. Either
 * way, holding the keys toggles only once.
 *
 * Must be used within a `<CommandEngineProvider>`.
 */
export function useCommandPaletteShortcut(
  shortcut: string | ((event: KeyboardEvent) => boolean) = 'k',
) {
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
      if (typeof shortcut === 'function' ? shortcut(e) : matchesShortcut(e, shortcut)) {
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
