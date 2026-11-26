import { useEffect, useState } from 'react'
import { CheckCircle2, CircleAlert, Clipboard, Lightbulb, Terminal as TermIcon } from 'lucide-react'
import { useSim, useTracker } from '../runtime'

const phaseName = { lab: '', diagnose: 'Diagnose', fix: 'Fix' } as const

/** The always-visible "what do I do now" strip at the top of the playground, so lesson and terminal are never far apart. */
export default function StepBar() {
  const tracker = useTracker()
  const sim = useSim()
  const cur = tracker.current()
  const fb = tracker.feedback
  const [revealed, setRevealed] = useState('')
  const [fbVisible, setFbVisible] = useState(true)
  const [copied, setCopied] = useState('')
  useEffect(() => { setFbVisible(true); const t = setTimeout(() => setFbVisible(false), 9000); return () => clearTimeout(t) }, [fb?.at])
  const key = cur ? `${cur.ref.id}#${cur.index}` : ''
  const FbIcon = fb?.kind === 'fail' ? CircleAlert : CheckCircle2

  return (
    <div className="shrink-0 border-b border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-white/10 dark:bg-[#1c1f26]">
      {cur ? (
        <>
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-semibold">{cur.title}</span>
            {cur.phase !== 'lab' && <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cur.phase === 'diagnose' ? 'bg-amber-100 text-amber-900 dark:bg-amber-400/15 dark:text-amber-200' : 'bg-emerald-100 text-emerald-900 dark:bg-emerald-400/15 dark:text-emerald-200'}`}>{phaseName[cur.phase]}</span>}
            <span className="text-slate-500 dark:text-slate-400">step {cur.index + 1} of {cur.total}</span>
          </div>
          <p className="mt-1 text-[15px] leading-snug">{cur.step.instruction}</p>
          {cur.step.snippet && (
            <div className="mt-2 rounded-md bg-slate-900 text-slate-100 ring-1 ring-white/10">
              <div className="flex items-center justify-between gap-2 px-2 py-1 text-xs text-slate-300">
                <span className="truncate font-mono">{cur.step.snippet.title}</span>
                <button type="button" onClick={() => { void navigator.clipboard?.writeText(cur.step.snippet!.text); setCopied(key) }} className="inline-flex min-h-[32px] items-center gap-1 rounded px-2 font-medium hover:bg-white/10"><Clipboard size={13} aria-hidden />{copied === key ? 'Copied' : 'Copy'}</button>
              </div>
              <pre className="max-h-40 overflow-auto px-2 pb-2 font-mono text-[11.5px] leading-snug">{cur.step.snippet.text}</pre>
            </div>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {!cur.hintOpen && <button type="button" onClick={() => tracker.askHint()} className="inline-flex min-h-[36px] items-center gap-1.5 rounded-md bg-slate-100 px-3 font-medium hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15"><Lightbulb size={14} aria-hidden />Hint</button>}
            {cur.hintOpen && cur.step.command && revealed !== key && <button type="button" onClick={() => setRevealed(key)} className="inline-flex min-h-[36px] items-center rounded-md bg-slate-100 px-3 font-medium hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15">Show the command</button>}
            {revealed === key && cur.step.command && (
              <button type="button" onClick={() => sim.setDraft(cur.step.command!)} className="inline-flex min-h-[36px] items-center gap-1.5 rounded-md bg-sky-600 px-3 font-medium text-white hover:bg-sky-500"><TermIcon size={14} aria-hidden />Type it for me</button>
            )}
          </div>
          {cur.hintOpen && cur.step.hintText && <p className="mt-2 rounded-md bg-amber-50 p-2 text-[13px] leading-snug text-amber-950 dark:bg-amber-300/10 dark:text-amber-100">{cur.step.hintText}</p>}
          {revealed === key && cur.step.command && <pre className="mt-2 overflow-x-auto rounded-md bg-slate-900 p-2 font-mono text-xs text-slate-100">{cur.step.command}</pre>}
        </>
      ) : (
        <p className="text-[15px]">{tracker.isComplete() ? 'Stage complete. Review anything below, or head back to the course map.' : 'Pick a lab or chaos lab below to get your next step here.'}</p>
      )}
      <div role="status" aria-live="polite">
        {fb && fbVisible && (
          <p className={`mt-2 flex items-start gap-1.5 rounded-md p-2 text-[13px] leading-snug ${fb.kind === 'fail' ? 'bg-rose-50 text-rose-900 dark:bg-rose-400/10 dark:text-rose-200' : 'bg-emerald-50 text-emerald-900 dark:bg-emerald-400/10 dark:text-emerald-200'}`}>
            <FbIcon size={15} aria-hidden className="mt-0.5 shrink-0" />{fb.text}
          </p>
        )}
      </div>
    </div>
  )
}
