import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, Circle, Lock } from 'lucide-react'
import { STAGE_CATALOG } from '../data/catalog'
import { STAGES, useTracker } from '../runtime'

/** The unlock gate (spec 4.4.5): a visible checklist plus the quiz. Stage 2 opens only when every line is ticked. */
export default function GatePanel() {
  const t = useTracker()
  const g = t.stage.unlockGate
  const items = t.gateItems()
  const quizOpen = t.quizUnlocked()
  const [answers, setAnswers] = useState<number[]>([])
  const [result, setResult] = useState<{ score: number; correct: number; passed: boolean } | null>(null)
  const complete = t.isComplete()
  return (
    <section aria-labelledby="gate-h" className="mt-10">
      <h2 id="gate-h" className="flex items-center gap-2 text-xl font-bold">{complete ? <CheckCircle2 size={20} aria-hidden className="text-emerald-500" /> : <Lock size={18} aria-hidden className="text-slate-400" />}Unlock Stage {t.stage.number + 1}</h2>
      <p className="mt-1 text-slate-600 dark:text-slate-400">{g.description}</p>
      <ul className="mt-3 space-y-1.5 text-sm">
        {items.map((i) => <li key={i.id} className="flex items-start gap-2">{i.done ? <CheckCircle2 size={16} aria-hidden className="mt-0.5 shrink-0 text-emerald-500" /> : <Circle size={16} aria-hidden className="mt-0.5 shrink-0 text-slate-300" />}<span className={i.done ? 'text-slate-500 dark:text-slate-400' : ''}>{i.label}</span></li>)}
      </ul>

      <div className="mt-5 rounded-xl p-4 ring-1 ring-slate-200 dark:ring-white/10">
        <h3 className="font-semibold">{g.quiz.title}</h3>
        {!quizOpen && !t.p.quiz.passed ? <p className="mt-1 text-sm text-slate-500">The quiz opens after all {t.stage.labs.length} labs and {g.requiredChaosIds.map((id) => 'Chaos ' + id.replace(/^chaos-/, '').replace('-', '.')).join(', ')}.</p> : (
          <form className="mt-3 space-y-5" onSubmit={(e) => { e.preventDefault(); setResult(t.submitQuiz(answers)) }}>
            {g.quiz.questions.map((q, qi) => (
              <fieldset key={q.id}>
                <legend className="font-medium">{qi + 1}. {q.prompt}</legend>
                <div className="mt-2 space-y-1">
                  {q.options.map((o, oi) => (
                    <label key={oi} className="flex min-h-[44px] cursor-pointer items-center gap-2 rounded-lg px-2 hover:bg-slate-100 dark:hover:bg-white/5">
                      <input type="radio" name={q.id} checked={answers[qi] === oi} onChange={() => { const a = [...answers]; a[qi] = oi; setAnswers(a); setResult(null) }} className="h-4 w-4 accent-sky-600" />{o}
                    </label>
                  ))}
                </div>
                {result && <p className={`mt-1 text-sm ${answers[qi] === q.answerIndex ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>{answers[qi] === q.answerIndex ? 'Correct. ' : 'Not quite. '}{q.explanation}</p>}
              </fieldset>
            ))}
            <div className="flex flex-wrap items-center gap-3">
              <button type="submit" disabled={answers.filter((a) => a !== undefined).length < g.quiz.questions.length} className="min-h-[44px] rounded-lg bg-sky-600 px-4 font-medium text-white hover:bg-sky-500 disabled:opacity-40">Check my answers</button>
              {result && <span role="status" className="text-sm font-medium">{result.correct} of {g.quiz.questions.length} correct. {result.passed ? 'Passed.' : `You need ${Math.round(g.quiz.passMark * 100)}%: read the notes above and try again.`}</span>}
              {!result && t.p.quiz.passed && <span className="text-sm text-emerald-700 dark:text-emerald-300">Passed already (best {Math.round(t.p.quiz.best * 100)}%).</span>}
            </div>
          </form>
        )}
      </div>

      {complete && (() => {
        const next = STAGE_CATALOG[t.stage.number]
        const live = !!STAGES[t.stage.number + 1]
        return (
          <div className="mt-5 rounded-xl bg-emerald-50 p-4 text-emerald-950 dark:bg-emerald-400/10 dark:text-emerald-100">
            <p className="font-semibold">Stage {t.stage.number} complete. {next ? `Stage ${next.number} is unlocked.` : 'You reached the summit.'}</p>
            <p className="mt-1 text-sm">{next ? `The pain you now feel: ${STAGE_CATALOG[t.stage.number - 1].pain} Stage ${next.number} (${next.title}) fixes it.${live ? '' : ' Its lessons arrive in a later phase of this module.'}` : 'Every stage is done.'}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {live && <Link to={`/devops/stage/${t.stage.number + 1}`} className="inline-flex min-h-[44px] items-center rounded-lg bg-emerald-700 px-4 font-medium text-white hover:bg-emerald-600">Open Stage {t.stage.number + 1}</Link>}
              <Link to="/devops" className="inline-flex min-h-[44px] items-center rounded-lg bg-white px-4 font-medium text-emerald-900 ring-1 ring-emerald-300 hover:bg-emerald-100 dark:bg-white/10 dark:text-emerald-100 dark:ring-white/20">Back to the course map</Link>
            </div>
          </div>
        )
      })()}
    </section>
  )
}
