import { Link } from 'react-router-dom'
import { content, PHASES } from '../lib/content'
import { useAuth } from '../hooks/useAuth'
import { useProgress } from '../hooks/useProgress'
import { PhaseBadge, ProgressBar } from '../components/ui'

export default function Landing() {
  const { statusOf, row, readPct } = useProgress()
  const { enabled } = useAuth()
  const parts = [
    ['/questions', 'Question Bank', content.questions.length],
    ['/anti-patterns', 'Code Review Anti-Patterns', content.antiPatterns.length + content.antiMatrix.length],
    ['/scenarios', 'Production Scenarios', content.scenarios.length + content.scenarioMatrix.length],
  ] as const
  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">Java Developer Mastery Roadmap</h1>
      <p className="mt-2 font-serif text-slate-500">Six phases. Score 80% on each test to unlock the next.</p>
      {!enabled && <p className="mt-2 text-xs text-slate-400">Guest mode: progress is saved in this browser.</p>}
      <ul className="mt-8 divide-y divide-slate-200/70 dark:divide-white/10">
        {PHASES.map((p) => {
          const st = statusOf(p.id)
          const score = row(p.id)?.test_score
          const inner = (
            <>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">Phase {p.id}: {p.title}</p>
                {st === 'in_progress' && <div className="mt-2 max-w-xs"><ProgressBar pct={readPct(p)} label={`Phase ${p.id} read progress`} /></div>}
              </div>
              <PhaseBadge status={st} score={score != null ? Math.round(score) : null} />
            </>
          )
          return (
            <li key={p.id}>
              {st === 'locked' ? (
                <div title={`Complete Phase ${p.id - 1} test to unlock`} className="flex items-center gap-4 py-4 opacity-45">{inner}</div>
              ) : (
                <Link to={`/phase/${p.id}`} className="flex items-center gap-4 py-4 hover:text-sky-500">{inner}</Link>
              )}
            </li>
          )
        })}
      </ul>
      <ul className="mt-10 space-y-1">
        {parts.map(([to, t, n]) => (
          <li key={to}><Link to={to} className="flex min-h-[44px] items-baseline justify-between py-2 hover:text-sky-500"><span className="font-medium">{t}</span><span className="text-sm text-slate-400">{n}</span></Link></li>
        ))}
      </ul>
    </div>
  )
}
