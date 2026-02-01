import React, { useCallback, useEffect, useRef } from 'react'
import { Command as Cmdk } from 'cmdk'
import { useCommandPalette } from '../../react/use-command-palette'
import { useEngineContext } from '../../react/context'
import type { CommandItem, ScoredItem, CommandGroup } from '../../core/types'
import type { GroupedResults } from '../../core/grouping'

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
  /** Callback when a command is selected */
  onSelect?: (item: CommandItem) => void
  /** Enable keyboard loop navigation */
  loop?: boolean
  /** Accessible label for the command menu */
  label?: string
  /** Placeholder text for the search input */
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
    </div>
  )
}

function DefaultEmpty() {
  return <div data-cmdk-engine-empty="">No results found.</div>
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
  renderEmpty = DefaultEmpty,
  renderLoading,
  renderGroupHeading,
  onSelect,
  loop = true,
  label = 'Command palette',
  placeholder = 'Type a command or search...',
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
  const { search, setSearch, results, isOpen, close, recordUsage, isLoading } =
    useCommandPalette()
  const { groupManager } = useEngineContext()

  const { onSelect: configOnSelect } = useEngineContext().config

  const handleSelect = useCallback(
    (value: string) => {
      const item = results.find((r) => r.item.id === value)?.item
      if (!item) return

      recordUsage(item.id)

      if (onSelect) {
        onSelect(item)
      } else if (configOnSelect) {
        configOnSelect(item)
      } else if (item.action) {
        item.action(item)
      } else if (item.href) {
        // Navigate if no custom onSelect or action
        window.location.href = item.href
      }

      close()
    },
    [results, recordUsage, onSelect, configOnSelect, close],
  )

  // Auto-select first item when results change (solves cmdk #280)
  const firstItemId = results[0]?.item.id
  const valueRef = useRef(firstItemId)

  useEffect(() => {
    valueRef.current = firstItemId
  }, [firstItemId])

  // Group results for rendering
  const groupedResults: GroupedResults = groupManager.groupResults(results)

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
      <Cmdk.Input
        value={search}
        onValueChange={setSearch}
        placeholder={placeholder}
        className={inputClassName}
      />
      <Cmdk.List className={listClassName}>
        {isLoading && renderLoading && (
          <Cmdk.Loading>{renderLoading()}</Cmdk.Loading>
        )}
        {results.length === 0 && !isLoading && (
          <Cmdk.Empty className={emptyClassName}>{renderEmpty()}</Cmdk.Empty>
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
        onOpenChange={(open) => (open ? open : close())}
        shouldFilter={false}
        loop={loop}
        label={label}
        className={className}
        disablePointerSelection={disablePointerSelection}
        vimBindings={vimBindings}
        overlayClassName={overlayClassName}
        contentClassName={contentClassName}
        container={container}
        value={firstItemId}
        onValueChange={() => {}}
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
      value={firstItemId}
      onValueChange={() => {}}
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
