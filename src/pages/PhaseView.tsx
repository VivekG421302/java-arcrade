import { Check, Lock } from 'lucide-react'
import { useEffect } from 'react'
import { Link, Navigate, useLocation, useParams } from 'react-router-dom'
import { PHASES } from '../lib/content'
import { useProgress } from '../hooks/useProgress'
import { Markdown } from '../components/content'
import { PhaseBadge, ProgressBar } from '../components/ui'

export default function PhaseView() {
  const { id } = useParams()
  const { hash } = useLocation()
  const { statusOf, row, readPct, isRead, toggleRead } = useProgress()
  const phase = PHASES.find((p) => p.id === Number(id))
  useEffect(() => { if (hash) setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView(), 50) }, [hash, id])
  if (!phase) return <Navigate to="/" replace />
  const st = statusOf(phase.id)
  if (st === 'locked')
    return (
      <div className="py-16 text-center">
        <Lock size={48} aria-hidden className="mx-auto text-slate-400" />
        <h1 className="mt-4 text-2xl font-bold">Phase {phase.id} is locked</h1>
        <p className="mt-2 text-slate-500">Pass the Phase {phase.id - 1} test with 80% or higher to unlock it.</p>
        <Link to={`/phase/${phase.id - 1}`} className="mt-6 inline-flex min-h-[44px] items-center rounded-md bg-sky-600 px-5 font-medium text-white">Go to Phase {phase.id - 1}</Link>
      </div>
    )
  const pct = readPct(phase)
  const score = row(phase.id)?.test_score
  return (
    <article>
      <header className="mb-8">
        <PhaseBadge status={st} score={score != null ? Math.round(score) : null} />
        <h1 className="mt-3 text-3xl font-bold tracking-tight">Phase {phase.id}: {phase.title}</h1>
        <div className="mt-4"><ProgressBar pct={pct} label="Sections read" /><p className="mt-1 text-xs text-slate-500">{pct}% of sections read</p></div>
      </header>
      {phase.sections.map((s) => (
        <section key={s.id} id={s.id} className="scroll-mt-20 border-t border-slate-200 py-6 first:border-0 dark:border-white/10">
          <h2 className="text-2xl font-semibold">{s.title}</h2>
          <Markdown md={s.md} />
          <button type="button" aria-pressed={isRead(s.id)} onClick={() => toggleRead(s.id)}
            className={`mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-md border px-4 text-sm ${isRead(s.id) ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500' : 'border-slate-400'}`}>
            {isRead(s.id) ? <><Check size={16} aria-hidden /> Marked as read</> : 'Mark as read'}
          </button>
        </section>
      ))}
      <footer className="mt-10 rounded-xl border border-sky-500/40 bg-sky-500/5 p-6">
        <h2 className="text-lg font-semibold">Phase {phase.id} test</h2>
        <p className="mt-1 text-sm text-slate-500">5 questions · 80% to pass · 3 attempts per session, then a 24-hour lock.</p>
        <Link to={`/phase/${phase.id}/test`} className="mt-4 inline-flex min-h-[44px] items-center rounded-md bg-sky-600 px-5 font-medium text-white">{st === 'completed' ? 'Retake test' : 'Take the test'}</Link>
      </footer>
    </article>
  )
}
