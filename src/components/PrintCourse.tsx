import { Coffee, Cog, Database, Printer, X } from 'lucide-react'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useCourse } from '../hooks/useCourse'
import { buildPaper } from '../lib/papers'
import { testsFor } from '../lib/tests'
import { CodeBlock, Inline, Markdown } from './content'

const THEME = {
  java: { accent: '#f59e0b', soft: '#fcd34d', Icon: Coffee, label: 'Java Backend Mastery' },
  rust: { accent: '#fb923c', soft: '#fdba74', Icon: Cog, label: 'Rust Backend Mastery' },
  postgres: { accent: '#38bdf8', soft: '#7dd3fc', Icon: Database, label: 'PostgreSQL & pgAdmin 4' },
} as const

const H2 = ({ children, id }: { children: React.ReactNode; id?: string }) => <h2 id={id} className="pb mb-3 mt-0 border-b-2 border-slate-800 pb-1 font-sans text-xl font-bold">{children}</h2>
const H3 = ({ children }: { children: React.ReactNode }) => <h3 className="mb-2 mt-6 font-sans text-base font-bold">{children}</h3>
const Lbl = ({ children }: { children: React.ReactNode }) => <p className="keep-next mb-1 mt-3 font-sans text-[11px] font-bold uppercase tracking-wide text-slate-500">{children}</p>

