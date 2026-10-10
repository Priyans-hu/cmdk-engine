'use client'

import { useSyncExternalStore } from 'react'
import { usePaletteState } from 'cmdk-engine/react'

const subscribe = () => () => {}
const shortcut = () => (/Mac|iPhone|iPad/.test(navigator.userAgent) ? '⌘K' : 'Ctrl K')

/** Opens the live demo palette; the only way in on touch devices. */
export function SearchButton() {
  const { setIsOpen } = usePaletteState()
  // null on the server and while hydrating, so the first render matches the HTML.
  const label = useSyncExternalStore(subscribe, shortcut, () => null)

  return (
    <button
      type="button"
      onClick={() => setIsOpen(true)}
      aria-label="Search the docs"
      data-testid="docs-search-open-btn"
      className="flex items-center gap-2 px-2 sm:px-3 py-2 sm:py-1.5 rounded-lg sm:border border-[var(--border)] text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
    >
      <svg
        className="w-4 h-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z"
        />
      </svg>
      <span className="hidden sm:inline">Search</span>
      {label && (
        <kbd className="hidden sm:inline font-sans text-xs text-[var(--text-muted)]">{label}</kbd>
      )}
    </button>
  )
}
