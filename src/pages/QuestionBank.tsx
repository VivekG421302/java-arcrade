import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { content } from '../lib/content'
import { Inline } from '../components/content'

const diffColor: Record<string, string> = { Easy: 'text-emerald-500 bg-emerald-500/10', Medium: 'text-amber-500 bg-amber-500/10', Hard: 'text-red-500 bg-red-500/10' }
const cats = Array.from(new Set(content.questions.map((q) => q.category)))
const PAGE = 40

export default function QuestionBank() {
  const [sp, setSp] = useSearchParams()
  const cat = sp.get('cat') || 'All'
  const [diff, setDiff] = useState('All')
  const [text, setText] = useState('')
  const [limit, setLimit] = useState(PAGE)
  const list = useMemo(
    () => content.questions.filter((q) => (cat === 'All' || q.category === cat) && (diff === 'All' || q.difficulty === diff) && q.title.toLowerCase().includes(text.toLowerCase())),
    [cat, diff, text]
  )
  const chip = (on: boolean) => `min-h-[44px] rounded-full border px-4 text-sm ${on ? 'border-sky-500 bg-sky-500/15 text-sky-500' : 'border-slate-300 dark:border-white/15'}`
  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">Question Bank</h1>
      <p className="mt-1 font-serif text-slate-600 dark:text-slate-400">{list.length} of {content.questions.length} problems, each with its optimal Java complexity target.</p>
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
      <ul className="mt-6 divide-y divide-slate-200 dark:divide-white/10">
        {list.slice(0, limit).map((q) => (
          <li key={q.n} className="py-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="w-8 font-mono text-sm text-slate-500">{q.n}.</span>
              <a className="font-semibold hover:text-sky-500" target="_blank" rel="noreferrer" href={`https://leetcode.com/problemset/?search=${encodeURIComponent(q.title)}`}>{q.title}</a>
              <span className="text-xs text-slate-500">LC #{q.lc}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs ${diffColor[q.difficulty] ?? ''}`}>{q.difficulty}</span>
              <span className="text-xs text-slate-500">{q.category}</span>
            </div>
            <p className="ml-10 mt-1 text-sm text-slate-600 dark:text-slate-400"><Inline md={q.target} /></p>
          </li>
        ))}
      </ul>
      {limit < list.length && <button className="mt-4 min-h-[44px] rounded-md border border-slate-400 px-5" onClick={() => setLimit(limit + PAGE)}>Show more ({list.length - limit} left)</button>}
    </div>
  )
}
