import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { PASS_THRESHOLD, PHASES } from '../lib/content'
import { TESTS, type TestQ } from '../lib/tests'
import { useProgress, MAX_ATTEMPTS } from '../hooks/useProgress'
import { CodeBlock } from './content'

type Ans = number | string | undefined
const grade = (q: TestQ, a: Ans) =>
  q.type === 'mcq' ? a === q.answer : typeof a === 'string' && q.accept.some((k) => a.toLowerCase().replace(/[^a-z]/g, '').includes(k))

function Confetti() {
  const bits = useMemo(() => Array.from({ length: 36 }, (_, i) => ({ i, x: Math.random() * 100, r: Math.random() * 720, d: 1.5 + Math.random() * 1.5, c: ['#38bdf8', '#34d399', '#fbbf24', '#f472b6'][i % 4] })), [])
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {bits.map((b) => (
        <motion.span key={b.i} className="absolute top-0 h-3 w-2 rounded-sm" style={{ left: `${b.x}%`, background: b.c }}
          initial={{ y: -20, opacity: 1, rotate: 0 }} animate={{ y: '105vh', opacity: 0.9, rotate: b.r }} transition={{ duration: b.d, ease: 'easeIn' }} />
      ))}
    </div>
  )
}

export default function TestRunner({ phaseId }: { phaseId: number }) {
  const qs = TESTS[phaseId]
  const { submit, attemptsLeft, lockedUntil } = useProgress()
  const [idx, setIdx] = useState(0)
  const [ans, setAns] = useState<Ans[]>(Array(qs.length).fill(undefined))
  const [result, setResult] = useState<{ score: number; passed: boolean } | null>(null)
  const [busy, setBusy] = useState(false)
  const nextPhase = PHASES.find((p) => p.id === phaseId + 1)
  const left = attemptsLeft(phaseId)
  const until = lockedUntil(phaseId)

  if (until && !result)
    return <p role="alert" className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-5">Too many failed attempts. This test unlocks again at {new Date(until).toLocaleString()}. Review the phase material and come back.</p>

  if (result) {
    const pct = Math.round(result.score * 100)
    return (
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}>
        {result.passed && <Confetti />}
        <div className={`rounded-xl border p-6 text-center ${result.passed ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-amber-500/40 bg-amber-500/10'}`}>
          <p className="text-5xl font-bold">{pct}%</p>
          <p className="mt-2 text-lg">{result.passed ? (nextPhase ? `Passed! Phase ${nextPhase.id} is unlocked.` : 'Passed! You have completed the roadmap.') : `Not quite — you need ${PASS_THRESHOLD * 100}% to pass. Review the explanations below and try again.`}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            {result.passed ? (
              <Link to={nextPhase ? `/phase/${nextPhase.id}` : '/'} className="min-h-[44px] rounded-md bg-emerald-600 px-5 py-3 font-medium text-white">{nextPhase ? `Continue to Phase ${nextPhase.id}` : 'Back to roadmap'}</Link>
            ) : (
              <>
                <Link to={`/phase/${phaseId}`} className="min-h-[44px] rounded-md border border-slate-400 px-5 py-3">Review material</Link>
                {left > 0 ? (
                  <button className="min-h-[44px] rounded-md bg-sky-600 px-5 py-3 font-medium text-white" onClick={() => { setResult(null); setIdx(0); setAns(Array(qs.length).fill(undefined)) }}>Retry ({left} left this session)</button>
                ) : (
                  <span className="px-2 py-3 text-sm">No attempts left — locked for 24 hours.</span>
                )}
              </>
            )}
          </div>
        </div>
        <ol className="mt-6 space-y-4">
          {qs.map((q, i) => {
            const ok = grade(q, ans[i])
            return (
              <li key={i} className="rounded-lg border border-slate-200 p-4 dark:border-white/10">
                <p className="font-sans font-semibold">{ok ? '✅' : '❌'} {i + 1}. {q.q}</p>
                {q.type === 'code' && <CodeBlock code={q.code} lang={q.lang} />}
                <p className="mt-1 text-sm">Your answer: <span className="font-mono">{q.type === 'mcq' ? (ans[i] === undefined ? '—' : q.opts[ans[i] as number]) : String(ans[i] || '—')}</span></p>
                {!ok && <p className="text-sm text-emerald-500">Correct: {q.type === 'mcq' ? q.opts[q.answer] : q.accept.slice(0, 3).join(' / ')}</p>}
                <p className="mt-2 font-serif text-sm leading-6">{q.why}</p>
              </li>
            )
          })}
        </ol>
      </motion.div>
    )
  }

  const q = qs[idx]
  const last = idx === qs.length - 1
  const setA = (v: Ans) => setAns(ans.map((x, i) => (i === idx ? v : x)))
  const finish = async () => {
    setBusy(true)
    const score = qs.filter((x, i) => grade(x, ans[i])).length / qs.length
    const passed = await submit(phaseId, ans, score)
    setResult({ score, passed })
    setBusy(false)
  }
  return (
    <div>
      <div className="mb-4 flex items-center justify-between font-sans text-sm text-slate-500">
        <span>Question {idx + 1} of {qs.length}</span>
        <span>{left} of {MAX_ATTEMPTS} attempts left this session</span>
      </div>
      <motion.div key={idx} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}>
        <h2 className="mb-3 font-sans text-xl font-semibold">{q.q}</h2>
        {q.type === 'mcq' ? (
          <fieldset className="space-y-2">
            <legend className="sr-only">Choose one answer</legend>
            {q.opts.map((o, i) => (
              <label key={i} className={`flex min-h-[44px] cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 ${ans[idx] === i ? 'border-sky-500 bg-sky-500/10' : 'border-slate-300 hover:bg-slate-100 dark:border-white/15 dark:hover:bg-white/5'}`}>
                <input type="radio" name={`q${idx}`} checked={ans[idx] === i} onChange={() => setA(i)} className="h-4 w-4 accent-sky-500" />
                <span className="font-serif">{o}</span>
              </label>
            ))}
          </fieldset>
        ) : (
          <>
            <CodeBlock code={q.code} lang={q.lang} />
            <label className="sr-only" htmlFor="code-answer">Your answer</label>
            <textarea id="code-answer" rows={3} spellCheck={false} value={typeof ans[idx] === 'string' ? (ans[idx] as string) : ''} onChange={(e) => setA(e.target.value)}
              placeholder="Type your answer…" className="w-full rounded-lg border border-slate-300 bg-[#1e1e1e] p-3 font-mono text-sm text-slate-200 dark:border-white/15" />
          </>
        )}
      </motion.div>
      <div className="mt-6 flex justify-between">
        <button disabled={idx === 0} onClick={() => setIdx(idx - 1)} className="min-h-[44px] rounded-md border border-slate-400 px-5 disabled:opacity-40">Back</button>
        {last ? (
          <button disabled={busy} onClick={finish} className="min-h-[44px] rounded-md bg-emerald-600 px-6 font-medium text-white disabled:opacity-50">Submit test</button>
        ) : (
          <button onClick={() => setIdx(idx + 1)} className="min-h-[44px] rounded-md bg-sky-600 px-6 font-medium text-white">Next</button>
        )}
      </div>
    </div>
  )
}
