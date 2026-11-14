import { Printer, X } from 'lucide-react'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useCourse } from '../hooks/useCourse'
import { testsFor } from '../lib/tests'
import { CodeBlock, Inline, Markdown } from './content'

const H2 = ({ children }: { children: React.ReactNode }) => <h2 className="pb mb-3 mt-0 border-b-2 border-slate-800 pb-1 font-sans text-xl font-bold">{children}</h2>
const H3 = ({ children }: { children: React.ReactNode }) => <h3 className="mb-2 mt-6 font-sans text-base font-bold">{children}</h3>
const Lbl = ({ children }: { children: React.ReactNode }) => <p className="mb-1 mt-3 font-sans text-[11px] font-bold uppercase tracking-wide text-slate-500">{children}</p>

/** Whole course as one A4 document: roadmap, module tests, question bank, anti-patterns, scenarios, projects, with every answer. Rendered in light mode; the browser's print dialog does the rest. */
export default function PrintCourse({ onClose }: { onClose: () => void }) {
  const { course, data, meta } = useCourse()
  const tests = testsFor(course)
  const unit = meta.unit

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

      <article className="print-page mx-auto my-4 max-w-[210mm] bg-white p-[14mm] font-serif text-[12px] leading-relaxed shadow">
        <header className="avoid-break pb-6 pt-10 text-center">
          <p className="font-sans text-xs font-semibold uppercase tracking-widest text-slate-500">{meta.name}</p>
          <h1 className="mt-2 font-sans text-3xl font-extrabold">{meta.title}</h1>
          <p className="mx-auto mt-3 max-w-[140mm] text-slate-600">{meta.tagline}</p>
          <p className="mt-4 font-sans text-xs text-slate-500">{parts.join(' · ')}</p>
          <ol className="mx-auto mt-6 max-w-[150mm] columns-1 text-left font-sans text-[12px]">
            {data.phases.map((p) => <li key={p.id} className="py-0.5">{unit} {p.id}: {p.title}</li>)}
          </ol>
        </header>

        {data.phases.map((p) => (
          <section key={p.id}>
            <H2>{unit} {p.id}: {p.title}</H2>
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
            <H2>Question bank · solutions</H2>
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
            <H2>Code review anti-patterns</H2>
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
            <H2>Production scenarios · answers</H2>
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
            <H2>Projects to build</H2>
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

        <footer className="mt-8 border-t border-slate-300 pt-3 text-center font-sans text-[10px] text-slate-500">Created by VivekG · vivek-gupta-dev.vercel.app</footer>
      </article>
    </div>,
    document.body,
  )
}
