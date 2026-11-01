import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { content, type LcQuestion } from '../lib/content'
import { Accordion } from '../components/ui'
import { CodeBlock, Inline } from '../components/content'

const diffColor: Record<string, string> = { Easy: 'text-emerald-500 bg-emerald-500/10', Medium: 'text-amber-500 bg-amber-500/10', Hard: 'text-red-500 bg-red-500/10' }
const cats = Array.from(new Set(content.questions.map((q) => q.category)))
const PAGE = 30

function Label({ children }: { children: string }) {
  return <h3 className="mb-2 mt-6 font-sans text-xs font-semibold uppercase tracking-wider text-slate-500 first:mt-1">{children}</h3>
}

// Plain text unless the cell already contains inline code (avoids markdown eating `_` or `*`).
const Cell = ({ t }: { t: string }) => (t.includes('`') ? <Inline md={t} /> : <>{t}</>)

function QuestionBody({ q }: { q: LcQuestion }) {
  const [show, setShow] = useState(false)
  return (
    <div>
      <Label>Problem</Label>
      <p className="max-w-[72ch] font-serif leading-7"><Inline md={q.statement} /></p>

      <Label>Test cases</Label>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border-y-2 border-slate-700 text-sm dark:border-slate-300">
          <thead className="border-b border-slate-700 text-left dark:border-slate-300">
            <tr><th className="px-3 py-2">Input</th><th className="px-3 py-2">Expected output</th></tr>
          </thead>
          <tbody>
            {q.tests.map((t, i) => (
              <tr key={i} className="align-top even:bg-slate-100 dark:even:bg-white/5">
                <td className="px-3 py-2 font-mono text-[13px]"><Cell t={t.input} /></td>
                <td className="px-3 py-2 font-mono text-[13px]"><Cell t={t.output} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Label>Expected complexity</Label>
      <p className="font-serif leading-7"><Inline md={q.target} /></p>

      <button type="button" aria-expanded={show} onClick={() => setShow(!show)}
        className="mt-6 inline-flex min-h-[44px] items-center gap-2 rounded-md border border-slate-400 px-4 text-sm font-medium hover:bg-slate-100 dark:hover:bg-white/5">
        {show ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
        {show ? 'Hide Java solution' : 'Show Java solution'}
      </button>

      {show && (
        <div>
          <Label>Approach</Label>
          <p className="max-w-[72ch] font-serif leading-7"><Inline md={q.approach} /></p>
          {q.defs && (
            <>
              <Label>Given class</Label>
              <CodeBlock code={q.defs} lang="java" />
            </>
          )}
          <Label>Java solution</Label>
          <CodeBlock code={q.code} lang="java" />
        </div>
      )}
    </div>
  )
}

export default function QuestionBank() {
  const [sp, setSp] = useSearchParams()
  const cat = sp.get('cat') || 'All'
  const [diff, setDiff] = useState('All')
  const [text, setText] = useState('')
  const [limit, setLimit] = useState(PAGE)
  const list = useMemo(() => {
    const t = text.toLowerCase()
    return content.questions.filter(
      (q) => (cat === 'All' || q.category === cat) && (diff === 'All' || q.difficulty === diff) && `${q.title} ${q.statement}`.toLowerCase().includes(t)
    )
  }, [cat, diff, text])
  const chip = (on: boolean) => `min-h-[44px] rounded-full border px-4 text-sm ${on ? 'border-sky-500 bg-sky-500/15 text-sky-500' : 'border-slate-300 dark:border-white/15'}`
  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">Question Bank</h1>
      <p className="mt-1 font-serif text-slate-600 dark:text-slate-400">{list.length} of {content.questions.length} problems. Open one to read the problem and test cases, then reveal the Java solution when you are ready.</p>
      <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Filter by category">
        {['All', ...cats].map((c) => (
          <button key={c} aria-pressed={cat === c} className={chip(cat === c)} onClick={() => { setSp(c === 'All' ? {} : { cat: c }); setLimit(PAGE) }}>{c}</button>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {['All', 'Easy', 'Medium', 'Hard'].map((d) => <button key={d} aria-pressed={diff === d} className={chip(diff === d)} onClick={() => { setDiff(d); setLimit(PAGE) }}>{d}</button>)}
        <input type="search" aria-label="Search questions" placeholder="Search…" value={text} onChange={(e) => { setText(e.target.value); setLimit(PAGE) }}
          className="min-h-[44px] flex-1 rounded-md border border-slate-300 bg-transparent px-3 dark:border-white/15" />
      </div>
      <div className="mt-6">
        {list.slice(0, limit).map((q) => (
          <Accordion key={q.n} title={<span><span className="mr-2 font-mono text-sm text-slate-500">{q.n}.</span>{q.title}</span>}
            meta={<span className={`rounded-full px-2 py-0.5 text-xs ${diffColor[q.difficulty] ?? ''}`}>{q.difficulty}</span>}>
            <QuestionBody q={q} />
          </Accordion>
        ))}
      </div>
      {limit < list.length && <button className="mt-4 min-h-[44px] rounded-md border border-slate-400 px-5" onClick={() => setLimit(limit + PAGE)}>Show more ({list.length - limit} left)</button>}
    </div>
  )
}
