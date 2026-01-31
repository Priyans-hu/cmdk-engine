import Link from 'next/link'
import { SITE } from '@/lib/constants'

export function Footer() {
  return (
    <footer className="border-t border-[var(--border)] bg-[var(--bg-secondary)]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
          {/* Product */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">
              Product
            </p>
            <ul className="space-y-2">
              <li>
                <Link href="/docs/getting-started" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                  Getting Started
                </Link>
              </li>
              <li>
                <Link href="/docs/api" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                  API Reference
                </Link>
              </li>
              <li>
                <Link href="/docs/examples" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                  Examples
                </Link>
              </li>
            </ul>
          </div>

          {/* Community */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">
              Community
            </p>
            <ul className="space-y-2">
              <li>
                <a href={SITE.github} target="_blank" rel="noopener noreferrer" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                  GitHub
                </a>
              </li>
              <li>
                <a href={SITE.npm} target="_blank" rel="noopener noreferrer" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                  npm
                </a>
              </li>
              <li>
                <a href={`${SITE.github}/issues`} target="_blank" rel="noopener noreferrer" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                  Issues
                </a>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">
              Resources
            </p>
            <ul className="space-y-2">
              <li>
                <a href="https://cmdk.paco.me" target="_blank" rel="noopener noreferrer" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                  cmdk
                </a>
              </li>
              <li>
                <a href={`${SITE.github}/blob/main/CONTRIBUTING.md`} target="_blank" rel="noopener noreferrer" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                  Contributing
                </a>
              </li>
              <li>
                <a href={`${SITE.github}/blob/main/LICENSE`} target="_blank" rel="noopener noreferrer" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                  MIT License
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-[var(--border)] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-[var(--text-muted)]">
            Built by{' '}
            <a href="https://github.com/Priyans-hu" target="_blank" rel="noopener noreferrer" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
              Priyanshu
            </a>
          </p>
          <p className="text-sm text-[var(--text-muted)]">
            Open source under MIT License
          </p>
        </div>
      </div>
    </footer>
  )
}
