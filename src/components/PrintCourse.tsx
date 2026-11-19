import { BookOpen, ChevronLeft, ChevronRight, Coffee, Cog, Database, Printer, ScrollText, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useCourse } from '../hooks/useCourse'
import { buildPaper } from '../lib/papers'
import { testOf, testsFor } from '../lib/tests'
import { CodeBlock, Inline, Markdown } from './content'

const THEME = {
  java: { accent: '#f59e0b', soft: '#fcd34d', Icon: Coffee, label: 'Java Backend Mastery' },
  rust: { accent: '#fb923c', soft: '#fdba74', Icon: Cog, label: 'Rust Backend Mastery' },
  postgres: { accent: '#38bdf8', soft: '#7dd3fc', Icon: Database, label: 'PostgreSQL & pgAdmin 4' },
} as const

type PartId = 'roadmap' | 'tests' | 'questions' | 'anti' | 'scen' | 'proj' | 'papers' | 'key'
const ORDER: PartId[] = ['roadmap', 'tests', 'questions', 'anti', 'scen', 'proj', 'papers', 'key']
const INFO: Record<PartId, { title: string; blurb: string }> = {
  roadmap: { title: 'Course Roadmap', blurb: 'Every module and chapter, with diagrams, tables and code.' },
  tests: { title: 'Module Tests · Answers', blurb: 'The test of every module with the correct answers and the reason for each.' },
  questions: { title: 'Question Bank · Solutions', blurb: 'LeetCode-style problems with test cases, approach and a full solution.' },
  anti: { title: 'Code Review Anti-Patterns', blurb: 'Bad code next to the fix, with the reasoning and a severity matrix.' },
  scen: { title: 'Production Scenarios · Answers', blurb: 'Incident-style questions with full answers and a quick triage matrix.' },
  proj: { title: 'Projects to Build', blurb: 'Hands-on projects with the tech flow and the problems each one solves.' },
  papers: { title: 'Question Papers', blurb: 'One 40-mark paper per module: objective, short and detailed answers.' },
  key: { title: 'Answer Key · Question Papers', blurb: 'Model answers and marks for every question paper.' },
}

const H2 = ({ children, id }: { children: ReactNode; id?: string }) => <h2 id={id} className="pb mb-3 mt-0 border-b-2 border-slate-800 pb-1 font-sans text-xl font-bold">{children}</h2>
const H3 = ({ children }: { children: ReactNode }) => <h3 className="mb-2 mt-6 font-sans text-base font-bold">{children}</h3>
const Lbl = ({ children }: { children: ReactNode }) => <p className="keep-next mb-1 mt-3 font-sans text-[11px] font-bold uppercase tracking-wide text-slate-500">{children}</p>
const COVER_BG = 'linear-gradient(160deg,#0b1220 0%,#111c33 60%,#0b1220 100%)'

type Th = (typeof THEME)[keyof typeof THEME]

function PartCover({ n, id, th, courseName, lines }: { n: number; id: PartId; th: Th; courseName: string; lines: string[] }) {
  return (
    <section id={`part-${id}`} className="print-cover mx-auto my-4 w-[210mm] max-w-full" style={{ background: COVER_BG, color: '#e2e8f0' }}>
      <div className="relative flex h-full flex-col overflow-hidden px-[18mm] py-[20mm] font-sans">
        <div aria-hidden className="absolute -right-4 -top-8 select-none text-[300px] font-black leading-none opacity-[0.08]" style={{ color: th.accent }}>{String(n).padStart(2, '0')}</div>
        <div aria-hidden className="absolute left-0 top-0 h-full w-[9mm]" style={{ background: th.accent }} />
        <p className="relative ml-[6mm] text-sm font-semibold uppercase tracking-[0.35em]" style={{ color: th.accent }}>{courseName}</p>
        <div className="relative ml-[6mm] mt-[62mm]">
          <p className="text-lg font-semibold uppercase tracking-widest" style={{ color: th.soft }}>Part {n}</p>
          <h1 className="mt-3 text-[38px] font-extrabold leading-[1.1] text-white">{INFO[id].title}</h1>
          <div className="mt-6 h-1 w-24 rounded" style={{ background: th.accent }} />
          <p className="mt-6 max-w-[135mm] font-serif text-[15px] leading-relaxed text-slate-300">{INFO[id].blurb}</p>
        </div>
        <ul className="relative ml-[6mm] mt-auto space-y-1 text-sm text-slate-300">
          {lines.map((l) => <li key={l} className="flex items-center gap-2"><span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: th.accent }} />{l}</li>)}
        </ul>
        <div className="relative ml-[6mm] mt-8 flex items-end justify-between border-t pt-4 text-xs text-slate-400" style={{ borderColor: 'rgba(255,255,255,0.14)' }}>
          <span>Created by <b className="text-slate-100">VivekG</b></span>
          <span style={{ color: th.accent }}>vivek-gupta-dev.vercel.app</span>
        </div>
      </div>
    </section>
  )
}

