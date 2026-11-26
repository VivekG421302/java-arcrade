import { CheckCircle2, Circle, Flame, Lock } from 'lucide-react'
import { useTracker } from '../runtime'

/** Chaos labs: break something on purpose, then diagnose and fix it. Order follows the spec: symptom, analogy, diagnostic trail, exact fix. */
export default function ChaosPanel() {
  const t = useTracker()
  const open = t.chaosUnlocked()
  return (
    <section aria-labelledby="chaos-h" className="mt-10">
      <h2 id="chaos-h" className="text-xl font-bold">Chaos labs</h2>
      <p className="mt-1 text-slate-600 dark:text-slate-400">Real servers break. Here you break yours on purpose, then work out why. {open ? `${t.stage.unlockGate.requiredChaosIds.map((id) => 'Chaos ' + id.replace(/^chaos-/, '').replace('-', '.')).join(' and ')} ${t.stage.unlockGate.requiredChaosIds.length > 1 ? 'are' : 'is'} required to open Stage ${t.stage.number + 1}; the others are strongly recommended.` : `They open after all ${t.stage.labs.length} labs.`}</p>
      <ul className="mt-4 space-y-3">
        {t.stage.chaosLabs.map((c) => {
          const st = t.p.chaos[c.id]
          const done = !!st?.done, injected = !!st?.injected
          const focused = t.p.focus?.kind === 'chaos' && t.p.focus.id === c.id
          const idx = st?.step ?? 0
          const required = t.stage.unlockGate.requiredChaosIds.includes(c.id)
          return (
            <li key={c.id} className={`rounded-xl p-4 ring-1 ${focused ? 'ring-2 ring-rose-500' : 'ring-slate-200 dark:ring-white/10'} ${open ? 'bg-white dark:bg-white/[0.03]' : 'bg-slate-50 opacity-70 dark:bg-white/[0.02]'}`}>
              <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="flex items-center gap-2 font-semibold">{done ? <CheckCircle2 size={18} aria-hidden className="text-emerald-500" /> : open ? <Flame size={18} aria-hidden className="text-rose-500" /> : <Lock size={16} aria-hidden className="text-slate-400" />}{c.title}{required && <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-900 dark:bg-rose-400/15 dark:text-rose-200">required</span>}</h3>
                </div>
                <div className="flex gap-2">
                  {injected && !done && !focused && <button type="button" onClick={() => t.focus({ kind: 'chaos', id: c.id })} className="min-h-[40px] rounded-lg bg-slate-200 px-3 text-sm font-medium hover:bg-slate-300 dark:bg-white/10 dark:hover:bg-white/15">Continue</button>}
                  <button type="button" disabled={!open} onClick={() => t.inject(c.id)} className="min-h-[40px] rounded-lg bg-rose-600 px-3 text-sm font-medium text-white hover:bg-rose-500 disabled:bg-slate-200 disabled:text-slate-500 dark:disabled:bg-white/10">{done ? 'Break it again' : injected ? 'Restart this failure' : 'Inject this failure'}</button>
                </div>
              </div>
              {injected && (
                <div className="mt-3 space-y-3 text-sm">
                  <p className="rounded-lg bg-rose-50 p-3 text-rose-950 dark:bg-rose-400/10 dark:text-rose-100"><span className="font-semibold">What you see: </span>{c.symptom}</p>
                  <details className="rounded-lg bg-amber-50 p-3 dark:bg-amber-300/[0.07]">
                    <summary className="min-h-[32px] cursor-pointer font-medium">Imagine why this happened</summary>
                    <p className="mt-1 font-serif text-[15px] leading-relaxed">{c.imagineAnalogy}</p>
                  </details>
                  {[{ name: 'Diagnostic trail', steps: c.diagnosticTrail, from: 0 }, { name: 'The exact fix', steps: c.exactFix, from: c.diagnosticTrail.length }].map((g) => (
                    <div key={g.name}>
                      <h4 className="font-semibold">{g.name}</h4>
                      <ol className="mt-1 space-y-1.5">
                        {g.steps.map((s, i) => {
                          const n = g.from + i, stepDone = done || n < idx, now = focused && !done && n === idx
                          return (
                            <li key={n} className={`flex gap-2 ${stepDone ? 'text-slate-500 dark:text-slate-400' : ''} ${now ? 'font-medium' : ''}`} aria-current={now ? 'step' : undefined}>
                              {stepDone ? <CheckCircle2 size={16} aria-hidden className="mt-0.5 shrink-0 text-emerald-500" /> : <Circle size={16} aria-hidden className={`mt-0.5 shrink-0 ${now ? 'text-rose-500' : 'text-slate-300'}`} />}
                              <span>{s.instruction}</span>
                            </li>
                          )
                        })}
                      </ol>
                    </div>
                  ))}
                  {done && <p className="rounded-lg bg-emerald-50 p-3 text-emerald-950 dark:bg-emerald-400/10 dark:text-emerald-100"><span className="font-semibold">Lesson: </span>{c.lesson}</p>}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
