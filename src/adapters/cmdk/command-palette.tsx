import React, { useCallback, useEffect, useState } from 'react'
import { Command as Cmdk } from 'cmdk'
import { useCommandPalette } from '../../react/use-command-palette'
import { useEngineContext } from '../../react/context'
import type { CommandItem, ScoredItem, CommandGroup } from '../../core/types'

// ============================================================
// Types
// ============================================================

export interface CommandPaletteProps {
  /** Render function for each command item */
  renderItem?: (item: CommandItem, score: number) => React.ReactNode
  /** Render function for empty state */
  renderEmpty?: () => React.ReactNode
  /** Render function for loading state */
  renderLoading?: () => React.ReactNode
  /** Render function for group heading */
  renderGroupHeading?: (group: CommandGroup) => React.ReactNode
  /** Render function for breadcrumbs (nested commands) */
  renderBreadcrumbs?: (crumbs: CommandItem[], onBack: () => void) => React.ReactNode
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
  footer?: React.ReactNode
}

// ============================================================
// Default renderers
// ============================================================

function DefaultItem({ item }: { item: CommandItem }) {
  const hasChildren = item.children && item.children.length > 0
  return (
    <div data-cmdk-engine-item="">
      {item.icon && <span data-cmdk-engine-icon="">{item.icon}</span>}
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

function DefaultBreadcrumbs({ crumbs, onBack }: { crumbs: CommandItem[]; onBack: () => void }) {
  return (
    <div data-cmdk-engine-breadcrumbs="">
      <button data-cmdk-engine-breadcrumb-back="" onClick={onBack} type="button">
        ‹
      </button>
      {crumbs.map((crumb, i) => (
        <span key={crumb.id} data-cmdk-engine-breadcrumb="">
          {i > 0 && <span data-cmdk-engine-breadcrumb-separator="">/</span>}
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
  label = 'Command palette',
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
  const resolvedPlaceholder = placeholder ?? t('palette.placeholder')
  const resolvedRenderEmpty = renderEmpty ?? (() => (
    <div data-cmdk-engine-empty="">{t('palette.empty')}</div>
  ))

  const handleSelect = useCallback(
    (value: string) => {
      const scored = results.find((r) => r.item.id === value)
      if (!scored) return
      // Delegate to the hook's select(): it drills into children, records
      // frecency + search history, applies onSelect/action/onNavigate/href,
      // and closes. The component-level onSelect prop takes priority.
      select(scored.item, { onSelect })
    },
    [results, select, onSelect],
  )

  // Handle backspace for nested navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Backspace' && search === '' && depth > 0) {
        e.preventDefault()
        drillUp()
      }
    },
    [search, depth, drillUp],
  )

  // Auto-select first item when results change (solves cmdk #280)
  // Controlled value: snap to firstItemId when results change, but allow
  // arrow-key / pointer navigation to update it.
  const firstItemId = results[0]?.item.id
  const [activeValue, setActiveValue] = useState<string | undefined>(firstItemId)

  useEffect(() => {
    // Reset to first item whenever the result set changes.
    setActiveValue(firstItemId)
  }, [firstItemId])

  // groupedResults comes memoized from the hook (was recomputed here on every
  // keystroke / arrow-key render).

  const renderItems = (items: ScoredItem[]) =>
    items.map(({ item, score }) => (
      <Cmdk.Item
        key={item.id}
        value={item.id}
        disabled={item.disabled}
        onSelect={handleSelect}
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
          : <DefaultBreadcrumbs crumbs={breadcrumbs} onBack={drillUp} />
      )}
      <Cmdk.Input
        value={search}
        onValueChange={setSearch}
        placeholder={resolvedPlaceholder}
        className={inputClassName}
        onKeyDown={handleKeyDown}
      />
      <Cmdk.List className={listClassName}>
        {isLoading && renderLoading && (
          <Cmdk.Loading>{renderLoading()}</Cmdk.Loading>
        )}
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
        label={label}
        className={className}
        disablePointerSelection={disablePointerSelection}
        vimBindings={vimBindings}
        overlayClassName={overlayClassName}
        contentClassName={contentClassName}
        container={container}
        value={activeValue}
        onValueChange={setActiveValue}
      >
        {content}
      </Cmdk.Dialog>
    )
  }

  return (
    <Cmdk
      shouldFilter={false}
      loop={loop}
      label={label}
      className={className}
      disablePointerSelection={disablePointerSelection}
      vimBindings={vimBindings}
      value={activeValue}
      onValueChange={setActiveValue}
    >
      {content}
    </Cmdk>
  )
}

/**
 * Hook to control the command palette open/close state.
 * Provides keyboard shortcut binding (Cmd+K / Ctrl+K).
 *
 * Must be used within a `<CommandEngineProvider>`.
 */
export function useCommandPaletteShortcut(shortcut = 'k') {
  const { isOpen, toggle } = useCommandPalette()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === shortcut && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        toggle()
      }
    }

    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [shortcut, toggle])

  return { isOpen, toggle }
}
