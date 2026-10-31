import { useState } from 'react'
import { content } from '../lib/content'
import { Accordion } from '../components/ui'
import { Inline, Markdown } from '../components/content'

export default function Scenarios() {
  const [text, setText] = useState('')
  const t = text.toLowerCase()
  const full = content.scenarios.filter((s) => `${s.title} ${s.question} ${s.answer}`.toLowerCase().includes(t))
  const quick = content.scenarioMatrix.filter((s) => `${s.symptom} ${s.cause} ${s.fix}`.toLowerCase().includes(t))
  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">Production Scenarios</h1>
      <input type="search" aria-label="Search scenarios" placeholder="Search scenarios…" value={text} onChange={(e) => setText(e.target.value)} className="mt-4 min-h-[44px] w-full rounded-md border border-slate-300 bg-transparent px-3 dark:border-white/15" />
      <h2 className="mt-8 text-xl font-semibold">Detailed triage walkthroughs</h2>
      {full.map((s) => (
        <Accordion key={s.n} title={`Scenario ${s.n}: ${s.title}`}>
          <p className="font-sans font-semibold">{s.question}</p>
          <h3 className="mt-4 font-sans text-sm font-semibold uppercase tracking-wide text-slate-500">Detailed remediation & triage</h3>
          <Markdown md={s.answer} />
        </Accordion>
      ))}
      <h2 className="mt-10 text-xl font-semibold">Quick-reference matrix</h2>
      {quick.map((s) => (
        <Accordion key={s.n} title={<Inline md={`${s.n}. ${s.symptom}`} />}>
          <dl className="space-y-3 font-serif leading-7">
            <div><dt className="font-sans text-sm font-semibold text-slate-500">Root cause diagnostics</dt><dd><Inline md={s.cause} /></dd></div>
            <div><dt className="font-sans text-sm font-semibold text-slate-500">Immediate remediation</dt><dd><Inline md={s.fix} /></dd></div>
          </dl>
        </Accordion>
      ))}
    </div>
  )
}
