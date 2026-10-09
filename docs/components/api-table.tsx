import type { ReactNode } from 'react'

interface ApiTableProps {
  /** Column headings, in order */
  head: string[]
  /** One array of cells per row. Cells can be text or elements such as `<code>` */
  rows: ReactNode[][]
}

/** A reference table. The first column is a monospace name; other cells can hold `<code>`. */
export function ApiTable({ head, rows }: ApiTableProps) {
  return (
    <div className="not-prose my-4 overflow-x-auto rounded-xl border border-[var(--border)] [&_code]:rounded [&_code]:bg-slate-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs dark:[&_code]:bg-slate-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[var(--bg-secondary)]">
            {head.map((label) => (
              <th key={label} className="px-4 py-3 text-left font-semibold">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td
                  key={j}
                  className={`px-4 py-3 align-top ${
                    j === 0 ? 'font-mono text-xs' : 'text-[var(--text-secondary)]'
                  }`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
