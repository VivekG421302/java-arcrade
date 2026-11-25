import { CheckCircle2, Circle, Lock, Play } from 'lucide-react'
import { useTracker } from '../runtime'

const pill = 'inline-flex min-h-[40px] items-center gap-1.5 rounded-lg px-3 text-sm font-medium'

/** Lists the six labs in order. Lab N opens when lab N-1 is done; the active step itself is driven from the playground's step bar. */
export default function LabPanel() {
  const t = useTracker()
  return (
    <section aria-labelledby="labs-h" className="mt-10">
      <h2 id="labs-h" className="text-xl font-bold">Hands-on labs</h2>
      <p className="mt-1 text-slate-600 dark:text-slate-400">Do them in order. Each step is checked automatically as you work in the practice server.</p>
      <ol className="mt-4 space-y-3">
        {t.stage.labs.map((lab) => {
          const done = t.labDone(lab.id), open = t.labUnlocked(lab.id)
          const focused = t.p.focus?.kind === 'lab' && t.p.focus.id === lab.id
          const idx = t.p.labs[lab.id]?.step ?? 0
          return (
            <li key={lab.id} className={`rounded-xl p-4 ring-1 ${focused ? 'ring-2 ring-sky-500' : 'ring-slate-200 dark:ring-white/10'} ${open ? 'bg-white dark:bg-white/[0.03]' : 'bg-slate-50 opacity-70 dark:bg-white/[0.02]'}`}>
              <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="flex items-center gap-2 font-semibold">{done ? <CheckCircle2 size={18} aria-hidden className="text-emerald-500" /> : open ? <Circle size={18} aria-hidden className="text-slate-400" /> : <Lock size={16} aria-hidden className="text-slate-400" />}{lab.title}</h3>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{lab.objective} About {lab.estimatedMinutes} minutes.</p>
                </div>
                <button type="button" disabled={!open} onClick={() => t.focus({ kind: 'lab', id: lab.id })} className={`${pill} ${open ? 'bg-sky-600 text-white hover:bg-sky-500' : 'bg-slate-200 text-slate-500 dark:bg-white/10'}`}>
                  {open ? <><Play size={14} aria-hidden />{done ? 'Review' : idx > 0 ? 'Continue' : 'Start'}</> : 'Finish the previous lab'}
                </button>
              </div>
              {(focused || done) && open && (
                <ol className="mt-3 space-y-2 border-t border-slate-200 pt-3 text-sm dark:border-white/10">
                  {lab.steps.map((s, i) => {
                    const stepDone = done || i < idx, now = focused && !done && i === idx
                    return (
                      <li key={i} className={`flex gap-2 ${stepDone ? 'text-slate-500 dark:text-slate-400' : ''} ${now ? 'font-medium' : ''}`} aria-current={now ? 'step' : undefined}>
                        {stepDone ? <CheckCircle2 size={16} aria-hidden className="mt-0.5 shrink-0 text-emerald-500" /> : <Circle size={16} aria-hidden className={`mt-0.5 shrink-0 ${now ? 'text-sky-500' : 'text-slate-300'}`} />}
                        <span>{s.instruction}{(stepDone || now) && s.expectedOutput && <span className="mt-0.5 block text-xs font-normal text-slate-500 dark:text-slate-400">You should see: {s.expectedOutput}</span>}</span>
                      </li>
                    )
                  })}
                </ol>
              )}
            </li>
          )
        })}
      </ol>
    </section>
  )
}
