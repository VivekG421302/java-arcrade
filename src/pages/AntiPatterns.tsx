import { useMemo, useState } from 'react'
import { content } from '../lib/content'
import { Accordion, } from '../components/ui'
import { DiffView, Inline, Markdown } from '../components/content'

const sev: Record<string, string> = { Critical: 'bg-red-500/15 text-red-500', High: 'bg-orange-500/15 text-orange-500', Medium: 'bg-amber-500/15 text-amber-500', Low: 'bg-slate-500/15 text-slate-500' }

export default function AntiPatterns() {
  const [s, setS] = useState('All')
  const [text, setText] = useState('')
  const rows = useMemo(
    () => content.antiMatrix.filter((r) => (s === 'All' || r.severity === s) && `${r.domain} ${r.pattern} ${r.cause} ${r.fix}`.toLowerCase().includes(text.toLowerCase())),
    [s, text]
  )
  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">Code Review Anti-Patterns</h1>
      <h2 className="mt-8 text-xl font-semibold">Deep dives (1–{content.antiPatterns.length})</h2>
      {content.antiPatterns.map((a, i) => (
        <Accordion key={a.n} defaultOpen={i === 0} title={`${a.n}. ${a.title}`}>
          <DiffView bad={a.bad} good={a.good} lang={a.lang} />
          <h3 className="mt-2 font-sans font-semibold">Code review explanation</h3>
          <Markdown md={a.why} />
        </Accordion>
      ))}
      <h2 className="mt-10 text-xl font-semibold">Summary matrix ({content.antiMatrix[0]?.n}–{content.antiMatrix.at(-1)?.n})</h2>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {['All', 'Critical', 'High', 'Medium', 'Low'].map((v) => (
          <button key={v} aria-pressed={s === v} onClick={() => setS(v)} className={`min-h-[44px] rounded-full border px-4 text-sm ${s === v ? 'border-sky-500 bg-sky-500/15 text-sky-500' : 'border-slate-300 dark:border-white/15'}`}>{v}</button>
        ))}
        <input type="search" aria-label="Search anti-patterns" placeholder="Search…" value={text} onChange={(e) => setText(e.target.value)} className="min-h-[44px] flex-1 rounded-md border border-slate-300 bg-transparent px-3 dark:border-white/15" />
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse border-y-2 border-slate-700 text-sm dark:border-slate-300">
          <thead className="border-b border-slate-700 text-left dark:border-slate-300">
            <tr>{['#', 'Domain', 'Anti-pattern', 'Severity', 'Root cause & impact', 'Remediation'].map((h) => <th key={h} className="px-3 py-2">{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.n} className="align-top even:bg-slate-100 dark:even:bg-white/5">
                <td className="px-3 py-2 font-mono">{r.n}</td>
                <td className="px-3 py-2">{r.domain}</td>
                <td className="px-3 py-2"><Inline md={r.pattern} /></td>
                <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-xs ${sev[r.severity] ?? ''}`}>{r.severity}</span></td>
                <td className="px-3 py-2"><Inline md={r.cause} /></td>
                <td className="px-3 py-2"><Inline md={r.fix} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
