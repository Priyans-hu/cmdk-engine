import { Hero } from '@/components/hero'
import { FeatureCard } from '@/components/feature-card'
import { ComparisonTable } from '@/components/comparison-table'
import { FEATURES, COMPARISON } from '@/lib/constants'

export default function Home() {
  return (
    <>
      <Hero />

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-16">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4 tracking-tight">
          Everything your command palette needs
        </h2>
        <p className="text-center text-[var(--text-secondary)] mb-12 max-w-xl mx-auto">
          cmdk gives you beautiful primitives. cmdk-engine adds the brain.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </div>
      </section>

      {/* Comparison */}
      <section className="mx-auto max-w-3xl px-4 sm:px-6 py-16">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4 tracking-tight">
          cmdk vs cmdk-engine
        </h2>
        <p className="text-center text-[var(--text-secondary)] mb-8 max-w-xl mx-auto">
          Keep cmdk&apos;s composable UI. Upgrade the brain behind it.
        </p>
        <ComparisonTable rows={COMPARISON} />
      </section>

      {/* Architecture */}
      <section className="mx-auto max-w-3xl px-4 sm:px-6 py-16">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8 tracking-tight">
          Architecture
        </h2>
        <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[#0f172a] p-6 text-sm font-mono text-slate-300 leading-relaxed">
          <pre>{`Route Config ─→ Route Adapter ─→ Command Registry ─→ Keyword Engine
                                       │
                                       ├─→ Access Control Filter
                                       │
                                       ├─→ Search Engine (fuzzy / match-sorter)
                                       │
                                       └─→ Frecency Ranking
                                              │
                                              ▼
                                      Headless API / Hooks
                                              │
                                              ▼
                                      UI Adapter (cmdk)`}</pre>
        </div>
      </section>

      {/* Entry points */}
      <section className="mx-auto max-w-3xl px-4 sm:px-6 pb-20">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8 tracking-tight">
          Package Entry Points
        </h2>
        <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--bg-secondary)]">
                <th className="text-left px-4 py-3 font-semibold">Import</th>
                <th className="text-left px-4 py-3 font-semibold">Size</th>
                <th className="text-left px-4 py-3 font-semibold">Purpose</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              <tr className="hover:bg-[var(--surface-hover)] transition-colors">
                <td className="px-4 py-3 font-mono text-accent dark:text-accent-dark text-xs">cmdk-engine</td>
                <td className="px-4 py-3 text-[var(--text-secondary)]">~2.3 KB</td>
                <td className="px-4 py-3 text-[var(--text-secondary)]">Core engine (types, registry, search, keywords, access control, frecency)</td>
              </tr>
              <tr className="hover:bg-[var(--surface-hover)] transition-colors">
                <td className="px-4 py-3 font-mono text-accent dark:text-accent-dark text-xs">cmdk-engine/react</td>
                <td className="px-4 py-3 text-[var(--text-secondary)]">~2.6 KB</td>
                <td className="px-4 py-3 text-[var(--text-secondary)]">React hooks (provider, useCommandPalette, useCommandRegister)</td>
              </tr>
              <tr className="hover:bg-[var(--surface-hover)] transition-colors">
                <td className="px-4 py-3 font-mono text-accent dark:text-accent-dark text-xs">cmdk-engine/adapters/cmdk</td>
                <td className="px-4 py-3 text-[var(--text-secondary)]">~1.4 KB</td>
                <td className="px-4 py-3 text-[var(--text-secondary)]">Pre-wired cmdk components</td>
              </tr>
              <tr className="hover:bg-[var(--surface-hover)] transition-colors">
                <td className="px-4 py-3 font-mono text-accent dark:text-accent-dark text-xs">cmdk-engine/adapters/react-router</td>
                <td className="px-4 py-3 text-[var(--text-secondary)]">~2.0 KB</td>
                <td className="px-4 py-3 text-[var(--text-secondary)]">React Router v6/v7 route scanner</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-center text-sm text-[var(--text-muted)] mt-4">
          All entry points are tree-shakeable. The core has zero runtime dependencies.
        </p>
      </section>
    </>
  )
}
