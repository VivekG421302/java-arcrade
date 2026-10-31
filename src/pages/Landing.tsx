import { Link } from 'react-router-dom'
import { content, PHASES } from '../lib/content'
import { useAuth } from '../hooks/useAuth'
import { useProgress } from '../hooks/useProgress'
import { PhaseBadge, ProgressBar } from '../components/ui'

export default function Landing() {
  const { statusOf, row, readPct } = useProgress()
  const { enabled } = useAuth()
  const parts = [
    ['/questions', 'Question Bank', `${content.questions.length} LeetCode problems with Java-mapped complexity targets`],
    ['/anti-patterns', 'Code Review Anti-Patterns', `${content.antiPatterns.length + content.antiMatrix.length} bug-prone snippets and fixes`],
    ['/scenarios', 'Production Scenarios', `${content.scenarios.length + content.scenarioMatrix.length} on-call incidents with triage steps`],
  ]
  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">Java Developer Mastery Roadmap</h1>
      <p className="mt-2 max-w-[65ch] font-serif text-lg text-slate-600 dark:text-slate-400">Six phases, each gated by a test. Score 80% or higher to unlock the next one.</p>
      {!enabled && <p className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">Guest mode: progress is saved in this browser only. Add Supabase env vars to enable sign-in and sync.</p>}
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {PHASES.map((p) => {
          const st = statusOf(p.id)
          const body = (
            <>
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-semibold">Phase {p.id}: {p.title}</h2>
              </div>
              <div className="mt-2"><PhaseBadge status={st} score={row(p.id)?.test_score != null ? Math.round(row(p.id)!.test_score!) : null} /></div>
              <p className="mt-3 text-sm text-slate-500">{p.sections.length} sections</p>
              {st === 'in_progress' && <div className="mt-3"><ProgressBar pct={readPct(p)} label={`Phase ${p.id} read progress`} /></div>}
            </>
          )
          return st === 'locked' ? (
            <div key={p.id} title={`Complete Phase ${p.id - 1} test to unlock`} className="rounded-xl border border-slate-200 p-5 opacity-50 dark:border-white/10">{body}</div>
          ) : (
            <Link key={p.id} to={`/phase/${p.id}`} className={`rounded-xl border p-5 transition hover:-translate-y-0.5 hover:shadow-lg ${st === 'completed' ? 'border-emerald-500/50' : 'border-sky-500/50'}`}>{body}</Link>
          )
        })}
      </div>
      <h2 className="mb-3 mt-10 text-xl font-semibold">Practice material</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        {parts.map(([to, t, d]) => (
          <Link key={to} to={to} className="rounded-xl border border-slate-200 p-4 hover:border-sky-500 dark:border-white/10">
            <h3 className="font-semibold">{t}</h3><p className="mt-1 text-sm text-slate-500">{d}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