/** Whole course as one A4 document: roadmap, module tests, question bank, anti-patterns, scenarios, projects, with every answer. Rendered in light mode; the browser's print dialog does the rest. */
export default function PrintCourse({ onClose }: { onClose: () => void }) {
  const { course, data, meta } = useCourse()
  const tests = testsFor(course)
  const unit = meta.unit
  const th = THEME[course]
  const stats = ([
    [data.phases.length, `${unit}s`],
    [data.questions.length, 'Problems solved'],
    [data.antiPatterns.length + data.antiMatrix.length, 'Anti-patterns'],
    [data.scenarios.length + data.scenarioMatrix.length, 'Scenarios'],
    [data.projects.length, 'Projects'],
    [data.phases.length, 'Question papers · 40 marks'],
  ] as const).filter(([n]) => n > 0)
  const papers = data.phases.map((p) => ({ p, paper: buildPaper(p, tests[p.id]) }))

  useEffect(() => {
    const root = document.documentElement
    const wasDark = root.classList.contains('dark')
    root.classList.remove('dark')
    root.classList.add('print-open')
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', esc)
    return () => {
      window.removeEventListener('keydown', esc)
      root.classList.remove('print-open')
      if (wasDark) root.classList.add('dark')
    }
  }, [onClose])

  const parts = [
    `${data.phases.length} ${unit.toLowerCase()}s`,
    data.questions.length ? `${data.questions.length} problems` : '',
    data.antiPatterns.length ? `${data.antiPatterns.length + data.antiMatrix.length} anti-patterns` : '',
    data.scenarios.length ? `${data.scenarios.length + data.scenarioMatrix.length} scenarios` : '',
    data.projects.length ? `${data.projects.length} projects` : '',
  ].filter(Boolean)

  return createPortal(
    <div className="print-doc fixed inset-0 z-[200] overflow-auto bg-slate-100 text-slate-900">
      <div className="no-print sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-slate-300 bg-white px-5 py-3 font-sans text-sm">
        <span><b>Print {meta.name} course</b> · A4 · all content with answers ({parts.join(', ')})</span>
        <span className="flex gap-2">
          <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-md bg-sky-600 px-4 py-2 font-medium text-white hover:bg-sky-700"><Printer size={16} aria-hidden /> Print / Save as PDF</button>
          <button type="button" onClick={onClose} className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-4 py-2 hover:bg-slate-100"><X size={16} aria-hidden /> Close</button>
        </span>
      </div>

      <section className="print-cover mx-auto my-4 w-[210mm] max-w-full" style={{ background: 'linear-gradient(160deg,#0b1220 0%,#111c33 60%,#0b1220 100%)', color: '#e2e8f0' }}>
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

      <article className="print-page mx-auto my-4 max-w-[210mm] bg-white p-[14mm] font-serif text-[12px] leading-relaxed shadow">
        <header className="avoid-break pb-2">
          <nav aria-label="Index" className="mx-auto max-w-[150mm] text-left font-sans text-[12px]">
            <h2 className="mb-2 border-b-2 border-slate-800 pb-1 text-lg font-bold">Index</h2>
            <ol className="space-y-0.5">
              {data.phases.map((p) => <li key={p.id}><a href={`#m-${p.id}`} className="hover:underline">{unit} {p.id}: {p.title}</a></li>)}
              {data.questions.length > 0 && <li><a href="#sec-questions">Question bank · solutions</a></li>}
              {data.antiPatterns.length > 0 && <li><a href="#sec-anti">Code review anti-patterns</a></li>}
              {data.scenarios.length > 0 && <li><a href="#sec-scen">Production scenarios · answers</a></li>}
              {data.projects.length > 0 && <li><a href="#sec-proj">Projects to build</a></li>}
              <li><a href="#sec-papers">Question papers ({papers.length} × 40 marks, one per {unit.toLowerCase()})</a></li>
              <li><a href="#sec-key">Answer key to the question papers</a></li>
            </ol>
          </nav>
        </header>

        {data.phases.map((p) => (
          <section key={p.id}>
            <H2 id={`m-${p.id}`}>{unit} {p.id}: {p.title}</H2>
            {p.sections.map((s) => (
              <div key={s.id}>
                <H3>{s.title}</H3>
                <Markdown md={s.md} />
              </div>
            ))}
            {tests[p.id] && (
              <div className="mt-6 border-t border-slate-300 pt-2">
                <H3>{unit} {p.id} test · answers</H3>
                <ol className="list-decimal space-y-4 pl-5">
                  {tests[p.id].map((t, i) => (
                    <li key={i} className="avoid-break">
                      <p className="font-sans font-semibold">{t.q}</p>
                      {t.type === 'mcq' ? (
                        <ul className="mt-1 space-y-0.5 font-sans">
                          {t.opts.map((o, k) => (
                            <li key={k} className={k === t.answer ? 'font-bold text-emerald-700' : ''}>{k === t.answer ? '✔' : '○'} {o}</li>
                          ))}
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
            )}
          </section>
        ))}

        {data.questions.length > 0 && (
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
        )}

        {data.antiPatterns.length > 0 && (
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
        )}

        {data.scenarios.length > 0 && (
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
        )}

        {data.projects.length > 0 && (
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
        )}

        <section>
          <H2 id="sec-papers">Question papers</H2>
          <p className="font-sans text-slate-600">One paper per {unit.toLowerCase()}, 40 marks each. Answers are at the end of this document.</p>
          {papers.map(({ p, paper }) => (
            <div key={p.id} className="paper">
              <h3 className="mb-1 mt-0 font-sans text-lg font-bold">{meta.name} · {unit} {p.id}: {p.title}</h3>
              <p className="mb-3 border-b border-slate-400 pb-2 font-sans text-[11px]">Maximum marks: <b>{paper.total}</b> · Attempt all questions · Marks are shown in brackets.</p>
              {paper.a.length > 0 && <p className="mt-2 font-sans text-sm font-bold">Section A · one mark each ({paper.a.length})</p>}
              <ol className="list-decimal space-y-3 pl-5">
                {paper.a.map((t, i) => (
                  <li key={i} className="avoid-break">
                    <p className="font-sans font-semibold">{t.q} <span className="font-normal text-slate-500">[1]</span></p>
                    {t.type === 'mcq'
                      ? <ul className="mt-1 font-sans">{t.opts.map((o, k) => <li key={k}>({'abcd'[k]}) {o}</li>)}</ul>
                      : <CodeBlock code={t.code} lang={t.lang} />}
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
          <p className="mt-8 border-t border-slate-300 pt-3 text-center font-sans text-[11px] text-slate-500">
            Created by VivekG · <a href="https://vivek-gupta-dev.vercel.app" target="_blank" rel="noopener noreferrer" className="underline">vivek-gupta-dev.vercel.app</a>
          </p>
        </section>
      </article>
    </div>,
    document.body,
  )
}
