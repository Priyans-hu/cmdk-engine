import type { ComparisonRow } from '@/lib/constants'

interface ComparisonTableProps {
  rows: ComparisonRow[]
}

function CellValue({ value }: { value: string | boolean }) {
  if (value === true) {
    return (
      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
        <svg className="w-3 h-3 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </span>
    )
  }
  if (value === false) {
    return (
      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800">
        <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </span>
    )
  }
  return <span className="text-amber-600 dark:text-amber-400 text-xs font-medium">{value}</span>
}

export function ComparisonTable({ rows }: ComparisonTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[var(--bg-secondary)]">
            <th className="text-left px-4 py-3 font-semibold text-[var(--text-primary)]">Feature</th>
            <th className="text-center px-4 py-3 font-semibold text-[var(--text-primary)]">cmdk</th>
            <th className="text-center px-4 py-3 font-semibold text-[var(--text-primary)]">
              <span className="gradient-text">cmdk-engine</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {rows.map((row) => (
            <tr key={row.feature} className="hover:bg-[var(--surface-hover)] transition-colors">
              <td className="px-4 py-3 text-[var(--text-primary)]">{row.feature}</td>
              <td className="px-4 py-3 text-center">
                <div className="flex justify-center">
                  <CellValue value={row.cmdk} />
                </div>
              </td>
              <td className="px-4 py-3 text-center">
                <div className="flex justify-center">
                  <CellValue value={row.cmdkEngine} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
