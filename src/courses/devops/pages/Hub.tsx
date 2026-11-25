import { Link } from 'react-router-dom'
import { CheckCircle2, ChevronRight, Lock } from 'lucide-react'
import { STAGE_CATALOG } from '../data/catalog'
import { runtime, useTracker } from '../runtime'

export default function Hub() {
  const t = useTracker()
  const labs = t.stage.labs.filter((l) => t.labDone(l.id)).length
  const chaos = t.stage.chaosLabs.filter((c) => t.chaosDone(c.id)).length
  const s1done = t.p.stageComplete
  return (
    <main className="mx-auto max-w-3xl px-5 pb-16 pt-4 md:px-8">
      <h1 className="text-3xl font-bold tracking-tight">Full-Stack Deployment & DevOps Mastery</h1>
      <p className="mt-2 font-serif text-lg text-slate-600 dark:text-slate-400">One Spring Boot shop app, deployed eight ways. Each stage ends with a pain that the next stage fixes. No cloud account, no Docker install: the practice servers run inside this page.</p>
      <ol className="badge-box mt-8 divide-y divide-slate-200/70 dark:divide-white/10">
        {STAGE_CATALOG.map((s) => {
          const unlocked = s.number === 1 || (s.number === 2 && s1done)
          const body = (
            <>
              <div className={`min-w-0 flex-1 ${unlocked ? '' : 'opacity-60'}`}>
                <p className="font-semibold">Stage {s.number}: {s.title}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{s.era}</p>
                <p className="mt-1 text-sm">{s.idea}</p>
                {s.number === 1 && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{labs} of {t.stage.labs.length} labs, {chaos} of {t.stage.chaosLabs.length} chaos labs fixed{t.p.quiz.passed ? ', quiz passed' : ''}.</p>}
                {s.number === 2 && s1done && <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-300">Unlocked. Its lessons arrive in the next phase of this module.</p>}
              </div>
              {s.live ? (s1done ? <CheckCircle2 size={20} aria-label="Complete" className="shrink-0 text-emerald-500" /> : <ChevronRight size={18} aria-hidden className="shrink-0 text-slate-400" />) : <span className="inline-flex shrink-0 items-center gap-1 text-sm text-slate-400">{unlocked ? 'Coming soon' : <><Lock size={14} aria-hidden />Locked</>}</span>}
            </>
          )
          return (
            <li key={s.number}>
              {s.live
                ? <Link to={`/devops/stage/${s.number}`} className="flex items-center gap-4 py-4 hover:text-sky-500">{body}</Link>
                : <div className="flex items-center gap-4 py-4" data-tip={unlocked ? 'Content arrives in a later phase' : `Complete Stage ${s.number - 1} to unlock`} data-tip-start="">{body}</div>}
            </li>
          )
        })}
      </ol>
      <p className="mt-8 text-sm text-slate-500 dark:text-slate-400">Progress and the practice servers are saved in this browser only.{' '}
        <button type="button" className="text-sky-600 underline underline-offset-2 hover:text-sky-500 dark:text-sky-400" onClick={() => { if (window.confirm('Erase all DevOps lab progress and reset the practice servers?')) { runtime().tracker.resetProgress(); runtime().sim.reset() } }}>Reset DevOps progress</button>
      </p>
    </main>
  )
}