/** The paper: pure content, rendered inside the preview frame (always light) and printed from there. */
function PrintDocument({ parts, mode, page, pages }: { parts: PartId[]; mode: 'scroll' | 'pages'; page: number; pages: number }) {
  const { course, data, meta } = useCourse()
  const tests = testsFor(course)
  const unit = meta.unit
  const th = THEME[course]
  const papers = useMemo(() => data.phases.map((p) => ({ p, paper: buildPaper(p, testOf(course, p)) })), [data, tests])
  const has = (id: PartId) => parts.includes(id)
  const stats = ([
    [has('roadmap') ? data.phases.length : 0, `${unit}s`],
    [has('questions') ? data.questions.length : 0, 'Problems solved'],
    [has('anti') ? data.antiPatterns.length + data.antiMatrix.length : 0, 'Anti-patterns'],
    [has('scen') ? data.scenarios.length + data.scenarioMatrix.length : 0, 'Scenarios'],
    [has('proj') ? data.projects.length : 0, 'Projects'],
    [has('papers') ? data.phases.length : 0, 'Question papers · 40 marks'],
  ] as const).filter(([n]) => n > 0)
  const coverLines = (id: PartId): string[] => {
    const sections = data.phases.reduce((n, p) => n + p.sections.length, 0)
    switch (id) {
      case 'roadmap': return [`${data.phases.length} ${unit.toLowerCase()}s`, `${sections} sections with diagrams, tables and code`]
      case 'tests': return [`${Object.keys(tests).length} module tests`, 'Every answer explained']
      case 'questions': return [`${data.questions.length} problems`, 'Test cases, approach and full solutions']
      case 'anti': return [`${data.antiPatterns.length} detailed anti-patterns`, `${data.antiMatrix.length} more in the severity matrix`]
      case 'scen': return [`${data.scenarios.length} detailed scenarios`, `${data.scenarioMatrix.length} more in the triage matrix`]
      case 'proj': return [`${data.projects.length} projects`, 'Tech flow and the problems solved']
      case 'papers': return [`${papers.length} papers of 40 marks`, 'Sections A, B and C']
      case 'key': return [`${papers.length} answer sheets`, 'Marks shown for every question']
    }
  }
  const part = (id: PartId) => <PartCover key={`c-${id}`} n={parts.indexOf(id) + 1} id={id} th={th} courseName={meta.name} lines={coverLines(id)} />

  const body = (
    <>
      <section className="print-cover mx-auto my-4 w-[210mm] max-w-full" style={{ background: COVER_BG, color: '#e2e8f0' }}>
        <div className="relative flex h-full flex-col overflow-hidden px-[18mm] py-[20mm] font-sans">
          <div aria-hidden className="absolute -right-24 top-40 opacity-[0.07]" style={{ color: th.accent }}><th.Icon size={520} strokeWidth={1} /></div>
          <div aria-hidden className="absolute left-0 top-0 h-full w-[9mm]" style={{ background: th.accent }} />
          <p className="ml-[6mm] text-sm font-semibold uppercase tracking-[0.35em]" style={{ color: th.accent }}>Study guide · {new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</p>
          <div className="relative ml-[6mm] mt-[38mm]">
            <p className="text-lg font-medium" style={{ color: th.soft }}>{th.label}</p>
            <h1 className="mt-3 text-[40px] font-extrabold leading-[1.1] text-white">{meta.title}</h1>
            <div className="mt-6 h-1 w-24 rounded" style={{ background: th.accent }} />
            <p className="mt-6 max-w-[135mm] font-serif text-[15px] leading-relaxed text-slate-300">{meta.tagline}</p>
          </div>
          <div className="relative ml-[6mm] mt-auto grid grid-cols-3 gap-3">
            {stats.map(([n, label]) => (
              <div key={label} className="rounded-lg border px-4 py-3" style={{ borderColor: 'rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.05)' }}>
                <p className="text-2xl font-extrabold" style={{ color: th.accent }}>{n}</p>
                <p className="text-xs uppercase tracking-wider text-slate-400">{label}</p>
              </div>
            ))}
          </div>
          <div className="relative ml-[6mm] mt-8 flex items-end justify-between border-t pt-4 text-xs text-slate-400" style={{ borderColor: 'rgba(255,255,255,0.14)' }}>
            <span>Created by <b className="text-slate-100">VivekG</b></span>
            <span style={{ color: th.accent }}>vivek-gupta-dev.vercel.app</span>
          </div>
        </div>
      </section>

      <div className={mode === 'pages' ? '' : 'print-page mx-auto my-4 max-w-[210mm] bg-white p-[14mm] shadow'} style={{ color: '#0f172a' }}>
        <div className="font-serif text-[12px] leading-relaxed">
          <nav aria-label="Index" className="avoid-break mx-auto max-w-[150mm] pb-2 text-left font-sans text-[12px]">
            <h2 className="mb-2 border-b-2 border-slate-800 pb-1 text-lg font-bold">Index</h2>
            <ol className="space-y-1">
              {parts.map((id, i) => (
                <li key={id}>
                  <a href={`#part-${id}`} className="font-semibold hover:underline">Part {i + 1} · {INFO[id].title}</a>
                  {id === 'roadmap' && (
                    <ol className="ml-4 mt-0.5 space-y-0.5 font-normal">
                      {data.phases.map((p) => <li key={p.id}><a href={`#m-${p.id}`} className="hover:underline">{unit} {p.id}: {p.title}</a></li>)}
                    </ol>
                  )}
                </li>
              ))}
            </ol>
            {parts.length === 0 && <p className="text-slate-500">Nothing selected.</p>}
            <p className="mt-6 border-t border-slate-300 pt-3 text-[11px] text-slate-500">Created by VivekG · <a href="https://vivek-gupta-dev.vercel.app" target="_blank" rel="noopener noreferrer" className="underline">vivek-gupta-dev.vercel.app</a></p>
          </nav>

          {has('roadmap') && <>
            {part('roadmap')}
            <section>
              {data.phases.map((p) => (
                <div key={p.id}>
                  <H2 id={`m-${p.id}`}>{unit} {p.id}: {p.title}</H2>
                  {p.sections.map((s) => <div key={s.id}><H3>{s.title}</H3><Markdown md={s.md} /></div>)}
                </div>
              ))}
            </section>
          </>}

          {has('tests') && <>
            {part('tests')}
            <section>
              {data.phases.filter((p) => testOf(course, p)).map((p) => (
                <div key={p.id}>
                  <H2 id={`t-${p.id}`}>{unit} {p.id} test · answers</H2>
                  <p className="mb-3 font-sans text-slate-600">{p.title}</p>
                  <ol className="list-decimal space-y-4 pl-5">
                    {(testOf(course, p) ?? []).map((t, i) => (
                      <li key={i} className="avoid-break">
                        <p className="font-sans font-semibold">{t.q}</p>
                        {t.type === 'mcq' ? (
                          <ul className="mt-1 space-y-0.5 font-sans">
                            {t.opts.map((o, k) => <li key={k} className={k === t.answer ? 'font-bold text-emerald-700' : ''}>{k === t.answer ? '✔' : '○'} {o}</li>)}
                          </ul>
                        ) : (
                          <>
                            <CodeBlock code={t.code} lang={t.lang} />
                            <p className="font-sans font-bold text-emerald-700">✔ Answer: {t.accept.join(' / ')}</p>
                          </>
                        )}
                        <p className="mt-1 font-sans text-slate-600"><b>Why:</b> {t.why}</p>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </section>
          </>}

          {has('questions') && <>
            {part('questions')}
            <section>
              <H2 id="sec-questions">Question bank · solutions</H2>
              {data.questions.map((q) => (
                <div key={q.n} className="avoid-break mb-6">
                  <H3>{q.n}. {q.title} <span className="font-normal text-slate-500">· {q.difficulty} · {q.category}</span></H3>
                  <p><Inline md={q.statement} /></p>
                  <Lbl>Test cases</Lbl>
                  <table className="w-full border-collapse border-y border-slate-700 text-[11px]">
                    <thead><tr className="border-b border-slate-700 text-left"><th className="px-2 py-1">Input</th><th className="px-2 py-1">Expected output</th></tr></thead>
                    <tbody>{q.tests.map((t, i) => <tr key={i} className="align-top"><td className="px-2 py-1 font-mono">{t.input}</td><td className="px-2 py-1 font-mono">{t.output}</td></tr>)}</tbody>
                  </table>
                  <Lbl>Expected complexity</Lbl>
                  <p><Inline md={q.target} /></p>
                  <Lbl>Approach</Lbl>
                  <p><Inline md={q.approach} /></p>
                  {q.defs && <><Lbl>Given class</Lbl><CodeBlock code={q.defs} lang={meta.lang} /></>}
                  <Lbl>{meta.name} solution</Lbl>
                  <CodeBlock code={q.code} lang={meta.lang} />
                </div>
              ))}
            </section>
          </>}

          {has('anti') && <>
            {part('anti')}
            <section>
              <H2 id="sec-anti">Code review anti-patterns</H2>
              {data.antiPatterns.map((a) => (
                <div key={a.n} className="mb-6">
                  <H3>{a.n}. {a.title}</H3>
                  <Lbl>Anti-pattern</Lbl>
                  <CodeBlock code={a.bad} lang={a.lang} accent="bad" />
                  <Lbl>Fix</Lbl>
                  <CodeBlock code={a.good} lang={a.lang} accent="good" />
                  <Markdown md={a.why} />
                </div>
              ))}
              {data.antiMatrix.length > 0 && (
                <>
                  <H3>Anti-pattern matrix</H3>
                  <table className="w-full border-collapse border-y border-slate-700 font-sans text-[10.5px]">
                    <thead><tr className="border-b border-slate-700 text-left">{['#', 'Domain', 'Anti-pattern', 'Severity', 'Root cause & impact', 'Remediation'].map((h) => <th key={h} className="px-1.5 py-1">{h}</th>)}</tr></thead>
                    <tbody>{data.antiMatrix.map((r) => (
                      <tr key={r.n} className="avoid-break border-b border-slate-200 align-top">
                        <td className="px-1.5 py-1">{r.n}</td><td className="px-1.5 py-1">{r.domain}</td><td className="px-1.5 py-1"><Inline md={r.pattern} /></td>
                        <td className="px-1.5 py-1">{r.severity}</td><td className="px-1.5 py-1"><Inline md={r.cause} /></td><td className="px-1.5 py-1"><Inline md={r.fix} /></td>
                      </tr>))}</tbody>
                  </table>
                </>
              )}
            </section>
          </>}

          {has('scen') && <>
            {part('scen')}
            <section>
              <H2 id="sec-scen">Production scenarios · answers</H2>
              {data.scenarios.map((s) => (
                <div key={s.n} className="mb-6">
                  <H3>{s.n}. {s.title}</H3>
                  <p className="font-sans font-semibold">{s.question}</p>
                  <Markdown md={s.answer} />
                </div>
              ))}
              {data.scenarioMatrix.length > 0 && (
                <>
                  <H3>Quick triage matrix</H3>
                  <table className="w-full border-collapse border-y border-slate-700 font-sans text-[10.5px]">
                    <thead><tr className="border-b border-slate-700 text-left">{['#', 'Symptom', 'Root cause diagnostics', 'Immediate remediation'].map((h) => <th key={h} className="px-1.5 py-1">{h}</th>)}</tr></thead>
                    <tbody>{data.scenarioMatrix.map((r) => (
                      <tr key={r.n} className="avoid-break border-b border-slate-200 align-top">
                        <td className="px-1.5 py-1">{r.n}</td><td className="px-1.5 py-1"><Inline md={r.symptom} /></td><td className="px-1.5 py-1"><Inline md={r.cause} /></td><td className="px-1.5 py-1"><Inline md={r.fix} /></td>
                      </tr>))}</tbody>
                  </table>
                </>
              )}
            </section>
          </>}

          {has('proj') && <>
            {part('proj')}
            <section>
              <H2 id="sec-proj">Projects to build</H2>
              {data.projects.map((p) => (
                <div key={p.n} className="mb-6">
                  <H3>{p.n}. {p.title} <span className="font-normal text-slate-500">· {p.level} · {p.stack.join(', ')}</span></H3>
                  <Markdown md={p.what} />
                  <Lbl>How the tech flows</Lbl>
                  <Markdown md={p.flow} />
                  <Lbl>Problems it solves</Lbl>
                  <Markdown md={p.solves} />
                </div>
              ))}
            </section>
          </>}

          {has('papers') && <>
            {part('papers')}
            <section>
              <H2 id="sec-papers">Question papers</H2>
              <p className="font-sans text-slate-600">One paper per {unit.toLowerCase()}, 40 marks each.{has('key') ? ' Answers are in the answer key at the end of this document.' : ''}</p>
              {papers.map(({ p, paper }) => (
                <div key={p.id} className="paper">
                  <h3 className="mb-1 mt-0 font-sans text-lg font-bold">{meta.name} · {unit} {p.id}: {p.title}</h3>
                  <p className="mb-3 border-b border-slate-400 pb-2 font-sans text-[11px]">Maximum marks: <b>{paper.total}</b> · Attempt all questions · Marks are shown in brackets.</p>
                  {paper.a.length > 0 && <p className="mt-2 font-sans text-sm font-bold">Section A · one mark each ({paper.a.length})</p>}
                  <ol className="list-decimal space-y-3 pl-5">
                    {paper.a.map((t, i) => (
                      <li key={i} className="avoid-break">
                        <p className="font-sans font-semibold">{t.q} <span className="font-normal text-slate-500">[1]</span></p>
                        {t.type === 'mcq' ? <ul className="mt-1 font-sans">{t.opts.map((o, k) => <li key={k}>({'abcd'[k]}) {o}</li>)}</ul> : <CodeBlock code={t.code} lang={t.lang} />}
                      </li>
                    ))}
                  </ol>
                  <p className="mt-4 font-sans text-sm font-bold">Section B · short answers ({paper.b.reduce((n, x) => n + x.marks, 0)})</p>
                  <ol start={paper.a.length + 1} className="list-decimal space-y-2 pl-5 font-sans">
                    {paper.b.map((x, i) => <li key={i} className="avoid-break">{x.title} <span className="text-slate-500">[{x.marks}]</span></li>)}
                  </ol>
                  <p className="mt-4 font-sans text-sm font-bold">Section C · detailed answers ({paper.c.reduce((n, x) => n + x.marks, 0)})</p>
                  <ol start={paper.a.length + paper.b.length + 1} className="list-decimal space-y-2 pl-5 font-sans">
                    {paper.c.map((x, i) => <li key={i} className="avoid-break">{x.title} <span className="text-slate-500">[{x.marks}]</span></li>)}
                  </ol>
                </div>
              ))}
            </section>
          </>}

          {has('key') && <>
            {part('key')}
            <section>
              <H2 id="sec-key">Answer key · question papers</H2>
              {papers.map(({ p, paper }) => (
                <div key={p.id} className="paper">
                  <h3 className="mb-2 mt-0 font-sans text-lg font-bold">{unit} {p.id}: {p.title} · answers ({paper.total} marks)</h3>
                  <p className="font-sans text-sm font-bold">Section A</p>
                  <ol className="list-decimal space-y-2 pl-5 font-sans">
                    {paper.a.map((t, i) => (
                      <li key={i} className="avoid-break">
                        {t.type === 'mcq' ? <b className="text-emerald-700">({'abcd'[t.answer]}) {t.opts[t.answer]}</b> : <b className="text-emerald-700">{t.accept.join(' / ')}</b>}
                        <span className="text-slate-600"> {t.why}</span>
                      </li>
                    ))}
                  </ol>
                  <p className="mt-3 font-sans text-sm font-bold">Section B</p>
                  <ol start={paper.a.length + 1} className="list-decimal space-y-2 pl-5">
                    {paper.b.map((x, i) => <li key={i} className="avoid-break"><p className="font-sans font-semibold">{x.title} [{x.marks}]</p><Markdown md={x.ans} /></li>)}
                  </ol>
                  <p className="mt-3 font-sans text-sm font-bold">Section C</p>
                  <ol start={paper.a.length + paper.b.length + 1} className="list-decimal space-y-2 pl-5">
                    {paper.c.map((x, i) => <li key={i}><p className="font-sans font-semibold">{x.title} [{x.marks}]</p><Markdown md={x.ans} /></li>)}
                  </ol>
                </div>
              ))}
            </section>
          </>}
        </div>
      </div>
    </>
  )

  if (mode === 'scroll') return <div className="print-doc" style={{ padding: 16 }}>{body}</div>
  // page-wise preview: the same content flowed into A4-sized columns, one column per page
  return (
    <div className="print-doc" style={{ padding: 16 }}>
      <div className="pw-viewport">
        <div className="pw-flow" style={{ ['--pg' as string]: page }}>{body}</div>
        <div className="pw-foot"><span>Created by VivekG · vivek-gupta-dev.vercel.app</span><span>Page {page + 1} of {pages}</span></div>
      </div>
    </div>
  )
}

/** An iframe that gets this app's stylesheets and renders its children inside it. It has no `dark` class, so the paper is always light while the surrounding UI follows the theme. */
function PaperFrame({ children, frameRef, style, bg, onBody }: { children: ReactNode; frameRef: React.MutableRefObject<HTMLIFrameElement | null>; style: React.CSSProperties; bg: string; onBody: (b: HTMLElement) => void }) {
  const [body, setBody] = useState<HTMLElement | null>(null)
  useEffect(() => {
    const f = frameRef.current
    const doc = f?.contentDocument
    if (!f || !doc) return
    let alive = true
    doc.open()
    doc.write('<!doctype html><html><head><meta charset="utf-8"><title>Print</title></head><body style="margin:0"></body></html>')
    doc.close()
    const loads: Promise<void>[] = []
    document.querySelectorAll('link[rel="stylesheet"], style').forEach((n) => {
      const c = n.cloneNode(true) as HTMLElement
      if (c instanceof HTMLLinkElement) {
        c.href = (n as HTMLLinkElement).href
        loads.push(new Promise((r) => { c.onload = () => r(); c.onerror = () => r() }))
      }
      doc.head.appendChild(c)
    })
    Promise.race([Promise.all(loads), new Promise((r) => setTimeout(r, 3000))]).then(() => { if (alive) { setBody(doc.body); onBody(doc.body) } })
    return () => { alive = false }
  }, [frameRef, onBody])
  useEffect(() => { if (body) { body.ownerDocument.documentElement.style.background = bg; body.style.background = bg } }, [body, bg])
  return <><iframe ref={frameRef} title="Print preview" style={{ border: 0, ...style }} />{body && createPortal(children, body)}</>
}

const PX_MM = 96 / 25.4
const countColumns = (doc: Document) => {
  const flow = doc.querySelector('.pw-flow') as HTMLElement | null
  return flow ? Math.max(1, Math.round((flow.scrollWidth + 28 * PX_MM) / (210 * PX_MM))) : 0
}

/** Scroll view cannot count pages from its height (covers, margins and page breaks change it), so the paper is also laid out invisibly in A4 pages and those are counted. */
function PageCounter({ parts, onCount }: { parts: PartId[]; onCount: (n: number) => void }) {
  const ref = useRef<HTMLIFrameElement | null>(null)
  const [body, setBody] = useState<HTMLElement | null>(null)
  useEffect(() => {
    if (!body) return
    let tries = 0
    const t = window.setInterval(() => { const n = countColumns(body.ownerDocument); if (n) onCount(n); if (++tries >= 4) clearInterval(t) }, 600)
    return () => clearInterval(t)
  }, [body, onCount])
  return (
    <PaperFrame frameRef={ref} bg="#fff" onBody={setBody} style={{ position: 'fixed', left: -10000, top: 0, width: 210 * PX_MM + 32, height: 297 * PX_MM + 32, visibility: 'hidden', pointerEvents: 'none' }}>
      <PrintDocument parts={parts} mode="pages" page={0} pages={1} />
    </PaperFrame>
  )
}
const KEY = (c: string) => `print:parts:${c}`

export default function PrintCourse({ onClose }: { onClose: () => void }) {
  const { course, data, meta } = useCourse()
  const tests = testsFor(course)
  const th = THEME[course]
  const avail = useMemo<PartId[]>(() => ORDER.filter((id) => id === 'roadmap' || id === 'papers' || id === 'key' || (id === 'tests' && Object.keys(tests).length > 0) || (id === 'questions' && data.questions.length > 0) || (id === 'anti' && data.antiPatterns.length + data.antiMatrix.length > 0) || (id === 'scen' && data.scenarios.length + data.scenarioMatrix.length > 0) || (id === 'proj' && data.projects.length > 0)), [data, tests])
  const [sel, setSel] = useState<PartId[]>(() => {
    try { const s = JSON.parse(localStorage.getItem(KEY(course)) || 'null') as PartId[] | null; if (s) return s.filter((x) => avail.includes(x)) } catch { /* ignore */ }
    return avail
  })
  const [mode, setMode] = useState<'scroll' | 'pages'>(() => (localStorage.getItem('print:mode') === 'pages' ? 'pages' : 'scroll'))
  const [page, setPage] = useState(0)
  const [pages, setPages] = useState(1)
  const [docH, setDocH] = useState(1200)
  const [panel, setPanel] = useState({ w: 800, h: 600 })
  const [bg, setBg] = useState('#0b0e14')
  const parts = useMemo(() => ORDER.filter((id) => avail.includes(id) && sel.includes(id)), [avail, sel])
  const frameRef = useRef<HTMLIFrameElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const [body, setBody] = useState<HTMLElement | null>(null)

  const choose = (next: PartId[]) => { setSel(next); setPage(0); try { localStorage.setItem(KEY(course), JSON.stringify(next)) } catch { /* ignore */ } }
  const toggle = (id: PartId) => choose(sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id])
  const setView = (m: 'scroll' | 'pages') => { setMode(m); setPage(0); try { localStorage.setItem('print:mode', m) } catch { /* ignore */ } }

  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (mode === 'pages' && e.key === 'ArrowRight') setPage((p) => Math.min(pages - 1, p + 1))
      if (mode === 'pages' && e.key === 'ArrowLeft') setPage((p) => Math.max(0, p - 1))
    }
    window.addEventListener('keydown', esc)
    const idoc = body?.ownerDocument
    idoc?.addEventListener('keydown', esc)
    return () => { window.removeEventListener('keydown', esc); idoc?.removeEventListener('keydown', esc) }
  }, [onClose, mode, pages, body])

  useEffect(() => {
    const el = panelRef.current
    if (!el) return
    setBg(getComputedStyle(el).backgroundColor)
    const ro = new ResizeObserver(() => setPanel({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el)
    setPanel({ w: el.clientWidth, h: el.clientHeight })
    return () => ro.disconnect()
  }, [])

  // measure the paper inside the frame: total height (scroll view) and number of A4 columns (page view)
  useEffect(() => {
    if (!body) return
    const doc = body.ownerDocument
    const measure = () => {
      if (mode === 'pages') {
        const n = countColumns(doc)
        if (n) setPages(n)
      } else {
        setDocH(doc.documentElement.scrollHeight)
      }
    }
    measure()
    const t = [150, 600, 1800].map((ms) => window.setTimeout(measure, ms))
    const RO = (doc.defaultView as unknown as { ResizeObserver: typeof ResizeObserver }).ResizeObserver
    const ro = new RO(measure)
    ro.observe(body)
    return () => { t.forEach(clearTimeout); ro.disconnect() }
  }, [body, mode, parts])
  useEffect(() => { setPage((p) => Math.min(p, Math.max(0, pages - 1))) }, [pages])

  const print = useCallback(() => { const w = frameRef.current?.contentWindow; if (w) { w.focus(); w.print() } }, [])

  const frameW = 210 * PX_MM + 32
  const frameH = mode === 'pages' ? 297 * PX_MM + 32 : docH
  const fit = Math.min(1, (panel.w - 24) / frameW, mode === 'pages' ? (panel.h - 16) / frameH : 9)
  const count = (id: PartId) => {
    switch (id) {
      case 'roadmap': return `${data.phases.length} ${meta.unit.toLowerCase()}s`
      case 'tests': return `${Object.keys(tests).length} tests`
      case 'questions': return `${data.questions.length} problems`
      case 'anti': return `${data.antiPatterns.length + data.antiMatrix.length}`
      case 'scen': return `${data.scenarios.length + data.scenarioMatrix.length}`
      case 'proj': return `${data.projects.length}`
      default: return `${data.phases.length} × 40 marks`
    }
  }
  const presets: [string, PartId[]][] = [
    ['Everything', avail],
    ['Roadmap only', ['roadmap']],
    ['Papers + answers', ['papers', 'key']],
    ['Practice only', avail.filter((x) => ['questions', 'anti', 'scen', 'proj'].includes(x))],
  ]
  const seg = (on: boolean) => `inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ${on ? 'bg-sky-600 text-white' : 'text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-white/10'}`

  return createPortal(
    <div role="dialog" aria-label="Print course" className="fixed inset-0 z-[200] flex flex-col bg-slate-100 text-slate-900 dark:bg-[#0b0e14] dark:text-slate-100">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-300 bg-white px-4 py-3 dark:border-white/10 dark:bg-[#12161d]">
        <span className="flex items-center gap-2 text-sm"><th.Icon size={18} style={{ color: th.accent }} aria-hidden /><b>Print {meta.name} course</b><span className="hidden text-slate-500 sm:inline">· A4 · answers included</span></span>
        <span className="flex gap-2">
          <button type="button" disabled={parts.length === 0} onClick={print} className="inline-flex items-center gap-2 rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-40"><Printer size={16} aria-hidden /> Print / Save as PDF</button>
          <button type="button" onClick={onClose} className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100 dark:border-white/15 dark:hover:bg-white/10"><X size={16} aria-hidden /> Close</button>
        </span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <aside className="max-h-[38vh] w-full shrink-0 overflow-y-auto border-b border-slate-300 bg-white p-4 dark:border-white/10 dark:bg-[#12161d] md:max-h-none md:w-[310px] md:border-b-0 md:border-r">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">What to print</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {presets.map(([label, ids]) => <button key={label} type="button" onClick={() => choose(ids)} className="rounded-full border border-slate-300 px-3 py-1 text-xs hover:bg-slate-100 dark:border-white/15 dark:hover:bg-white/10">{label}</button>)}
            <button type="button" onClick={() => choose([])} className="rounded-full border border-slate-300 px-3 py-1 text-xs hover:bg-slate-100 dark:border-white/15 dark:hover:bg-white/10">Clear</button>
          </div>
          <ul className="mt-4 space-y-2">
            {avail.map((id) => (
              <li key={id}>
                <label className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${sel.includes(id) ? 'border-sky-500/60 bg-sky-500/10' : 'border-slate-200 dark:border-white/10'}`}>
                  <input type="checkbox" checked={sel.includes(id)} onChange={() => toggle(id)} className="mt-1 h-4 w-4 accent-sky-600" />
                  <span className="min-w-0">
                    <span className="flex items-baseline justify-between gap-2"><b className="text-sm">{INFO[id].title}</b><span className="shrink-0 text-xs text-slate-500">{count(id)}</span></span>
                    <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">{INFO[id].blurb}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">The course cover and index always come first. Every selected part starts with its own cover page. In the print dialog, tick <b>Background graphics</b> so the covers print in colour.</p>
        </aside>

        <section className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-300 px-4 py-2 dark:border-white/10">
            <span className="inline-flex rounded-lg border border-slate-300 p-0.5 dark:border-white/15">
              <button type="button" onClick={() => setView('scroll')} className={seg(mode === 'scroll')}><ScrollText size={15} aria-hidden /> Scroll</button>
              <button type="button" onClick={() => setView('pages')} className={seg(mode === 'pages')}><BookOpen size={15} aria-hidden /> Pages</button>
            </span>
            {mode === 'pages' && (
              <span className="inline-flex items-center gap-2 text-sm">
                <button type="button" aria-label="Previous page" disabled={page === 0} onClick={() => setPage(page - 1)} className="rounded-md border border-slate-300 p-1.5 hover:bg-slate-100 disabled:opacity-30 dark:border-white/15 dark:hover:bg-white/10"><ChevronLeft size={18} /></button>
                <span className="min-w-[110px] text-center">Page {page + 1} of {pages}</span>
                <button type="button" aria-label="Next page" disabled={page >= pages - 1} onClick={() => setPage(page + 1)} className="rounded-md border border-slate-300 p-1.5 hover:bg-slate-100 disabled:opacity-30 dark:border-white/15 dark:hover:bg-white/10"><ChevronRight size={18} /></button>
              </span>
            )}
            <span className="text-xs text-slate-500">≈ {pages} pages when printed · the printout can differ by a few pages</span>
          </div>
          <div ref={panelRef} className="min-h-0 flex-1 overflow-auto bg-slate-200 dark:bg-[#0b0e14]">
            {parts.length === 0 && <p className="p-8 text-center text-sm text-slate-500">Tick at least one part on the left.</p>}
            {mode === 'scroll' && parts.length > 0 && <PageCounter key={parts.join()} parts={parts} onCount={setPages} />}
            <div style={{ width: frameW * fit, height: frameH * fit, margin: '0 auto', display: parts.length ? 'block' : 'none' }}>
              <PaperFrame frameRef={frameRef} bg={bg} onBody={setBody} style={{ width: frameW, height: frameH, transform: `scale(${fit})`, transformOrigin: '0 0' }}>
                <PrintDocument parts={parts} mode={mode} page={page} pages={pages} />
              </PaperFrame>
            </div>
          </div>
        </section>
      </div>
    </div>,
    document.body,
  )
}
