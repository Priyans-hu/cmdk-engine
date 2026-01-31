'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Sidebar } from './sidebar'
import { DOCS_ORDER } from '@/lib/constants'

export function DocsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const currentIndex = DOCS_ORDER.findIndex((item) => item.href === pathname)
  const prev = currentIndex > 0 ? DOCS_ORDER[currentIndex - 1] : null
  const next = currentIndex < DOCS_ORDER.length - 1 ? DOCS_ORDER[currentIndex + 1] : null

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 lg:py-12">
      <div className="flex gap-12">
        <Sidebar />
        <main className="min-w-0 flex-1">
          <article className="prose prose-slate dark:prose-invert max-w-none
            prose-headings:scroll-mt-20
            prose-h1:text-3xl prose-h1:font-bold prose-h1:tracking-tight
            prose-h2:text-xl prose-h2:font-semibold prose-h2:mt-10 prose-h2:border-b prose-h2:border-[var(--border)] prose-h2:pb-2
            prose-h3:text-lg prose-h3:font-semibold prose-h3:mt-8
            prose-a:text-accent prose-a:dark:text-accent-dark prose-a:no-underline prose-a:hover:underline
            prose-code:before:content-none prose-code:after:content-none
            prose-code:bg-slate-100 prose-code:dark:bg-slate-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono
            prose-pre:bg-transparent prose-pre:p-0
            prose-table:text-sm
            prose-th:text-left prose-th:font-semibold prose-th:text-[var(--text-primary)]
            prose-td:text-[var(--text-secondary)]
          ">
            {children}
          </article>

          {/* Prev / Next navigation */}
          {(prev || next) && (
            <div className="mt-12 pt-6 border-t border-[var(--border)] flex justify-between gap-4">
              {prev ? (
                <Link
                  href={prev.href}
                  className="group flex flex-col items-start gap-1 p-4 rounded-xl border border-[var(--border)] hover:border-accent/50 transition-colors flex-1"
                >
                  <span className="text-xs text-[var(--text-muted)] group-hover:text-accent transition-colors">Previous</span>
                  <span className="text-sm font-medium text-[var(--text-primary)]">{prev.label}</span>
                </Link>
              ) : <div />}
              {next ? (
                <Link
                  href={next.href}
                  className="group flex flex-col items-end gap-1 p-4 rounded-xl border border-[var(--border)] hover:border-accent/50 transition-colors flex-1"
                >
                  <span className="text-xs text-[var(--text-muted)] group-hover:text-accent transition-colors">Next</span>
                  <span className="text-sm font-medium text-[var(--text-primary)]">{next.label}</span>
                </Link>
              ) : <div />}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
