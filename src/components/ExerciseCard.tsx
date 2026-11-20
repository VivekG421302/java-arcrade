import { CircleCheck, Code2, Play } from 'lucide-react'
import { useIde } from '../hooks/useIde'
import { useExercises } from '../hooks/useExercises'
import type { Exercise } from '../lib/exercises'
import { CodeBlock, Markdown } from './content'

const LEVEL: Record<string, string> = {
  Easy: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  Medium: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  Hard: 'bg-rose-500/15 text-rose-700 dark:text-rose-400',
}

/** A hands-on problem between two sections: read the task here, write the code in the IDE, and a run that prints every expected value marks it done. */
export default function ExerciseCard({ ex }: { ex: Exercise }) {
  const { openExercise, open, exId } = useIde()
  const { isDone } = useExercises()
  const done = isDone(ex.id)
  const active = open && exId === ex.id
  return (
    <aside aria-label={`Exercise: ${ex.title}`} className={`my-8 rounded-2xl border-l-4 bg-white p-5 shadow-lg ring-1 ring-slate-200 dark:bg-[#1e222a] dark:ring-white/10 ${done ? 'border-l-emerald-500' : 'border-l-sky-500'}`}>
      <div className="flex flex-wrap items-center gap-2 font-sans text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        <Code2 size={15} aria-hidden className="text-sky-600 dark:text-sky-400" /> Try it in the IDE
        <span className={`rounded-full px-2 py-0.5 normal-case tracking-normal ${LEVEL[ex.level] ?? LEVEL.Medium}`}>{ex.level}</span>
        {done && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 normal-case tracking-normal text-emerald-700 dark:text-emerald-400"><CircleCheck size={13} aria-hidden /> Done</span>}
      </div>
      <h3 className="mt-2 text-xl font-semibold">{ex.title}</h3>
      <Markdown md={ex.task} />
      <p className="mt-4 font-sans text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Expected output</p>
      <CodeBlock code={ex.expect.map((a) => a[0]).join('\n')} lang="text" />
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => openExercise(ex.id)}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-sky-600 px-5 font-sans font-medium text-white hover:bg-sky-500">
          <Play size={16} aria-hidden /> {active ? 'Open the editor again' : done ? 'Practise again in the IDE' : 'Open in the IDE'}
        </button>
        <span className="font-sans text-xs text-slate-500 dark:text-slate-400">Press Run; when every expected line prints, it is marked done.</span>
      </div>
      {ex.hint && (
        <details className="mt-4 font-sans">
          <summary className="cursor-pointer select-none py-1 text-sm font-medium text-sky-700 dark:text-sky-400">Hint</summary>
          <Markdown md={ex.hint} />
        </details>
      )}
      <details className="mt-1 font-sans">
        <summary className="cursor-pointer select-none py-1 text-sm font-medium text-slate-600 dark:text-slate-300">Show a solution (try first!)</summary>
        <CodeBlock code={ex.solution} lang="java" />
      </details>
    </aside>
  )
}
