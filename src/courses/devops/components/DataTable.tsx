import type { ComparisonTable } from '../types'

/** Responsive comparison table: scrolls sideways inside its own box so the page never does. */
export default function DataTable({ table, compact = false }: { table: ComparisonTable; compact?: boolean }) {
  return (
    <figure className="my-4">
      <figcaption className="mb-2">
        <span className="font-semibold">{table.title}</span>
        {table.description && <span className="mt-0.5 block text-sm text-slate-500 dark:text-slate-400">{table.description}</span>}
      </figcaption>
      <div className="overflow-x-auto rounded-lg ring-1 ring-slate-200 dark:ring-white/10">
        <table className={`w-full min-w-[32rem] border-collapse text-left ${compact ? 'text-xs' : 'text-sm'}`}>
          <thead className="bg-slate-100 dark:bg-white/5">
            <tr>{table.columns.map((c) => <th key={c} scope="col" className="px-3 py-2 font-semibold">{c}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-white/10">
            {table.rows.map((r, i) => (
              <tr key={i} className="align-top">
                {r.map((cell, j) => j === 0
                  ? <th key={j} scope="row" className="px-3 py-2 font-medium">{cell}</th>
                  : <td key={j} className="px-3 py-2 text-slate-700 dark:text-slate-300">{cell}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  )
}
