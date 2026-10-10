'use client'

import type { CommandItem } from 'cmdk-engine'
import { useEngineContext } from 'cmdk-engine/react'
import { CommandPalette as Palette, useCommandPaletteShortcut } from 'cmdk-engine/adapters/base-ui'
import type { CommandPaletteProps } from 'cmdk-engine/adapters/base-ui'

import { cn } from '@/lib/utils'

function Item({ item }: { item: CommandItem }) {
  return (
    <>
      {item.icon != null && (
        <span className="flex size-4 shrink-0 items-center justify-center text-muted-foreground">
          {item.icon}
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate">{item.label}</span>
        {typeof item.description === 'string' && (
          <span className="truncate text-xs text-muted-foreground">{item.description}</span>
        )}
      </span>
      {Array.isArray(item.shortcut) && (
        <kbd className="ml-auto font-sans text-xs tracking-widest text-muted-foreground">
          {item.shortcut.join('')}
        </kbd>
      )}
      {item.children?.length ? (
        <span aria-hidden="true" className="text-muted-foreground">
          ›
        </span>
      ) : null}
    </>
  )
}

/**
 * A Cmd+K / Ctrl+K command palette in your shadcn/ui theme, run by cmdk-engine and
 * rendered with Base UI. Render it once, anywhere inside <CommandEngineProvider>
 * from cmdk-engine/react, and give your app's root element `isolation: isolate`.
 */
export function CommandPalette({ contentClassName, ...props }: CommandPaletteProps) {
  useCommandPaletteShortcut()
  const { t } = useEngineContext()
  return (
    <Palette
      dialog
      overlayClassName="fixed inset-0 z-50 bg-black/50"
      contentClassName={cn(
        'fixed left-1/2 top-1/4 z-50 w-full max-w-[calc(100%-2rem)] -translate-x-1/2 overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-lg sm:max-w-lg',
        contentClassName,
      )}
      inputClassName="h-12 w-full border-b bg-transparent px-4 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring"
      listClassName="max-h-80 scroll-py-1 overflow-y-auto p-1 empty:hidden"
      itemClassName="flex cursor-default select-none items-center gap-2 rounded-lg px-2 py-1.5 text-sm outline-none data-[disabled]:pointer-events-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[disabled]:opacity-50"
      emptyClassName="py-6 text-center text-sm text-muted-foreground"
      renderItem={(item) => <Item item={item} />}
      renderGroupHeading={(group) => (
        <span className="block px-2 py-1.5 text-xs font-medium text-muted-foreground">
          {group.label}
        </span>
      )}
      renderLoading={() => (
        <div className="py-6 text-center text-sm text-muted-foreground">{t('palette.loading')}</div>
      )}
      renderBreadcrumbs={(crumbs, onBack) => (
        <div className="flex items-center gap-1 px-3 pt-3 text-xs text-muted-foreground">
          <button
            type="button"
            onClick={onBack}
            aria-label={t('breadcrumbs.back')}
            className="rounded px-1 hover:bg-accent hover:text-accent-foreground"
          >
            ‹
          </button>
          {crumbs.map((crumb) => crumb.label).join(' / ')}
        </div>
      )}
      {...props}
    />
  )
}
