import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { content, leetUrl, type LcQuestion } from '../lib/content'
import { Accordion } from '../components/ui'
import { CodeBlock, Inline } from '../components/content'
import ChipScroller from '../components/ChipScroller'
import { LeetCodeLogo, VsCodeLogo } from '../components/logos'
import { useIde } from '../hooks/useIde'
import { usePersisted } from '../hooks/usePersisted'
import { tip } from '../lib/shortcuts'

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
  const ide = useIde()
  const current = ide.open && ide.qn === q.n          // shortcuts act on the question open in the IDE

  useEffect(() => {
    const h = (e: Event) => { if ((e as CustomEvent).detail === q.n) setShow((s) => !s) }
    window.addEventListener('ide:solution', h)
    return () => window.removeEventListener('ide:solution', h)
  }, [q.n])

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

      <div className="qhead mt-6 flex justify-center">
        <button type="button" aria-expanded={show} aria-label={show ? 'Hide solution' : 'Show solution'} onClick={() => setShow(!show)}
          {...tip(show ? 'Hide solution' : 'Show solution', current ? 'solution' : undefined)}
          className="q-btn inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[#6b84ad] px-8 text-sm font-medium text-white shadow-sm hover:bg-[#7b94bd]">
          {show ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
          <span className="q-label">{show ? 'Hide Solution' : 'Show Solution'}</span>
        </button>
      </div>

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
  const ide = useIde()
  const cat = sp.get('cat') || 'All'
  const [diff, setDiff] = usePersisted('qb:diff', 'All')
  const [text, setText] = useState('')
  const [limit, setLimit] = useState(PAGE)
  const [openN, setOpenN] = useState<Set<number>>(new Set())
  const search = useRef<HTMLInputElement>(null)
  const revealed = useRef<number | null>(null)
  const firstRun = useRef(true)

  const list = useMemo(() => {
    const t = text.toLowerCase()
    return content.questions.filter(
      (q) => (cat === 'All' || q.category === cat) && (diff === 'All' || q.difficulty === diff) && `${q.title} ${q.statement}`.toLowerCase().includes(t)
    )
  }, [cat, diff, text])

  // "/" jumps to search
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA') { e.preventDefault(); search.current?.focus() }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  // when the IDE moves to another problem (prev/next/practice), open and scroll to it here
  useEffect(() => {
    if (!ide.open || ide.qn == null) { revealed.current = null; firstRun.current = false; return }
    if (firstRun.current) { firstRun.current = false; revealed.current = ide.qn; return }   // restored session: keep your saved filters, only follow later navigation
    if (revealed.current === ide.qn) return
    const idx = list.findIndex((q) => q.n === ide.qn)
    if (idx === -1) { if (cat !== 'All') setSp({}); setDiff('All'); setText(''); return }   // filtered out: clear filters, then retry
    if (idx >= limit) { setLimit(idx + 1 + PAGE); return }
    revealed.current = ide.qn
    const n = ide.qn
    setOpenN((s) => new Set(s).add(n))
    requestAnimationFrame(() => requestAnimationFrame(() => document.getElementById(`q-${n}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' })))
  }, [ide.open, ide.qn, list, limit, cat, setSp])

  const chip = (on: boolean) => `min-h-[44px] shrink-0 whitespace-nowrap rounded-full border px-4 text-sm ${on ? 'border-sky-500 bg-sky-500/15 text-sky-500' : 'border-slate-300 dark:border-white/15'}`
  const toggle = (n: number, o: boolean) => setOpenN((s) => { const x = new Set(s); if (o) x.add(n); else x.delete(n); return x })
  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">Question Bank</h1>
      <p className="mt-1 font-serif text-slate-600 dark:text-slate-400">{list.length} of {content.questions.length} problems. Open one to read the problem and test cases, then reveal the Java solution when you are ready.</p>
      <div className="mt-5">
        <ChipScroller label="Filter by category">
          {['All', ...cats].map((c) => (
            <button key={c} aria-pressed={cat === c} className={chip(cat === c)} onClick={() => { setSp(c === 'All' ? {} : { cat: c }); setLimit(PAGE) }}>{c}</button>
          ))}
        </ChipScroller>
      </div>
      <div className="mt-2">
        <ChipScroller label="Filter by difficulty">
          {['All', 'Easy', 'Medium', 'Hard'].map((d) => <button key={d} aria-pressed={diff === d} className={chip(diff === d)} onClick={() => { setDiff(d); setLimit(PAGE) }}>{d}</button>)}
        </ChipScroller>
      </div>
      <input ref={search} type="search" aria-label="Search questions" placeholder="Search…  ( / )" value={text} onChange={(e) => { setText(e.target.value); setLimit(PAGE) }}
        onKeyDown={(e) => e.key === 'Escape' && e.currentTarget.blur()}
        className="mt-3 min-h-[44px] w-full rounded-md border border-slate-300 bg-transparent px-3 dark:border-white/15" />
      <div className="mt-6">
        {list.slice(0, limit).map((q) => {
          const current = ide.open && ide.qn === q.n
          const act = 'q-btn inline-flex h-11 items-center gap-2 rounded-lg border px-3.5 text-sm font-medium'
          return (
            <div key={q.n} id={`q-${q.n}`} className="scroll-mt-2">
              <Accordion open={openN.has(q.n)} onToggle={(o) => toggle(q.n, o)}
                title={<span><span className="mr-2 font-mono text-sm text-slate-500">{q.n}.</span>{q.title}</span>}
                meta={<span className={`inline-block rounded-full px-2 py-0.5 text-xs ${diffColor[q.difficulty] ?? ''}`}>{q.difficulty}</span>}
                actions={
                  <>
                    <a href={leetUrl(q.title)} target="_blank" rel="noreferrer" aria-label="Open on LeetCode" {...(current ? tip('Open on LeetCode', 'leetcode') : tip('Open on LeetCode'))}
                      className={`${act} border-amber-500/70 text-amber-500 hover:bg-amber-500/10`}><LeetCodeLogo /><span className="q-label">LeetCode</span></a>
                    <button type="button" onClick={() => ide.openFor(q.n)} aria-label="Open in IDE" {...tip('Open this problem in the IDE')} data-tip-end=""
                      className={`${act} border-sky-500/70 text-sky-500 hover:bg-sky-500/10`}><VsCodeLogo /><span className="q-label">Open IDE</span></button>
                  </>
                }>
                <QuestionBody q={q} />
              </Accordion>
            </div>
          )
        })}
      </div>
      {limit < list.length && <button className="mt-4 min-h-[44px] rounded-md border border-slate-400 px-5" onClick={() => setLimit(limit + PAGE)}>Show more ({list.length - limit} left)</button>}
    </div>
  )
}
